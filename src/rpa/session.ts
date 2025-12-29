/**
 * BaseBrowserSessionManager - ブラウザセッション管理の抽象基底クラス
 *
 * Mutex付きページ操作、状態管理、キープアライブの共通実装を提供
 * 各プロジェクトはこのクラスを継承し、performLogin()等を実装する
 */

import { EventEmitter } from 'events';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { Mutex } from 'async-mutex';

/**
 * セッション状態
 */
export type SessionState =
  | 'uninitialized' // 未初期化
  | 'starting' // 起動中
  | 'logging_in' // ログイン中
  | 'ready' // 処理可能
  | 'busy' // 処理中
  | 'recovering' // リカバリー中
  | 'error' // エラー状態
  | 'closed'; // 終了済み

/**
 * セッション設定
 */
export interface BaseSessionConfig {
  /** ヘッドレスモード（デフォルト: true） */
  headless?: boolean;
  /** ビューポートサイズ */
  viewport?: { width: number; height: number };
  /** セッション維持間隔（ms、デフォルト: 5分） */
  keepAliveIntervalMs?: number;
  /** ブラウザ起動オプション */
  browserArgs?: string[];
  /** ロケール（デフォルト: ja-JP） */
  locale?: string;
  /** タイムゾーン（デフォルト: Asia/Tokyo） */
  timezoneId?: string;
}

/**
 * ブラウザセッション管理の抽象基底クラス
 *
 * @example
 * ```typescript
 * class MySessionManager extends BaseBrowserSessionManager {
 *   protected async performLogin(): Promise<void> {
 *     await this.page!.goto('https://example.com/login');
 *     // ログイン処理
 *   }
 *
 *   protected async isLoggedIn(): Promise<boolean> {
 *     // ログイン状態確認
 *     return true;
 *   }
 *
 *   protected async refreshForKeepAlive(): Promise<void> {
 *     await this.page!.reload();
 *   }
 * }
 * ```
 */
export abstract class BaseBrowserSessionManager extends EventEmitter {
  protected browser: Browser | null = null;
  protected context: BrowserContext | null = null;
  protected page: Page | null = null;
  protected state: SessionState = 'uninitialized';
  protected lastActivityTime: Date = new Date();
  protected mutex = new Mutex();
  protected keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  protected config: Required<BaseSessionConfig>;

  constructor(config: BaseSessionConfig = {}) {
    super();
    this.config = {
      headless: true,
      viewport: { width: 1280, height: 720 },
      keepAliveIntervalMs: 5 * 60 * 1000, // 5分
      browserArgs: ['--no-sandbox', '--disable-setuid-sandbox'],
      locale: 'ja-JP',
      timezoneId: 'Asia/Tokyo',
      ...config,
    };
  }

  // ===== 抽象メソッド（プロジェクトで実装必須）=====

  /**
   * ログイン処理を実行
   * サービス固有のログイン手順を実装する
   */
  protected abstract performLogin(): Promise<void>;

  /**
   * ログイン状態を確認（キープアライブ用）
   * @returns ログイン済みならtrue
   */
  protected abstract isLoggedIn(): Promise<boolean>;

  /**
   * キープアライブ時のリフレッシュ処理
   * ページリロードやセッション維持に必要な操作を実装
   */
  protected abstract refreshForKeepAlive(): Promise<void>;

  // ===== 共通実装 =====

  /**
   * セッションを開始（ブラウザ起動 + ログイン）
   */
  async start(): Promise<void> {
    if (
      this.state !== 'uninitialized' &&
      this.state !== 'closed' &&
      this.state !== 'error'
    ) {
      throw new Error(`Cannot start session in state: ${this.state}`);
    }

    try {
      this.setState('starting');

      // ブラウザ起動
      this.browser = await chromium.launch({
        headless: this.config.headless,
        args: this.config.browserArgs,
      });

      // コンテキスト作成
      this.context = await this.browser.newContext({
        viewport: this.config.viewport,
        locale: this.config.locale,
        timezoneId: this.config.timezoneId,
      });

      // ページ作成
      this.page = await this.context.newPage();

      // ログイン実行
      this.setState('logging_in');
      await this.performLogin();

      // キープアライブ開始
      this.startKeepAlive();

      this.setState('ready');
      this.lastActivityTime = new Date();
    } catch (error) {
      this.setState('error');
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Mutex付きでページを使用する
   *
   * 同時に1つのリクエストのみがページを操作できる
   * 他のリクエストはMutexが解放されるまで待機する
   *
   * @param fn ページを使用する処理
   * @param timeoutMs タイムアウト時間（デフォルト: 60秒）
   */
  async withPage<T>(
    fn: (page: Page) => Promise<T>,
    timeoutMs: number = 60000
  ): Promise<T> {
    const release = await this.mutex.acquire();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    try {
      const page = await this.acquirePage();
      try {
        // タイムアウト付きで実行
        const result = await Promise.race([
          fn(page),
          new Promise<never>((_, reject) => {
            timeoutId = setTimeout(
              () => reject(new Error(`Page operation timed out after ${timeoutMs}ms`)),
              timeoutMs
            );
          }),
        ]);
        return result;
      } catch (error) {
        // ブラウザ関連のエラーならリカバリー試行
        if (this.isBrowserError(error)) {
          console.warn('[BaseBrowserSessionManager] Browser error detected, recovering...');
          await this.recoverInternal();
        }
        throw error;
      } finally {
        // タイマーをクリア（メモリリーク防止）
        if (timeoutId) clearTimeout(timeoutId);
        this.releasePage();
      }
    } finally {
      release();
    }
  }

  /**
   * ページを取得（処理用）
   * busyステートに移行し、処理完了後にreleasePageを呼び出す必要がある
   * error状態の場合は自動リカバリーを試行する
   */
  async acquirePage(): Promise<Page> {
    // error状態の場合は自動リカバリーを試行
    if (this.state === 'error') {
      console.warn('[BaseBrowserSessionManager] Attempting auto-recovery from error state...');
      await this.recoverInternal();
    }

    if (this.state !== 'ready') {
      throw new Error(`Cannot acquire page in state: ${this.state}`);
    }
    if (!this.page) {
      throw new Error('No browser page available');
    }

    this.setState('busy');
    return this.page;
  }

  /**
   * ページを解放（処理完了後）
   */
  releasePage(): void {
    if (this.state === 'busy') {
      this.lastActivityTime = new Date();
      this.setState('ready');
    }
  }

  /**
   * ブラウザ関連のエラーかどうかを判定
   */
  protected isBrowserError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return (
      message.includes('Target closed') ||
      message.includes('Browser closed') ||
      message.includes('Protocol error') ||
      message.includes('Session closed') ||
      message.includes('Connection closed')
    );
  }

  /**
   * キープアライブタイマーを開始
   */
  protected startKeepAlive(): void {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
    }

    this.keepAliveTimer = setInterval(async () => {
      await this.refreshSession();
    }, this.config.keepAliveIntervalMs);
  }

  /**
   * セッションをリフレッシュ（Mutex付き）
   */
  protected async refreshSession(): Promise<void> {
    // busy状態やrecovering状態の場合はスキップ
    if (this.state !== 'ready' || !this.page) return;

    // Mutexを取得してからリフレッシュ（リクエスト処理との競合防止）
    const release = await this.mutex.acquire();
    try {
      // 再度状態チェック（Mutex取得中に変わった可能性）
      if (this.state !== 'ready' || !this.page) return;

      console.log('[BaseBrowserSessionManager] Keep-alive: refreshing session...');

      // サブクラスで定義されたリフレッシュ処理を実行
      await this.refreshForKeepAlive();

      // ログイン状態を確認
      const loggedIn = await this.isLoggedIn();

      if (!loggedIn) {
        console.warn('[BaseBrowserSessionManager] Session expired, recovering...');
        this.emit('sessionExpired');
        await this.recoverInternal();
      } else {
        console.log('[BaseBrowserSessionManager] Keep-alive: session is valid');
      }

      this.lastActivityTime = new Date();
    } catch (error) {
      console.error('[BaseBrowserSessionManager] Keep-alive failed:', error);
      await this.recoverInternal();
    } finally {
      release();
    }
  }

  /**
   * セッションをリカバリー（外部呼び出し用、Mutex付き）
   */
  async recover(): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      await this.recoverInternal();
    } finally {
      release();
    }
  }

  /**
   * セッションをリカバリー（内部用、Mutex取得済み前提）
   */
  protected async recoverInternal(): Promise<void> {
    if (this.state === 'recovering') return;

    this.setState('recovering');
    console.log('[BaseBrowserSessionManager] Attempting to recover session...');

    try {
      // ブラウザを閉じる
      await this.closeBrowser();

      // 再起動
      this.browser = await chromium.launch({
        headless: this.config.headless,
        args: this.config.browserArgs,
      });

      this.context = await this.browser.newContext({
        viewport: this.config.viewport,
        locale: this.config.locale,
        timezoneId: this.config.timezoneId,
      });

      this.page = await this.context.newPage();

      // 再ログイン
      await this.performLogin();

      this.emit('recovered');
      this.setState('ready');
      console.log('[BaseBrowserSessionManager] Session recovered');
    } catch (error) {
      this.setState('error');
      this.emit('error', error as Error);
      console.error('[BaseBrowserSessionManager] Recovery failed:', error);
      throw error;
    }
  }

  /**
   * ブラウザを閉じる（内部用）
   */
  protected async closeBrowser(): Promise<void> {
    try {
      if (this.context) {
        await this.context.close();
        this.context = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      this.page = null;
    } catch {
      // エラーを無視
    }
  }

  /**
   * セッションを終了
   */
  async close(): Promise<void> {
    console.log('[BaseBrowserSessionManager] Closing session...');

    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }

    await this.closeBrowser();
    this.setState('closed');
    console.log('[BaseBrowserSessionManager] Session closed');
  }

  /**
   * 強制クローズ（close()が失敗した場合のフォールバック）
   * ゾンビプロセス防止用
   */
  async forceClose(): Promise<void> {
    console.warn('[BaseBrowserSessionManager] Force closing session...');

    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }

    // closeBrowser()は既にエラーを無視する実装になっている
    await this.closeBrowser();
    this.setState('closed');
    console.warn('[BaseBrowserSessionManager] Session force closed');
  }

  /**
   * セッションを再起動
   */
  async restart(): Promise<void> {
    await this.close();
    await this.start();
  }

  /**
   * 現在の状態を取得
   */
  getState(): SessionState {
    return this.state;
  }

  /**
   * 最終アクティビティ時刻を取得
   */
  getLastActivityTime(): Date {
    return this.lastActivityTime;
  }

  /**
   * 状態を更新
   */
  protected setState(newState: SessionState): void {
    const previousState = this.state;
    this.state = newState;
    this.emit('stateChange', newState, previousState);
  }
}

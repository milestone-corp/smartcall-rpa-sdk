/**
 * SmartCall RPA SDK - Browser Manager
 *
 * Playwrightブラウザのライフサイクル管理
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';

export interface BrowserOptions {
  /** ヘッドレスモード（デフォルト: true） */
  headless?: boolean;
  /** ブラウザのロケール */
  locale?: string;
  /** タイムゾーン */
  timezone?: string;
  /** ビューポートサイズ */
  viewport?: { width: number; height: number };
  /** 認証状態の保存パス */
  storageStatePath?: string;
  /** スローモーション（デバッグ用、ms） */
  slowMo?: number;
}

export interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

/**
 * ブラウザ管理クラス
 *
 * ブラウザの起動・終了・認証状態管理を行います。
 */
export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private options: BrowserOptions;

  constructor(options: BrowserOptions = {}) {
    this.options = {
      headless: true,
      locale: 'ja-JP',
      timezone: 'Asia/Tokyo',
      viewport: { width: 1280, height: 720 },
      ...options,
    };
  }

  /**
   * ブラウザを起動してセッションを作成
   */
  async launch(): Promise<BrowserSession> {
    this.browser = await chromium.launch({
      headless: this.options.headless,
      slowMo: this.options.slowMo,
    });

    const contextOptions: Parameters<Browser['newContext']>[0] = {
      locale: this.options.locale,
      timezoneId: this.options.timezone,
      viewport: this.options.viewport,
    };

    // 保存された認証状態があれば復元
    if (this.options.storageStatePath) {
      try {
        const fs = await import('fs');
        if (fs.existsSync(this.options.storageStatePath)) {
          contextOptions.storageState = this.options.storageStatePath;
        }
      } catch {
        // ファイルがなければ無視
      }
    }

    this.context = await this.browser.newContext(contextOptions);
    this.page = await this.context.newPage();

    return {
      browser: this.browser,
      context: this.context,
      page: this.page,
    };
  }

  /**
   * 認証状態を保存
   */
  async saveStorageState(path?: string): Promise<void> {
    const savePath = path || this.options.storageStatePath;
    if (!this.context || !savePath) return;

    await this.context.storageState({ path: savePath });
  }

  /**
   * ブラウザを閉じる
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
    }
  }

  /**
   * 現在のページを取得
   */
  getPage(): Page | null {
    return this.page;
  }

  /**
   * 現在のコンテキストを取得
   */
  getContext(): BrowserContext | null {
    return this.context;
  }
}

/**
 * SmartCall RPA SDK - Base Page Object
 *
 * ページオブジェクトパターンの基底クラス
 */

import type { Page, Locator } from 'playwright';

export interface PageOptions {
  /** 操作のデフォルトタイムアウト（ms） */
  timeout?: number;
  /** 待機時間（ms）*/
  waitTime?: number;
}

/**
 * ページオブジェクト基底クラス
 *
 * 各ページクラスはこのクラスを継承して実装します。
 *
 * @example
 * ```typescript
 * export class LoginPage extends BasePage {
 *   private loginInput = 'input[name="login_id"]';
 *   private passwordInput = 'input[name="password"]';
 *   private submitButton = 'input[type="submit"]';
 *
 *   async login(username: string, password: string): Promise<void> {
 *     await this.fill(this.loginInput, username);
 *     await this.fill(this.passwordInput, password);
 *     await this.click(this.submitButton);
 *     await this.waitForNavigation();
 *   }
 * }
 * ```
 */
export class BasePage {
  protected readonly page: Page;
  protected readonly options: Required<PageOptions>;

  constructor(page: Page, options: PageOptions = {}) {
    this.page = page;
    this.options = {
      timeout: options.timeout ?? 30000,
      waitTime: options.waitTime ?? 1000,
    };
  }

  /**
   * 要素をクリック
   */
  protected async click(selector: string, options?: { force?: boolean }): Promise<void> {
    await this.page.click(selector, {
      timeout: this.options.timeout,
      force: options?.force,
    });
  }

  /**
   * テキストを入力
   */
  protected async fill(selector: string, value: string): Promise<void> {
    await this.page.fill(selector, value, {
      timeout: this.options.timeout,
    });
  }

  /**
   * セレクトボックスで値を選択
   */
  protected async selectOption(selector: string, value: string | string[]): Promise<void> {
    await this.page.selectOption(selector, value, {
      timeout: this.options.timeout,
    });
  }

  /**
   * 要素のテキストを取得
   */
  protected async getText(selector: string): Promise<string | null> {
    return this.page.textContent(selector, {
      timeout: this.options.timeout,
    });
  }

  /**
   * 要素の属性を取得
   */
  protected async getAttribute(selector: string, name: string): Promise<string | null> {
    return this.page.getAttribute(selector, name, {
      timeout: this.options.timeout,
    });
  }

  /**
   * 要素が表示されているか確認
   */
  protected async isVisible(selector: string): Promise<boolean> {
    return this.page.isVisible(selector);
  }

  /**
   * 要素を待機
   */
  protected async waitForSelector(
    selector: string,
    options?: { state?: 'visible' | 'hidden' | 'attached' | 'detached' }
  ): Promise<Locator> {
    await this.page.waitForSelector(selector, {
      timeout: this.options.timeout,
      state: options?.state ?? 'visible',
    });
    return this.page.locator(selector);
  }

  /**
   * ナビゲーションを待機
   */
  protected async waitForNavigation(): Promise<void> {
    await this.page.waitForLoadState('networkidle', {
      timeout: this.options.timeout,
    });
  }

  /**
   * URLを待機
   */
  protected async waitForURL(urlPattern: string | RegExp): Promise<void> {
    await this.page.waitForURL(urlPattern, {
      timeout: this.options.timeout,
    });
  }

  /**
   * 固定時間待機
   */
  protected async wait(ms?: number): Promise<void> {
    await this.page.waitForTimeout(ms ?? this.options.waitTime);
  }

  /**
   * URLに遷移
   */
  protected async goto(url: string): Promise<void> {
    await this.page.goto(url, {
      timeout: this.options.timeout,
      waitUntil: 'networkidle',
    });
  }

  /**
   * 現在のURLを取得
   */
  protected getCurrentURL(): string {
    return this.page.url();
  }

  /**
   * Pageオブジェクトを取得（高度な操作用）
   */
  getPage(): Page {
    return this.page;
  }

  /**
   * 要素一覧を取得してテキストを抽出
   */
  protected async getAllTexts(selector: string): Promise<string[]> {
    const elements = await this.page.locator(selector).all();
    return Promise.all(elements.map((el) => el.textContent().then((t) => t?.trim() ?? '')));
  }

  /**
   * 要素の数を取得
   */
  protected async count(selector: string): Promise<number> {
    return this.page.locator(selector).count();
  }

  /**
   * フォーム送信を待機してクリック
   */
  protected async submitAndWait(selector: string): Promise<void> {
    await Promise.all([
      this.page.waitForLoadState('networkidle'),
      this.click(selector),
    ]);
  }
}

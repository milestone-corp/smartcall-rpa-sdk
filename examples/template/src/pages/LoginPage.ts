/**
 * ログインページ Page Object
 *
 * サイト固有のセレクターとログイン処理を実装します。
 */

import { BasePage } from '@smartcall/rpa-sdk';

export class LoginPage extends BasePage {
  // セレクター定義（対象サイトに合わせて変更してください）
  private readonly loginIdInput = '#login_id';
  private readonly passwordInput = '#password';
  private readonly loginButton = 'button[type="submit"]';

  /**
   * ログインを実行
   */
  async login(loginId: string, password: string): Promise<void> {
    await this.fill(this.loginIdInput, loginId);
    await this.fill(this.passwordInput, password);
    await this.click(this.loginButton);

    // ログイン後のページ遷移を待機（対象サイトに合わせて変更）
    await this.page.waitForURL(/\/dashboard/, { timeout: 15000 });
  }

  /**
   * ログイン成功を確認
   */
  async isLoggedIn(): Promise<boolean> {
    const url = this.page.url();
    return url.includes('/dashboard');
  }
}

/**
 * SmartCall RPA SDK - サンプルワーカー（Playwrightジョブ実行）
 *
 * キューからジョブを取得し、Playwrightでブラウザ操作を行い、
 * コールバックで結果を送信するサンプルコードです。
 *
 * 実行方法:
 *   SMARTCALL_MODE=stub npx ts-node examples/worker.ts
 *
 * このサンプルでは開発者ポータルにログインする例を示します。
 * URL: https://dev-portal.smartcall.jp/login
 * ID: testuser
 * PW: dd!df0-fmmdr
 */

import {
  createRpaJob,
  getCredentials,
  getOptionalCredentials,
  BasePage,
  type RpaJobContext,
  type RpaJobData,
} from '../src/index.js';

/**
 * ログインページのPage Object
 */
class LoginPage extends BasePage {
  // セレクター定義
  private readonly loginIdInput = '#loginId';
  private readonly passwordInput = '#password';
  private readonly loginButton = 'button[type="submit"]';
  private readonly dashboardIndicator = '.dashboard, .page-header, [class*="dashboard"]';

  /**
   * ログインを実行
   */
  async login(loginId: string, password: string): Promise<void> {
    await this.fill(this.loginIdInput, loginId);
    await this.fill(this.passwordInput, password);
    await this.click(this.loginButton);

    // ダッシュボードが表示されるまで待機（最大10秒）
    try {
      await this.page.waitForSelector(this.dashboardIndicator, { timeout: 10000 });
    } catch {
      // ダッシュボードインジケーターが見つからない場合はURLで判定
      await this.page.waitForURL(/\/(dashboard|dev)/, { timeout: 10000 });
    }
  }

  /**
   * ログイン成功を確認
   */
  async isLoggedIn(): Promise<boolean> {
    const url = this.page.url();
    return url.includes('/dashboard') || url.includes('/dev');
  }
}

/**
 * RPAジョブを作成
 *
 * createRpaJobは以下を自動で行います:
 * - ブラウザの起動・終了
 * - スクリーンショット管理（エラー時は保持、成功時は削除）
 * - ロギング
 * - コールバック送信ヘルパー
 */
createRpaJob<RpaJobData>(
  'sync',
  async (ctx: RpaJobContext<RpaJobData>) => {
    const { page, data, screenshot, logger, sendCallback, buildResult } = ctx;

    logger.info({ jobId: data.job_id, shopId: data.external_shop_id }, 'Starting job');

    try {
      // 1. 認証情報を取得（環境変数から）
      // 本番環境ではdocker-compose.ymlで設定された環境変数から読み取られます
      // ローカル開発時は手動で設定するか、getOptionalCredentialsを使用
      const credentials = getOptionalCredentials() || {
        loginKey: 'testuser',
        loginPassword: 'dd!df0-fmmdr',
      };

      // 2. ログインページに遷移
      await page.goto('https://dev-portal.smartcall.jp/login');
      await screenshot.captureStep(page, '01-login-page');
      logger.info('Navigated to login page');

      // 3. ログインを実行
      const loginPage = new LoginPage(page);
      await loginPage.login(credentials.loginKey, credentials.loginPassword);
      await screenshot.captureStep(page, '02-after-login');

      // 4. ログイン成功を確認
      const isLoggedIn = await loginPage.isLoggedIn();
      if (!isLoggedIn) {
        throw new Error('Login failed');
      }
      logger.info('Login successful');

      // 5. 実際のビジネスロジックをここに実装
      // 例: 予約システムで空き枠を取得、予約を作成/キャンセル等
      //
      // if (data.action === 'fetch_slots') {
      //   const slots = await fetchAvailableSlots(page);
      //   await sendCallback(buildResult({ type: 'available_slots', slots }));
      // } else if (data.reservations) {
      //   const results = await processReservations(page, data.reservations);
      //   await sendCallback(buildResult({ type: 'reservation_results', results }));
      // }

      // 6. コールバックで結果を送信
      // buildResultは job_id, external_shop_id, synced_at を自動設定します
      await sendCallback(
        buildResult({
          type: 'available_slots',
          slots: [
            {
              date: '2025-12-20',
              start_time: '10:00',
              end_time: '11:00',
              resource_name: 'スタッフA',
              menu_name: 'カット',
              duration_min: 60,
              status: 'available',
            },
          ],
        })
      );

      logger.info('Job completed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error: errorMessage }, 'Job failed');

      // エラー時もコールバックで失敗を通知
      await sendCallback(
        buildResult({
          type: 'error',
          error: errorMessage,
        })
      );

      throw error;
    }
  },
  {
    // ブラウザオプション
    browser: {
      headless: true, // ローカルでデバッグ時はfalseに
    },
    // スクリーンショットオプション
    screenshot: {
      baseDir: './screenshots',
    },
    // 並列数
    concurrency: 1,
  }
);

console.log('[Worker] Started, waiting for jobs...');
console.log('[Worker] Press Ctrl+C to stop');

/**
 * SmartCall RPA SDK - 完全なサンプル（サーバー + ワーカー統合）
 *
 * 1つのファイルでサーバーとワーカーを起動するサンプルです。
 * sync-cycleリクエストを受け取り、ジョブを登録し、
 * ワーカーがPlaywrightでブラウザ操作を実行してコールバックを送信します。
 *
 * 実行方法:
 *   SMARTCALL_MODE=stub npx ts-node examples/full-example.ts
 *
 * テスト:
 *   curl -X POST http://localhost:3000/beautymerit/sync-cycle \
 *     -H "Content-Type: application/json" \
 *     -d '{
 *       "job_id": "JOB-001",
 *       "external_shop_id": "SHOP-001",
 *       "action": "fetch_slots",
 *       "callback_url": "https://httpbin.org/post"
 *     }'
 */

import express from 'express';
import {
  createQueue,
  createWorker,
  createSyncCycleHandler,
  addHealthCheck,
  BrowserManager,
  ScreenshotManager,
  sendCallback,
  createRpaLogger,
  getOptionalCredentials,
  BasePage,
  type RpaJobData,
} from '../src/index.js';

// ============================================
// キュー定義
// ============================================
const syncQueue = createQueue<RpaJobData>('sync');

// ============================================
// ログインページ Page Object
// ============================================
class LoginPage extends BasePage {
  private readonly loginIdInput = '#loginId';
  private readonly passwordInput = '#password';
  private readonly loginButton = 'button[type="submit"]';

  async login(loginId: string, password: string): Promise<void> {
    await this.fill(this.loginIdInput, loginId);
    await this.fill(this.passwordInput, password);
    await this.click(this.loginButton);
    // ページ遷移を待機
    await this.page.waitForURL(/\/(dashboard|dev)/, { timeout: 10000 });
  }
}

// ============================================
// ワーカー定義
// ============================================
const syncWorker = createWorker<RpaJobData>('sync', async (job) => {
  const jobId = job.id ?? `job-${Date.now()}`;
  const data = job.data;

  const logger = createRpaLogger({ jobId, queueName: 'sync' });
  const browserManager = new BrowserManager({ headless: true });
  const screenshot = new ScreenshotManager(jobId, { baseDir: './screenshots' });

  logger.info({ shopId: data.external_shop_id, action: data.action }, 'Processing job');

  try {
    // ブラウザ起動
    const { page } = await browserManager.launch();
    logger.info('Browser launched');

    // 認証情報取得（環境変数またはデフォルト値）
    const credentials = getOptionalCredentials() || {
      loginKey: 'testuser',
      loginPassword: 'dd!df0-fmmdr',
    };

    // ログインページに遷移
    await page.goto('https://dev-portal.smartcall.jp/login');
    await screenshot.captureStep(page, '01-login-page');

    // ログイン実行
    const loginPage = new LoginPage(page);
    await loginPage.login(credentials.loginKey, credentials.loginPassword);
    await screenshot.captureStep(page, '02-after-login');
    logger.info('Login successful');

    // ビジネスロジック（この例では空き枠を返す）
    const result = {
      job_id: data.job_id,
      external_shop_id: data.external_shop_id,
      synced_at: new Date().toISOString(),
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
        {
          date: '2025-12-20',
          start_time: '14:00',
          end_time: '15:00',
          resource_name: 'スタッフB',
          menu_name: 'カラー',
          duration_min: 90,
          status: 'available',
        },
      ],
    };

    // コールバック送信
    if (data.callback_url) {
      await sendCallback(data.callback_url, result);
      logger.info({ callbackUrl: data.callback_url }, 'Callback sent');
    }

    // 成功時: スクリーンショット削除
    await screenshot.cleanup();
    logger.info('Job completed successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMessage }, 'Job failed');

    // エラー時: スクリーンショット保持
    screenshot.clear();

    // エラー時もコールバックで通知
    if (data.callback_url) {
      await sendCallback(data.callback_url, {
        job_id: data.job_id,
        external_shop_id: data.external_shop_id,
        synced_at: new Date().toISOString(),
        type: 'error',
        error: errorMessage,
      });
    }

    throw error;
  } finally {
    await browserManager.close();
  }
});

// ワーカーイベント
syncWorker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed`);
});

syncWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});

// ============================================
// サーバー定義
// ============================================
const app = express();
app.use(express.json());

// ヘルスチェック
addHealthCheck(app);

// sync-cycleエンドポイント
app.post('/beautymerit/sync-cycle', createSyncCycleHandler(syncQueue));

// サーバー起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('');
  console.log('============================================');
  console.log('  SmartCall RPA SDK - Full Example');
  console.log('============================================');
  console.log('');
  console.log(`[Server] Running on port ${PORT}`);
  console.log('[Worker] Started, waiting for jobs...');
  console.log('');
  console.log('Endpoints:');
  console.log(`  - GET  http://localhost:${PORT}/health`);
  console.log(`  - POST http://localhost:${PORT}/beautymerit/sync-cycle`);
  console.log('');
  console.log('Test command:');
  console.log(`  curl -X POST http://localhost:${PORT}/beautymerit/sync-cycle \\`);
  console.log('    -H "Content-Type: application/json" \\');
  console.log("    -d '{");
  console.log('      "job_id": "JOB-001",');
  console.log('      "external_shop_id": "SHOP-001",');
  console.log('      "action": "fetch_slots",');
  console.log('      "callback_url": "https://httpbin.org/post"');
  console.log("    }'");
  console.log('');
  console.log('Press Ctrl+C to stop');
  console.log('');
});

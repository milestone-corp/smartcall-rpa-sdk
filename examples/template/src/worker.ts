/**
 * SmartCall RPA API ワーカー
 *
 * キューからジョブを取得し、Playwrightでブラウザ操作を行います。
 */

import {
  createRpaJob,
  getCredentials,
  type RpaJobContext,
  type RpaJobData,
} from '@smartcall/rpa-sdk';
import { LoginPage } from './pages/LoginPage.js';

/**
 * RPAジョブを作成
 */
createRpaJob<RpaJobData>(
  'sync',
  async (ctx: RpaJobContext<RpaJobData>) => {
    const { page, data, screenshot, logger, sendCallback, buildResult } = ctx;

    logger.info({ jobId: data.job_id, shopId: data.external_shop_id }, 'Starting job');

    // 1. 認証情報を取得（環境変数から）
    const credentials = getCredentials();

    // 2. ログインページに遷移
    await page.goto('https://your-reservation-system.com/login');
    await screenshot.captureStep(page, '01-login-page');

    // 3. ログインを実行
    const loginPage = new LoginPage(page);
    await loginPage.login(credentials.loginKey, credentials.loginPassword);
    await screenshot.captureStep(page, '02-after-login');

    // 4. ビジネスロジックを実装
    // TODO: 予約システムの操作を実装
    // - 空き枠取得: data.date_from 〜 data.date_to の空き枠を取得
    // - 予約作成: data.reservations の operation='create' を処理
    // - 予約キャンセル: data.reservations の operation='cancel' を処理

    // 5. コールバックで結果を送信
    await sendCallback(
      buildResult('success', {
        available_slots: [
          {
            date: '2025-01-15',
            time: '10:00',
            duration_min: 60,
            stock: 1,
            resource_name: 'スタッフA',
          },
        ],
        reservation_results: [],
      })
    );

    logger.info('Job completed successfully');
  },
  {
    browser: {
      headless: true,
    },
    screenshot: {
      baseDir: process.env.SCREENSHOT_DIR || './screenshots',
    },
    concurrency: 1,
  }
);

console.log('[Worker] Started, waiting for jobs...');

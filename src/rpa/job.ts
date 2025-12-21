/**
 * SmartCall RPA SDK - RPA Job Handler
 *
 * RPAジョブの共通処理フローを提供
 */

import type { Page, Browser, BrowserContext } from 'playwright';
import type { Job } from 'bullmq';
import { createWorker } from '../index.js';
import { BrowserManager, type BrowserOptions } from './browser.js';
import { ScreenshotManager, type ScreenshotOptions } from './screenshot.js';
import { sendCallback, buildCallbackResult, type CallbackResult } from './callback.js';
import { createRpaLogger, type RpaLogger } from './logger.js';

/**
 * RPAジョブのコンテキスト
 * ジョブハンドラーに渡される共通オブジェクト
 */
export interface RpaJobContext<T = unknown> {
  /** BullMQジョブ */
  job: Job<T>;
  /** ジョブデータ */
  data: T;
  /** ジョブID */
  jobId: string;
  /** Playwrightページ */
  page: Page;
  /** Playwrightブラウザ */
  browser: Browser;
  /** Playwrightコンテキスト */
  context: BrowserContext;
  /** スクリーンショット管理 */
  screenshot: ScreenshotManager;
  /** ロガー */
  logger: RpaLogger;
  /** コールバック送信 */
  sendCallback: (result: CallbackResult) => Promise<void>;
  /** コールバック結果構築 */
  buildResult: (
    status: 'success' | 'partial_success' | 'failed',
    data?: Partial<Omit<CallbackResult, 'job_id' | 'external_shop_id' | 'status'>>
  ) => CallbackResult;
}

/**
 * RPAジョブハンドラーの型
 */
export type RpaJobHandler<T, R = void> = (context: RpaJobContext<T>) => Promise<R>;

/**
 * RPAジョブのオプション
 */
export interface RpaJobOptions {
  /** ブラウザオプション */
  browser?: BrowserOptions;
  /** スクリーンショットオプション */
  screenshot?: ScreenshotOptions;
  /** ジョブデータからexternal_shop_idを取得する関数 */
  getExternalShopId?: (data: unknown) => string;
  /** ジョブデータからcallback_urlを取得する関数 */
  getCallbackUrl?: (data: unknown) => string;
  /** Workerの並列数 */
  concurrency?: number;
}

/**
 * RPAジョブを作成
 *
 * Playwright + BullMQの共通処理をラップし、開発者はビジネスロジックに集中できます。
 *
 * @example
 * ```typescript
 * createRpaJob<SyncRequest>('beautymerit-sync', async (ctx) => {
 *   const { page, data, screenshot, logger, sendCallback, buildResult } = ctx;
 *
 *   // ログイン
 *   const loginPage = new LoginPage(page);
 *   await loginPage.login(process.env.LOGIN_KEY!, process.env.LOGIN_PASSWORD!);
 *   await screenshot.captureStep(page, 'after-login');
 *
 *   // ビジネスロジック
 *   const results = await processReservations(page, data.reservations);
 *
 *   // コールバック送信
 *   await sendCallback(buildResult({
 *     reservation_results: results,
 *   }));
 * });
 * ```
 */
export function createRpaJob<T = unknown, R = void>(
  queueName: string,
  handler: RpaJobHandler<T, R>,
  options: RpaJobOptions = {}
) {
  const {
    browser: browserOptions = {},
    screenshot: screenshotOptions = {},
    getExternalShopId = (data: unknown) => (data as { external_shop_id?: string })?.external_shop_id ?? '',
    getCallbackUrl = (data: unknown) => (data as { callback_url?: string })?.callback_url ?? '',
    concurrency = 1,
  } = options;

  return createWorker<T, R>(
    queueName,
    async (job) => {
      const jobId = job.id ?? `job-${Date.now()}`;
      const data = job.data;
      const externalShopId = getExternalShopId(data);
      const callbackUrl = getCallbackUrl(data);

      // ロガー初期化
      const logger = createRpaLogger({ jobId, queueName });
      logger.info('Starting RPA job');

      // ブラウザ管理
      const browserManager = new BrowserManager(browserOptions);

      // スクリーンショット管理
      const screenshot = new ScreenshotManager(jobId, screenshotOptions);

      let result: R;

      try {
        // ブラウザ起動
        const { browser, context, page } = await browserManager.launch();
        logger.info('Browser launched');

        // コンテキスト作成
        const ctx: RpaJobContext<T> = {
          job,
          data,
          jobId,
          page,
          browser,
          context,
          screenshot,
          logger,
          sendCallback: async (callbackResult: CallbackResult) => {
            if (callbackUrl) {
              await sendCallback(callbackUrl, callbackResult);
            } else {
              logger.warn('No callback URL provided, skipping callback');
            }
          },
          buildResult: (status, partialData) =>
            buildCallbackResult(jobId, externalShopId, status, partialData),
        };

        // ハンドラー実行
        result = await handler(ctx);

        // 成功時：スクリーンショット削除
        await screenshot.cleanup();
        logger.info('Job completed successfully, screenshots cleaned up');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error({ error: errorMessage }, 'Job failed');

        // エラー時：スクリーンショット保持
        screenshot.clear();
        logger.info({ screenshotCount: screenshot.getPaths().length }, 'Screenshots preserved for debugging');

        throw error;
      } finally {
        // ブラウザを閉じる
        await browserManager.close();
        logger.info('Browser closed');
      }

      return result;
    },
    { concurrency }
  );
}

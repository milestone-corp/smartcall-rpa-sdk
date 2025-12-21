/**
 * SmartCall RPA SDK - RPA Automation Helpers
 *
 * Playwright + BullMQベースのRPA開発を簡素化するヘルパー関数群
 *
 * @example
 * ```typescript
 * import { createRpaJob, BasePage, ScreenshotManager } from '@smartcall/rpa-sdk/rpa';
 *
 * // ジョブハンドラーを登録
 * createRpaJob<MySyncData>('my-sync', async (context) => {
 *   const { page, job, screenshot, logger } = context;
 *
 *   // ページオブジェクトで操作
 *   const loginPage = new LoginPage(page);
 *   await loginPage.login(credentials);
 *
 *   // 処理結果をコールバック
 *   return { status: 'success', data: result };
 * });
 * ```
 */

export { createRpaJob, type RpaJobContext, type RpaJobHandler, type RpaJobOptions } from './job.js';
export { BasePage, type PageOptions } from './page.js';
export { ScreenshotManager, type ScreenshotOptions } from './screenshot.js';
export {
  sendCallback,
  buildCallbackResult,
  type CallbackOptions,
  type CallbackResult,
  type ReservationResult,
  type AvailableSlot,
  type CallbackError,
} from './callback.js';
export { createRpaLogger, type RpaLogger } from './logger.js';
export { BrowserManager, type BrowserOptions } from './browser.js';
export {
  getCredentials,
  getOptionalCredentials,
  getCustomCredential,
  hasCredentials,
  type RpaCredentials,
} from './credentials.js';
export {
  createSyncCycleHandler,
  addHealthCheck,
  setupRpaServer,
  type ReservationRequest,
  type SyncCycleRequest,
  type RpaJobData,
  type SyncCycleResponse,
  type ErrorResponse,
  type RpaServerOptions,
} from './server.js';

/**
 * SmartCall RPA SDK - RPA Automation Helpers
 * v2.0 - Real-time RPA patterns (no Redis/BullMQ)
 *
 * Playwright常駐ブラウザ方式のRPA開発を簡素化するヘルパー関数群
 *
 * @example
 * ```typescript
 * import {
 *   BaseBrowserSessionManager,
 *   BasePage,
 *   ScreenshotManager
 * } from '@smartcall/rpa-sdk/rpa';
 *
 * // セッションマネージャーを継承
 * class MySessionManager extends BaseBrowserSessionManager {
 *   protected async performLogin(): Promise<void> {
 *     await this.page!.goto('https://example.com/login');
 *     // ログイン処理
 *   }
 *
 *   protected async isLoggedIn(): Promise<boolean> {
 *     return true;
 *   }
 *
 *   protected async refreshForKeepAlive(): Promise<void> {
 *     await this.page!.reload();
 *   }
 * }
 *
 * // 使用
 * const session = new MySessionManager({ headless: true });
 * await session.start();
 *
 * await session.withPage(async (page) => {
 *   const myPage = new MyPage(page);
 *   await myPage.doSomething();
 * });
 * ```
 */

// Browser Session Management
export {
  BaseBrowserSessionManager,
  type BaseSessionConfig,
  type SessionState,
} from './session.js';

// Page Helpers
export { BasePage, type PageOptions } from './page.js';
export { ScreenshotManager, type ScreenshotOptions } from './screenshot.js';
export { BrowserManager, type BrowserOptions } from './browser.js';

// Callback
export {
  sendCallback,
  buildCallbackResult,
  type CallbackOptions,
  type CallbackResult,
  type ReservationResult,
  type AvailableSlot,
  type CallbackError,
} from './callback.js';

// Logging
export { createRpaLogger, type RpaLogger } from './logger.js';

// Credentials
export {
  getCredentials,
  getOptionalCredentials,
  getCustomCredential,
  hasCredentials,
  type RpaCredentials,
} from './credentials.js';

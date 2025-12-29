/**
 * SmartCall RPA SDK
 * v2.0 - Real-time RPA patterns (no Redis/BullMQ)
 *
 * Playwright常駐ブラウザ方式のRPA開発を簡素化するユーティリティライブラリ
 *
 * ## 使用例
 *
 * ```typescript
 * import {
 *   BaseBrowserSessionManager,
 *   BasePage,
 *   ScreenshotManager,
 *   sendCallback
 * } from '@smartcall/rpa-sdk';
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
 *   // ページ操作（Mutex保護されている）
 * });
 * ```
 *
 * @packageDocumentation
 */

import { getConfig, logConfig } from './config.js';

// Re-export configuration functions
export { getConfig, logConfig };

// Re-export types
export type {
  SmartCallConfig,
  ReservationRequest,
  CustomerInfo,
  SlotInfo,
  MenuInfo,
  StaffInfo,
} from './types.js';

// RPA Helpers
export * from './rpa/index.js';

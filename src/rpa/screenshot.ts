/**
 * SmartCall RPA SDK - Screenshot Manager
 *
 * スクリーンショットの撮影・保存・クリーンアップを管理
 */

import type { Page } from 'playwright';

export interface ScreenshotOptions {
  /** スクリーンショット保存ディレクトリ */
  directory?: string;
  /** スクリーンショット機能を有効化 */
  enabled?: boolean;
  /** フルページスクリーンショット */
  fullPage?: boolean;
}

/**
 * スクリーンショット管理クラス
 *
 * ジョブ成功時に削除、エラー時に保持するパターンをサポート
 */
export class ScreenshotManager {
  private paths: string[] = [];
  private jobId: string;
  private options: Required<ScreenshotOptions>;

  constructor(jobId: string, options: ScreenshotOptions = {}) {
    this.jobId = jobId;
    this.options = {
      directory: options.directory || process.env.SCREENSHOT_DIR || '/app/screenshots',
      enabled: options.enabled ?? process.env.ENABLE_SCREENSHOT === 'true',
      fullPage: options.fullPage ?? true,
    };
  }

  /**
   * スクリーンショット機能が有効かどうか
   */
  isEnabled(): boolean {
    return this.options.enabled;
  }

  /**
   * スクリーンショットを撮影して保存
   *
   * @param page Playwrightのページオブジェクト
   * @param name スクリーンショット名（拡張子不要）
   * @param prefix プレフィックス（例: 'step', 'error'）
   * @returns 保存したファイルパス、または無効の場合はnull
   */
  async capture(page: Page, name: string, prefix: string = 'step'): Promise<string | null> {
    if (!this.options.enabled) {
      return null;
    }

    try {
      const fs = await import('fs');
      const path = await import('path');

      // ディレクトリが存在しない場合は作成
      if (!fs.existsSync(this.options.directory)) {
        fs.mkdirSync(this.options.directory, { recursive: true });
      }

      // ファイル名を生成: {prefix}_{name}_{jobId}_{timestamp}.png
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${prefix}_${name}_${this.jobId}_${timestamp}.png`;
      const filepath = path.join(this.options.directory, filename);

      // スクリーンショットを保存
      await page.screenshot({
        path: filepath,
        fullPage: this.options.fullPage,
      });

      this.paths.push(filepath);
      return filepath;
    } catch (error) {
      console.error('[SmartCall SDK] Failed to save screenshot:', error);
      return null;
    }
  }

  /**
   * ステップのスクリーンショットを撮影
   */
  async captureStep(page: Page, stepName: string): Promise<string | null> {
    return this.capture(page, stepName, 'step');
  }

  /**
   * エラー時のスクリーンショットを撮影
   */
  async captureError(page: Page, errorContext: string): Promise<string | null> {
    return this.capture(page, errorContext, 'error');
  }

  /**
   * 収集したすべてのスクリーンショットを削除
   * ジョブ成功時に呼び出す
   */
  async cleanup(): Promise<void> {
    const fs = await import('fs');

    for (const filepath of this.paths) {
      try {
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      } catch (error) {
        console.warn('[SmartCall SDK] Failed to delete screenshot:', filepath, error);
      }
    }
    this.paths = [];
  }

  /**
   * 収集したスクリーンショットのパス一覧を取得
   */
  getPaths(): string[] {
    return [...this.paths];
  }

  /**
   * パスリストをクリア（ファイルは削除しない）
   * エラー時に呼び出してスクリーンショットを保持する
   */
  clear(): void {
    this.paths = [];
  }
}

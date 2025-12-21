/**
 * ワーカー（Playwright）のテスト
 *
 * 開発者ポータルにログインして動作確認
 */
import {
  BrowserManager,
  ScreenshotManager,
  createRpaLogger,
  BasePage,
} from './dist/index.js';

class LoginPage extends BasePage {
  async login(loginId, password) {
    await this.fill('#username', loginId);
    await this.fill('#password', password);
    await this.click('button[type="submit"]');
    // ページ遷移を待機
    await this.page.waitForURL(/\/(dashboard|dev)/, { timeout: 15000 });
  }
}

async function testWorker() {
  const logger = createRpaLogger({ jobId: 'test-job', queueName: 'test' });
  const browserManager = new BrowserManager({ headless: true });
  const screenshot = new ScreenshotManager('test-job', {
    directory: '/app/screenshots',
    enabled: true,
  });

  logger.info('Starting worker test');

  try {
    // ブラウザ起動
    const { page } = await browserManager.launch();
    logger.info('Browser launched');

    // ログインページに遷移
    await page.goto('https://dev-portal.smartcall.jp/login');
    await screenshot.captureStep(page, '01-login-page');
    logger.info('Navigated to login page');

    // ログイン実行
    const loginPage = new LoginPage(page);
    await loginPage.login('testuser', 'dd!df0-fmmdr');
    await screenshot.captureStep(page, '02-after-login');
    logger.info('Login completed');

    // ログイン成功確認
    const url = page.url();
    if (url.includes('/dashboard') || url.includes('/dev')) {
      console.log('[Test] ✅ Worker test PASSED - Login successful');
      console.log(`[Test] Current URL: ${url}`);

      // スクリーンショットのパスを表示
      const paths = screenshot.getPaths();
      console.log('[Test] Screenshots taken:');
      paths.forEach(p => console.log(`  - ${p}`));

      // 成功時もスクリーンショットを保持（確認用）
      // screenshot.clear();
    } else {
      console.log('[Test] ❌ Worker test FAILED - Login failed');
      console.log(`[Test] Current URL: ${url}`);
    }

  } catch (error) {
    console.error('[Test] ❌ Worker test FAILED:', error.message);
    // エラー時もスクリーンショット保持（デバッグ用）
    const paths = screenshot.getPaths();
    if (paths.length > 0) {
      console.log('[Test] Screenshots preserved:', paths);
    }
  } finally {
    await browserManager.close();
    logger.info('Browser closed');
  }
}

testWorker();

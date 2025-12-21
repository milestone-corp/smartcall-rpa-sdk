# SmartCall RPA SDK

SmartCall RPA API開発者向けのRedis/BullMQ/Playwrightユーティリティライブラリです。

## ドキュメント

- [API仕様書](docs/API_SPEC.md) - sync-cycle / callback インターフェース仕様

## 特徴

- **環境変数でモード切り替え**: ローカル開発時はスタブモード、本番はRedis接続
- **シンプルなAPI**: キュー名を指定するだけで使用可能
- **RPA基盤**: Playwrightベースのブラウザ操作ヘルパー
- **型安全**: TypeScript対応、完全な型定義付き

## インストール

```bash
npm install github:milestone-corp/smartcall-rpa-sdk

# RPA機能を使う場合はplaywrightも必要
npm install playwright
```

## 動作モード

環境変数 `SMARTCALL_MODE` で制御:

| 値 | モード | 説明 |
|----|--------|------|
| `stub` / `local` / `development` | スタブモード | メモリ内キュー（Redisなし） |
| それ以外（未設定含む） | 本番モード | BullMQ + Redis |

## 使用例

### キュー/Worker（基本）

```typescript
import { createQueue, createWorker, getConfig } from '@smartcall/rpa-sdk';

// 設定確認
const config = getConfig();
console.log(`Mode: ${config.mode}, API ID: ${config.apiConfigId}`);

// ジョブデータの型定義
interface SyncJobData {
  job_id: string;
  external_shop_id: string;
  callback_url: string;
}

// キュー作成
export const syncQueue = createQueue<SyncJobData>('sync');

// Worker作成
export const syncWorker = createWorker<SyncJobData>('sync', async (job) => {
  console.log(`Processing job: ${job.id}`);
  // ジョブ処理ロジック
});

// イベントハンドリング
syncWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

syncWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});
```

### RPA ジョブ（Playwright統合）

SDKのRPA機能を使うと、Playwright + BullMQの共通処理が自動化されます。

```typescript
import { createRpaJob, BasePage, ScreenshotManager } from '@smartcall/rpa-sdk';

// ページオブジェクト（ビジネスロジック）
class LoginPage extends BasePage {
  async login(username: string, password: string): Promise<void> {
    await this.fill('input[name="login_id"]', username);
    await this.fill('input[name="password"]', password);
    await this.submitAndWait('input[type="submit"]');
  }
}

class SchedulePage extends BasePage {
  async selectDate(date: string): Promise<void> {
    await this.click(`[data-date="${date}"]`);
    await this.waitForNavigation();
  }

  async getAvailableSlots(): Promise<string[]> {
    return this.getAllTexts('.slot.available');
  }
}

// RPA ジョブ定義
interface MySyncData {
  job_id: string;
  external_shop_id: string;
  callback_url: string;
  reservations: Array<{
    reservation_id: string;
    operation: 'create' | 'cancel';
    date: string;
  }>;
}

createRpaJob<MySyncData>('my-sync', async (ctx) => {
  const { page, data, screenshot, logger, sendCallback, buildResult } = ctx;

  // ログイン
  const loginPage = new LoginPage(page);
  await loginPage.login(process.env.LOGIN_KEY!, process.env.LOGIN_PASSWORD!);
  await screenshot.captureStep(page, 'after-login');

  // ビジネスロジック
  const schedulePage = new SchedulePage(page);
  await schedulePage.selectDate('2025-01-15');
  const slots = await schedulePage.getAvailableSlots();
  await screenshot.captureStep(page, 'schedule-page');

  logger.info({ slotCount: slots.length }, 'Available slots fetched');

  // 予約処理...
  const results = []; // 処理結果

  // コールバック送信
  await sendCallback(buildResult('success', {
    reservation_results: results,
    available_slots: slots.map(s => ({
      date: '2025-01-15',
      time: s,
      stock: 1,
      duration_min: 30,
    })),
  }));
});
```

## RPA機能

### createRpaJob

RPAジョブを作成します。以下が自動的に行われます:

- Playwrightブラウザの起動・終了
- スクリーンショット管理（成功時削除、エラー時保持）
- 構造化ログ出力
- コールバック送信

```typescript
createRpaJob<T>('queue-name', async (ctx) => {
  // ctx.page: Playwrightページ
  // ctx.screenshot: ScreenshotManager
  // ctx.logger: RpaLogger
  // ctx.sendCallback: コールバック送信
  // ctx.buildResult: 結果構築
});
```

### BasePage

ページオブジェクトパターンの基底クラス。

```typescript
class MyPage extends BasePage {
  async doSomething(): Promise<void> {
    await this.click('.button');
    await this.fill('.input', 'value');
    await this.waitForNavigation();
  }
}
```

主なメソッド:
- `click(selector)` - 要素をクリック
- `fill(selector, value)` - テキスト入力
- `selectOption(selector, value)` - セレクト選択
- `getText(selector)` - テキスト取得
- `isVisible(selector)` - 表示確認
- `waitForSelector(selector)` - 要素待機
- `waitForNavigation()` - ナビゲーション待機
- `goto(url)` - URL遷移
- `getAllTexts(selector)` - 複数要素のテキスト取得

### ScreenshotManager

スクリーンショットの撮影・管理。

```typescript
const screenshot = new ScreenshotManager(jobId, {
  directory: '/app/screenshots',
  enabled: true,
});

await screenshot.captureStep(page, 'after-login');
await screenshot.captureError(page, 'login-failed');

// ジョブ成功時に削除
await screenshot.cleanup();
```

## ローカル開発

```bash
# スタブモードで起動（Redisなし）
SMARTCALL_MODE=stub npm run dev
```

スタブモードでは:
- Redisへの接続は行われません
- ジョブは即座にメモリ内で処理されます
- 本番と同じAPIで動作確認できます

## Docker でのテスト実行

Playwrightを使ったRPA処理をDockerでテストできます。

### 1. テスト用Dockerイメージのビルド

```bash
docker compose -f docker/docker-compose.test.yml build
```

### 2. テスト実行

```bash
# Playwrightテストを実行
docker compose -f docker/docker-compose.test.yml run --rm test

# スクリーンショットは ./screenshots/ に保存されます
ls screenshots/
```

### 3. カスタムテストの実行

```bash
# 別のテストスクリプトを実行
docker compose -f docker/docker-compose.test.yml run --rm test node your-test.js
```

### Docker設定ファイル

| ファイル | 用途 |
|----------|------|
| `docker/Dockerfile.test` | テスト用イメージ（Playwright 1.57.0） |
| `docker/Dockerfile.rpa` | 本番RPA用イメージ |
| `docker/docker-compose.test.yml` | テスト実行用Compose |

### 環境変数

テスト時に利用可能な環境変数:

| 変数名 | 説明 | デフォルト |
|--------|------|------------|
| `SMARTCALL_MODE` | 動作モード | `stub` |
| `ENABLE_SCREENSHOT` | スクリーンショット有効化 | `false` |
| `SCREENSHOT_DIR` | スクリーンショット保存先 | `/app/screenshots` |

### サンプルテストコード

`test-worker.js` を参考にしてください:

```javascript
import { BrowserManager, ScreenshotManager, BasePage, createRpaLogger } from './dist/index.js';

// ページオブジェクト定義
class LoginPage extends BasePage {
  async login(username, password) {
    await this.fill('#username', username);
    await this.fill('#password', password);
    await this.click('button[type="submit"]');
    await this.page.waitForURL(/\/dashboard/, { timeout: 15000 });
  }
}

// テスト実行
async function test() {
  const logger = createRpaLogger({ jobId: 'test', queueName: 'test' });
  const browser = new BrowserManager({ headless: true });
  const screenshot = new ScreenshotManager('test', {
    directory: '/app/screenshots',
    enabled: true,
  });

  try {
    const { page } = await browser.launch();

    await page.goto('https://example.com/login');
    await screenshot.captureStep(page, '01-login-page');

    const loginPage = new LoginPage(page);
    await loginPage.login('user', 'password');
    await screenshot.captureStep(page, '02-after-login');

    console.log('✅ Test passed');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

test();
```

## 本番環境

本番環境では以下の環境変数が自動設定されます:

| 変数名 | 説明 |
|--------|------|
| `API_CONFIG_ID` | API設定ID |
| `ENVIRONMENT` | 環境（staging/production） |
| `REDIS_HOST` | Redisホスト |
| `REDIS_PORT` | Redisポート |
| `REDIS_DB` | Redis DB番号 |

## API リファレンス

### キュー/Worker

#### `createQueue<T>(queueName, options?)`

キューを作成します。

```typescript
const queue = createQueue<MyJobData>('my-queue');
await queue.add('job-name', { data: 'value' });
```

#### `createWorker<T>(queueName, processor, options?)`

Workerを作成します。

```typescript
const worker = createWorker<MyJobData>('my-queue', async (job) => {
  console.log(job.data);
});
```

#### `getConfig()`

SDK設定を取得します。

```typescript
const config = getConfig();
// { mode: 'stub', apiConfigId: 0, environment: 'staging', redis: {...} }
```

#### `isStubMode()`

スタブモードかどうかを返します。

```typescript
if (isStubMode()) {
  console.log('Running in stub mode');
}
```

### RPA ヘルパー

#### `createRpaJob<T>(queueName, handler, options?)`

RPAジョブを作成。ブラウザ管理・スクリーンショット・ログを自動化。

#### `BasePage`

ページオブジェクトの基底クラス。

#### `ScreenshotManager`

スクリーンショットの撮影・クリーンアップ管理。

#### `BrowserManager`

Playwrightブラウザのライフサイクル管理。

#### `sendCallback(url, result)`

コールバック送信（リトライ付き）。

#### `createRpaLogger(context?)`

構造化ログ出力。

## 開発者が書くコード

SDKを使うことで、開発者は以下に集中できます:

1. **ページオブジェクト**: サイト固有の画面操作
2. **ビジネスロジック**: 予約作成、キャンセル等の処理
3. **データ変換**: SmartCall形式 ↔ 外部システム形式

SDKが提供するため実装不要:
- ブラウザ起動・終了
- Redis接続管理
- キュー/Worker管理
- スクリーンショット管理
- リトライ・エラーハンドリング
- コールバック送信

## ライセンス

MIT

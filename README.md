# SmartCall RPA SDK

SmartCall RPA API開発者向けのRedis/BullMQユーティリティライブラリです。

## 特徴

- **環境変数でモード切り替え**: ローカル開発時はスタブモード、本番はRedis接続
- **シンプルなAPI**: キュー名を指定するだけで使用可能
- **型安全**: TypeScript対応、完全な型定義付き

## インストール

```bash
npm install github:milestone-corp/smartcall-rpa-sdk
```

## 動作モード

環境変数 `SMARTCALL_MODE` で制御:

| 値 | モード | 説明 |
|----|--------|------|
| `stub` / `local` / `development` | スタブモード | メモリ内キュー（Redisなし） |
| それ以外（未設定含む） | 本番モード | BullMQ + Redis |

## 使用例

### 基本的な使い方

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

### ジョブ追加

```typescript
import { syncQueue } from './queue.js';

// ジョブをキューに追加
await syncQueue.add('sync-cycle', {
  job_id: 'JOB-12345',
  external_shop_id: 'SHOP-001',
  callback_url: 'https://api.smartcall.jp/callback',
}, {
  jobId: 'JOB-12345',  // 重複防止
  attempts: 3,
  backoff: { type: 'exponential', delay: 10000 },
});
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

### `createQueue<T>(queueName, options?)`

キューを作成します。

```typescript
const queue = createQueue<MyJobData>('my-queue');
await queue.add('job-name', { data: 'value' });
```

### `createWorker<T>(queueName, processor, options?)`

Workerを作成します。

```typescript
const worker = createWorker<MyJobData>('my-queue', async (job) => {
  console.log(job.data);
});
```

### `getConfig()`

SDK設定を取得します。

```typescript
const config = getConfig();
// { mode: 'stub', apiConfigId: 0, environment: 'staging', redis: {...} }
```

### `isStubMode()`

スタブモードかどうかを返します。

```typescript
if (isStubMode()) {
  console.log('Running in stub mode');
}
```

## ライセンス

MIT

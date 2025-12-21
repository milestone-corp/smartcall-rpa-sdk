/**
 * SmartCall RPA SDK - サンプルサーバー
 *
 * sync-cycleエンドポイントでリクエストを受け取り、
 * ジョブをキューに登録するサンプルコードです。
 *
 * 実行方法:
 *   SMARTCALL_MODE=stub npx ts-node examples/server.ts
 */

import express from 'express';
import {
  createQueue,
  createSyncCycleHandler,
  addHealthCheck,
  type RpaJobData,
} from '../src/index.js';

// キューを作成（スタブモードではメモリ内キュー）
const syncQueue = createQueue<RpaJobData>('sync');

// Expressアプリを作成
const app = express();
app.use(express.json());

// ヘルスチェックエンドポイント
addHealthCheck(app);

// sync-cycleエンドポイント
// リクエストを受け取り、ジョブをキューに登録してレスポンスを返す
app.post(
  '/beautymerit/sync-cycle',
  createSyncCycleHandler(syncQueue, {
    // オプション: APIキーのバリデーション
    // validateApiKey: true,
    // expectedApiKey: process.env.API_KEY,

    // オプション: カスタムバリデーション
    customValidation: (req) => {
      // 予約操作時はreservationsが必要
      if (req.action !== 'fetch_slots' && !req.reservations?.length) {
        return 'reservations is required for reservation operations';
      }
      return null;
    },
  })
);

// サーバー起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
  console.log(`[Server] Endpoints:`);
  console.log(`  - GET  /health`);
  console.log(`  - POST /beautymerit/sync-cycle`);
});

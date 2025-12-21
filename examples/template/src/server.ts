/**
 * SmartCall RPA API サーバー
 *
 * /sync-cycle エンドポイントでリクエストを受け取り、
 * ジョブをキューに登録します。
 */

import express from 'express';
import {
  createQueue,
  createSyncCycleHandler,
  addHealthCheck,
  type RpaJobData,
} from '@smartcall/rpa-sdk';

// キューを作成
export const syncQueue = createQueue<RpaJobData>('sync');

// Expressアプリを作成
const app = express();
app.use(express.json());

// ヘルスチェックエンドポイント（必須）
addHealthCheck(app);

// sync-cycleエンドポイント
app.post(
  '/sync-cycle',
  createSyncCycleHandler(syncQueue, {
    // オプション: カスタムバリデーション
    customValidation: (req) => {
      // 必要に応じてバリデーションを追加
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
  console.log(`  - POST /sync-cycle`);
});

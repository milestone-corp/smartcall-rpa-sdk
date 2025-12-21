/**
 * サーバーヘルパーのテスト
 */
import express from 'express';
import { createQueue, createSyncCycleHandler, addHealthCheck } from './dist/index.js';

// キューを作成（スタブモードではメモリ内キュー）
const syncQueue = createQueue('sync');

// Expressアプリを作成
const app = express();
app.use(express.json());

// ヘルスチェックエンドポイント
addHealthCheck(app);

// sync-cycleエンドポイント
app.post('/beautymerit/sync-cycle', createSyncCycleHandler(syncQueue));

// サーバー起動
const PORT = 3099;
const server = app.listen(PORT, () => {
  console.log(`[Test Server] Running on port ${PORT}`);

  // テストリクエストを送信
  setTimeout(async () => {
    console.log('[Test] Sending test request...');

    try {
      const response = await fetch(`http://localhost:${PORT}/beautymerit/sync-cycle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: 'TEST-JOB-001',
          external_shop_id: 'SHOP-001',
          action: 'fetch_slots',
          callback_url: 'https://httpbin.org/post',
        }),
      });

      const result = await response.json();
      console.log('[Test] Response:', JSON.stringify(result, null, 2));

      if (result.success && result.job_id === 'TEST-JOB-001') {
        console.log('[Test] ✅ Server test PASSED');
      } else {
        console.log('[Test] ❌ Server test FAILED');
      }

      // ヘルスチェックテスト
      const healthResponse = await fetch(`http://localhost:${PORT}/health`);
      const healthResult = await healthResponse.json();
      console.log('[Test] Health check:', JSON.stringify(healthResult));

      if (healthResult.status === 'ok') {
        console.log('[Test] ✅ Health check PASSED');
      } else {
        console.log('[Test] ❌ Health check FAILED');
      }

      // バリデーションテスト（job_idなし）
      const badResponse = await fetch(`http://localhost:${PORT}/beautymerit/sync-cycle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          external_shop_id: 'SHOP-001',
        }),
      });

      const badResult = await badResponse.json();
      console.log('[Test] Validation error response:', JSON.stringify(badResult));

      if (!badResult.success && badResult.code === 'MISSING_JOB_ID') {
        console.log('[Test] ✅ Validation test PASSED');
      } else {
        console.log('[Test] ❌ Validation test FAILED');
      }

    } catch (error) {
      console.error('[Test] Error:', error.message);
    }

    // サーバーを停止
    server.close(() => {
      console.log('[Test] Server closed');
      process.exit(0);
    });
  }, 500);
});

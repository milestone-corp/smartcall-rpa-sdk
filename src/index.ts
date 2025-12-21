/**
 * SmartCall RPA SDK
 *
 * RPA API開発者向けのRedis/BullMQユーティリティライブラリ
 *
 * ## 動作モード
 *
 * 環境変数 `SMARTCALL_MODE` で制御:
 * - `stub` / `local` / `development`: スタブモード（メモリキュー、Redisなし）
 * - それ以外（または未設定）: 本番モード（BullMQ + Redis）
 *
 * ## 使用例
 *
 * ```typescript
 * import { createQueue, createWorker, getConfig } from '@smartcall/rpa-sdk';
 *
 * // 設定確認
 * const config = getConfig();
 * console.log(`Mode: ${config.mode}`);
 *
 * // キュー作成
 * const syncQueue = createQueue<MySyncData>('sync');
 *
 * // Worker作成
 * const worker = createWorker<MySyncData>('sync', async (job) => {
 *   console.log(`Processing: ${job.id}`);
 * });
 * ```
 *
 * @packageDocumentation
 */

import { isStubMode, getConfig, getMode, logConfig } from './config.js';
import {
  createProductionQueue,
  createProductionWorker,
  createProductionRedisConnection,
  getProductionSharedConnection,
  closeProductionSharedConnection,
  updateProductionProgress,
} from './production.js';
import { createStubQueue, createStubWorker, createStubRedisConnection } from './stub.js';
import type {
  SmartCallQueueOptions,
  SmartCallWorkerOptions,
  SmartCallRedisOptions,
  JobProcessor,
  SmartCallConfig,
} from './types.js';
import type { Queue, Worker, Job } from 'bullmq';
import type { Redis } from 'ioredis';

/**
 * キューを作成
 *
 * 環境変数 SMARTCALL_MODE に基づいて、本番キューまたはスタブキューを返します。
 *
 * @param queueName - キュー名
 * @param options - キューオプション
 * @returns キューインスタンス
 */
export function createQueue<T = unknown>(
  queueName: string,
  options: SmartCallQueueOptions = {}
): Queue<T> {
  if (isStubMode()) {
    return createStubQueue<T>(queueName) as unknown as Queue<T>;
  }
  return createProductionQueue<T>(queueName, options);
}

/**
 * Workerを作成
 *
 * 環境変数 SMARTCALL_MODE に基づいて、本番Workerまたはスタブワーカーを返します。
 *
 * @param queueName - 監視するキュー名
 * @param processor - ジョブ処理関数
 * @param options - Workerオプション
 * @returns Workerインスタンス
 */
export function createWorker<T = unknown, R = unknown>(
  queueName: string,
  processor: JobProcessor<T, R>,
  options: SmartCallWorkerOptions = {}
): Worker<T, R> {
  if (isStubMode()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return createStubWorker<T>(queueName, processor as any) as unknown as Worker<T, R>;
  }
  return createProductionWorker<T, R>(queueName, processor, options);
}

/**
 * Redis接続を作成
 *
 * @param options - Redis接続オプション
 * @returns Redis接続インスタンス
 */
export function createRedisConnection(options: SmartCallRedisOptions = {}): Redis {
  if (isStubMode()) {
    return createStubRedisConnection() as unknown as Redis;
  }
  return createProductionRedisConnection(options);
}

/**
 * 共有Redis接続を取得（シングルトン）
 */
export function getSharedConnection(): Redis {
  if (isStubMode()) {
    return createStubRedisConnection() as unknown as Redis;
  }
  return getProductionSharedConnection();
}

/**
 * 共有接続を閉じる
 */
export async function closeSharedConnection(): Promise<void> {
  if (!isStubMode()) {
    await closeProductionSharedConnection();
  }
}

/**
 * ジョブの進捗を更新
 */
export async function updateProgress<T>(job: Job<T>, progress: number | object): Promise<void> {
  if (isStubMode()) {
    // スタブモードでは何もしない
    return;
  }
  await updateProductionProgress(job, progress);
}

// Re-export configuration functions
export { getConfig, getMode, isStubMode, logConfig };

// Re-export types
export type {
  SmartCallConfig,
  SmartCallQueueOptions,
  SmartCallWorkerOptions,
  SmartCallRedisOptions,
  JobProcessor,
  Job,
} from './types.js';

// RPA Helpers (optional, import from '@smartcall/rpa-sdk/rpa')
export * from './rpa/index.js';

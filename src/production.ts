/**
 * SmartCall RPA SDK - Production Implementation
 *
 * BullMQ + Redis を使用した本番用実装
 */

import { Redis } from 'ioredis';
import { Queue, Worker, Job } from 'bullmq';
import { getConfig } from './config.js';
import type { SmartCallRedisOptions, SmartCallQueueOptions, SmartCallWorkerOptions, JobProcessor } from './types.js';

// シングルトン接続インスタンス
let sharedConnection: Redis | null = null;

/**
 * Redis接続を作成
 */
export function createProductionRedisConnection(options: SmartCallRedisOptions = {}): Redis {
  const config = getConfig();

  const redis = new Redis({
    host: options.host ?? config.redis.host,
    port: options.port ?? config.redis.port,
    db: options.db ?? config.redis.db,
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
    lazyConnect: true,
    retryStrategy: (times: number) => {
      if (times > 10) {
        return null;
      }
      return Math.min(times * 100, 3000);
    },
  });

  redis.on('error', (err) => {
    console.error('[SmartCall SDK] Redis connection error:', err.message);
  });

  redis.on('connect', () => {
    console.log(
      `[SmartCall SDK] Redis connected: ${config.redis.host}:${config.redis.port} DB=${options.db ?? config.redis.db}`
    );
  });

  return redis;
}

/**
 * 共有Redis接続を取得（シングルトン）
 */
export function getProductionSharedConnection(): Redis {
  if (!sharedConnection) {
    sharedConnection = createProductionRedisConnection();
  }
  return sharedConnection;
}

/**
 * 共有接続を閉じる
 */
export async function closeProductionSharedConnection(): Promise<void> {
  if (sharedConnection) {
    await sharedConnection.quit();
    sharedConnection = null;
    console.log('[SmartCall SDK] Redis connection closed');
  }
}

/**
 * BullMQキューを作成
 */
export function createProductionQueue<T = unknown>(
  queueName: string,
  options: SmartCallQueueOptions = {}
): Queue<T> {
  const connection = getProductionSharedConnection();

  const defaultJobOptions = {
    removeOnComplete: 50,
    removeOnFail: 100,
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 5000,
    },
  };

  console.log(`[SmartCall SDK] Queue created: ${queueName}`);

  return new Queue<T>(queueName, {
    connection,
    defaultJobOptions: {
      ...defaultJobOptions,
      ...options.defaultJobOptions,
    },
    ...options,
  });
}

/**
 * BullMQ Workerを作成
 */
export function createProductionWorker<T = unknown, R = unknown>(
  queueName: string,
  processor: JobProcessor<T, R>,
  options: SmartCallWorkerOptions = {}
): Worker<T, R> {
  const connection = getProductionSharedConnection();

  const worker = new Worker<T, R>(queueName, processor, {
    connection,
    concurrency: options.concurrency ?? 2,
    limiter: options.limiter ?? {
      max: 10,
      duration: 1000,
    },
    ...options,
  });

  worker.on('ready', () => {
    console.log(`[SmartCall SDK] Worker ready: ${queueName}`);
  });

  worker.on('error', (err) => {
    console.error(`[SmartCall SDK] Worker error (${queueName}):`, err.message);
  });

  return worker;
}

/**
 * ジョブの進捗を更新
 */
export async function updateProductionProgress<T>(
  job: Job<T>,
  progress: number | object
): Promise<void> {
  await job.updateProgress(progress);
}

/**
 * SmartCall RPA SDK - Stub Implementation
 *
 * ローカル開発用のメモリ内キュー実装
 * Redisなしで動作し、本番SDKと同じAPIを提供
 */

import type { StubJob, StubQueue, StubWorker } from './types.js';

// スタブ用の簡易プロセッサー型
type StubProcessor<T> = (job: StubJob<T>) => Promise<unknown>;

// メモリ内ジョブストレージ
const jobQueues: Map<string, StubJob<unknown>[]> = new Map();
const workers: Map<string, StubProcessor<unknown>> = new Map();
const eventHandlers: Map<string, Map<string, ((...args: unknown[]) => void)[]>> = new Map();

let jobIdCounter = 0;

/**
 * スタブ用ジョブを作成
 */
function createStubJob<T>(name: string, data: T, opts: Record<string, unknown> = {}): StubJob<T> {
  const id = `stub-job-${++jobIdCounter}`;
  return {
    id,
    name,
    data,
    opts,
    progress: 0,
    async updateProgress(progress: number | object): Promise<void> {
      this.progress = progress;
    },
  };
}

/**
 * ワーカーイベントを発火
 */
function emitWorkerEvent(queueName: string, event: string, ...args: unknown[]): void {
  const handlers = eventHandlers.get(queueName)?.get(event) || [];
  handlers.forEach((handler) => {
    try {
      handler(...args);
    } catch (e) {
      console.error(`[SmartCall SDK Stub] Event handler error:`, e);
    }
  });
}

/**
 * スタブキューを作成
 */
export function createStubQueue<T = unknown>(queueName: string): StubQueue<T> {
  if (!jobQueues.has(queueName)) {
    jobQueues.set(queueName, []);
  }

  console.log(`[SmartCall SDK Stub] Queue created: ${queueName}`);

  return {
    name: queueName,

    async add(name: string, data: T, opts: Record<string, unknown> = {}): Promise<StubJob<T>> {
      const job = createStubJob(name, data, opts);
      jobQueues.get(queueName)!.push(job as StubJob<unknown>);

      console.log(`[SmartCall SDK Stub] Job added: ${job.id} (${name})`);

      // ワーカーが登録されていれば即座に処理
      const processor = workers.get(queueName);
      if (processor) {
        setImmediate(async () => {
          try {
            await processor(job as StubJob<unknown>);
            emitWorkerEvent(queueName, 'completed', job);
            console.log(`[SmartCall SDK Stub] Job completed: ${job.id}`);
          } catch (error) {
            emitWorkerEvent(queueName, 'failed', job, error);
            console.error(`[SmartCall SDK Stub] Job failed: ${job.id}`, error);
          }
        });
      }

      return job;
    },

    async close(): Promise<void> {
      jobQueues.delete(queueName);
      console.log(`[SmartCall SDK Stub] Queue closed: ${queueName}`);
    },
  };
}

/**
 * スタブワーカーを作成
 */
export function createStubWorker<T = unknown>(
  queueName: string,
  processor: StubProcessor<T>
): StubWorker<T> {
  workers.set(queueName, processor as StubProcessor<unknown>);
  eventHandlers.set(queueName, new Map());

  console.log(`[SmartCall SDK Stub] Worker created: ${queueName}`);

  // 既存のジョブがあれば処理
  const pendingJobs = jobQueues.get(queueName) || [];
  pendingJobs.forEach((job) => {
    setImmediate(async () => {
      try {
        await processor(job as StubJob<T>);
        emitWorkerEvent(queueName, 'completed', job);
      } catch (error) {
        emitWorkerEvent(queueName, 'failed', job, error);
      }
    });
  });

  return {
    name: queueName,

    on(event: string, callback: (...args: unknown[]) => void): void {
      const queueHandlers = eventHandlers.get(queueName)!;
      if (!queueHandlers.has(event)) {
        queueHandlers.set(event, []);
      }
      queueHandlers.get(event)!.push(callback);
    },

    async close(): Promise<void> {
      workers.delete(queueName);
      eventHandlers.delete(queueName);
      console.log(`[SmartCall SDK Stub] Worker closed: ${queueName}`);
    },
  };
}

/**
 * スタブRedis接続（何もしない）
 */
export function createStubRedisConnection(): {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<string>;
  del: (key: string) => Promise<number>;
  quit: () => Promise<string>;
} {
  const storage = new Map<string, string>();

  console.log('[SmartCall SDK Stub] Redis connection created (in-memory)');

  return {
    async get(key: string): Promise<string | null> {
      return storage.get(key) || null;
    },
    async set(key: string, value: string): Promise<string> {
      storage.set(key, value);
      return 'OK';
    },
    async del(key: string): Promise<number> {
      return storage.delete(key) ? 1 : 0;
    },
    async quit(): Promise<string> {
      storage.clear();
      return 'OK';
    },
  };
}

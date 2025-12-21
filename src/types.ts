/**
 * SmartCall RPA SDK Type Definitions
 */

import type { QueueOptions, WorkerOptions, Job } from 'bullmq';

/**
 * SDK動作モード
 * - production: 本番モード（BullMQ + Redis）
 * - stub: スタブモード（メモリ内キュー、Redisなしで動作）
 */
export type SDKMode = 'production' | 'stub';

/**
 * Redis接続オプション
 */
export interface SmartCallRedisOptions {
  /** Redis DB番号をオーバーライド */
  db?: number;
  /** Redisホスト */
  host?: string;
  /** Redisポート */
  port?: number;
}

/**
 * キュー作成オプション
 */
export interface SmartCallQueueOptions extends Partial<QueueOptions> {
  /** デフォルトジョブオプション */
  defaultJobOptions?: {
    removeOnComplete?: number | boolean;
    removeOnFail?: number | boolean;
    attempts?: number;
    backoff?: {
      type: 'fixed' | 'exponential';
      delay: number;
    };
  };
}

/**
 * Worker作成オプション
 */
export interface SmartCallWorkerOptions extends Partial<WorkerOptions> {
  /** 並列処理数 */
  concurrency?: number;
  /** レート制限 */
  limiter?: {
    max: number;
    duration: number;
  };
}

/**
 * ジョブプロセッサー関数の型
 */
export type JobProcessor<T = unknown, R = unknown> = (job: Job<T>) => Promise<R>;

/**
 * SDK設定情報
 */
export interface SmartCallConfig {
  /** SDK動作モード */
  mode: SDKMode;
  /** API設定ID */
  apiConfigId: number;
  /** 環境（staging/production） */
  environment: string;
  /** Redis接続情報 */
  redis: {
    host: string;
    port: number;
    db: number;
  };
}

/**
 * スタブ用のジョブインターフェース
 */
export interface StubJob<T = unknown> {
  id: string;
  name: string;
  data: T;
  opts: Record<string, unknown>;
  progress: number | object;
  updateProgress(progress: number | object): Promise<void>;
}

/**
 * スタブ用のキューインターフェース
 */
export interface StubQueue<T = unknown> {
  name: string;
  add(name: string, data: T, opts?: Record<string, unknown>): Promise<StubJob<T>>;
  close(): Promise<void>;
}

/**
 * スタブ用のWorkerインターフェース
 */
export interface StubWorker<T = unknown> {
  name: string;
  on(event: string, callback: (...args: unknown[]) => void): void;
  close(): Promise<void>;
}

// Re-export Job type
export type { Job } from 'bullmq';

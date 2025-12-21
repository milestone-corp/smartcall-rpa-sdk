/**
 * SmartCall RPA SDK - Express Server Helper
 *
 * sync-cycleエンドポイントの共通処理を提供
 * リクエストのバリデーション、ジョブ登録、レスポンス返却を自動化
 */

import type { Request, Response, NextFunction, RequestHandler, Application } from 'express';
import type { Queue } from 'bullmq';

/**
 * 予約データの型（API仕様準拠）
 */
export interface ReservationRequest {
  /** SmartCall側の予約ID */
  reservation_id: string;
  /** 操作種別: create / cancel */
  operation: 'create' | 'cancel';
  /** 予約日（YYYY-MM-DD） */
  date: string;
  /** 予約時刻（HH:MM） */
  time: string;
  /** 所要時間（分）デフォルト: 30 */
  duration_min?: number;
  /** 顧客名 */
  customer_name: string;
  /** 顧客電話番号 */
  customer_phone: string;
  /** 人数 デフォルト: 1 */
  party_size?: number;
  /** メニュー名 */
  menu_name?: string;
  /** 備考 */
  notes?: string;
}

/**
 * sync-cycleリクエストボディの型（API仕様準拠）
 */
export interface SyncCycleRequest {
  /** ジョブID（UUID形式） */
  job_id: string;
  /** 予約システム側の店舗ID */
  external_shop_id: string;
  /** 結果通知先URL */
  callback_url: string;
  /** 同期開始日（YYYY-MM-DD）デフォルト: 当日 */
  date_from?: string;
  /** 同期終了日（YYYY-MM-DD）デフォルト: 7日後 */
  date_to?: string;
  /** 予約操作リスト */
  reservations?: ReservationRequest[];
  /** その他のカスタムフィールド */
  [key: string]: unknown;
}

/**
 * ジョブデータの型（キューに追加されるデータ）
 */
export interface RpaJobData extends SyncCycleRequest {
  /** コールバックURL（必須化） */
  callback_url: string;
  /** リクエスト受信時刻 */
  received_at: string;
}

/**
 * sync-cycleレスポンスの型
 */
export interface SyncCycleResponse {
  success: boolean;
  message: string;
  job_id: string;
}

/**
 * エラーレスポンスの型
 */
export interface ErrorResponse {
  success: false;
  error: string;
  code: string;
}

/**
 * サーバーオプション
 */
export interface RpaServerOptions {
  /** APIキーのバリデーションを行うか（デフォルト: false） */
  validateApiKey?: boolean;
  /** 期待するAPIキー（validateApiKey=true時に必要） */
  expectedApiKey?: string;
  /** カスタムバリデーション関数 */
  customValidation?: (req: SyncCycleRequest) => string | null;
  /** ジョブオプション */
  jobOptions?: {
    attempts?: number;
    backoff?: { type: 'exponential' | 'fixed'; delay: number };
  };
}

/**
 * sync-cycleエンドポイントのミドルウェアを作成
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { createSyncCycleHandler } from '@smartcall/rpa-sdk/rpa';
 * import { syncQueue } from './queue';
 *
 * const app = express();
 * app.use(express.json());
 *
 * // sync-cycleエンドポイントを登録
 * app.post('/beautymerit/sync-cycle', createSyncCycleHandler(syncQueue));
 *
 * app.listen(3000);
 * ```
 */
export function createSyncCycleHandler<T extends SyncCycleRequest = SyncCycleRequest>(
  queue: Queue<RpaJobData>,
  options: RpaServerOptions = {}
): RequestHandler {
  const {
    validateApiKey = false,
    expectedApiKey,
    customValidation,
    jobOptions = {
      attempts: 3,
      backoff: { type: 'exponential', delay: 10000 },
    },
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const requestId = `req-${Date.now()}`;
    const startTime = Date.now();

    // リクエストログ出力
    console.log(`[SmartCall SDK] [${requestId}] === REQUEST RECEIVED ===`);
    console.log(`[SmartCall SDK] [${requestId}] Method: ${req.method} ${req.path}`);
    console.log(`[SmartCall SDK] [${requestId}] Headers: ${JSON.stringify({
      'content-type': req.headers['content-type'],
      'x-api-key': req.headers['x-api-key'] ? '[MASKED]' : undefined,
      'x-callback-url': req.headers['x-callback-url'],
    })}`);
    console.log(`[SmartCall SDK] [${requestId}] Body: ${JSON.stringify(req.body)}`);

    // レスポンスログ用ヘルパー
    const logResponse = (statusCode: number, body: object) => {
      const duration = Date.now() - startTime;
      console.log(`[SmartCall SDK] [${requestId}] === RESPONSE SENT ===`);
      console.log(`[SmartCall SDK] [${requestId}] Status: ${statusCode}`);
      console.log(`[SmartCall SDK] [${requestId}] Body: ${JSON.stringify(body)}`);
      console.log(`[SmartCall SDK] [${requestId}] Duration: ${duration}ms`);
    };

    try {
      // APIキーのバリデーション
      if (validateApiKey) {
        const apiKey = req.headers['x-api-key'] as string;
        if (!apiKey || apiKey !== expectedApiKey) {
          const errorBody = {
            success: false,
            error: 'Invalid or missing API key',
            code: 'INVALID_API_KEY',
          } as ErrorResponse;
          logResponse(401, errorBody);
          res.status(401).json(errorBody);
          return;
        }
      }

      const body = req.body as T;

      // 必須フィールドのバリデーション
      if (!body.job_id) {
        const errorBody = {
          success: false,
          error: 'job_id is required',
          code: 'MISSING_JOB_ID',
        } as ErrorResponse;
        logResponse(400, errorBody);
        res.status(400).json(errorBody);
        return;
      }

      if (!body.external_shop_id) {
        const errorBody = {
          success: false,
          error: 'external_shop_id is required',
          code: 'MISSING_EXTERNAL_SHOP_ID',
        } as ErrorResponse;
        logResponse(400, errorBody);
        res.status(400).json(errorBody);
        return;
      }

      // カスタムバリデーション
      if (customValidation) {
        const validationError = customValidation(body);
        if (validationError) {
          const errorBody = {
            success: false,
            error: validationError,
            code: 'VALIDATION_ERROR',
          } as ErrorResponse;
          logResponse(400, errorBody);
          res.status(400).json(errorBody);
          return;
        }
      }

      // コールバックURLの取得（ヘッダーまたはボディから）
      const callbackUrl =
        (req.headers['x-callback-url'] as string) || body.callback_url || '';

      // ジョブデータを構築
      const jobData: RpaJobData = {
        ...body,
        callback_url: callbackUrl,
        received_at: new Date().toISOString(),
      };

      // ジョブをキューに追加
      await queue.add('sync-cycle', jobData, {
        jobId: body.job_id, // 重複防止
        ...jobOptions,
      });

      // 成功レスポンス
      const successBody = {
        success: true,
        message: 'Request accepted',
        job_id: body.job_id,
      } as SyncCycleResponse;
      logResponse(200, successBody);
      res.json(successBody);
    } catch (error) {
      // エラーハンドリング
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 重複ジョブの場合
      if (errorMessage.includes('Job with id') && errorMessage.includes('already exists')) {
        const errorBody = {
          success: false,
          error: 'Job already exists',
          code: 'DUPLICATE_JOB',
        } as ErrorResponse;
        logResponse(409, errorBody);
        res.status(409).json(errorBody);
        return;
      }

      console.error(`[SmartCall SDK] [${requestId}] Error in sync-cycle handler:`, errorMessage);
      const errorBody = {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      } as ErrorResponse;
      logResponse(500, errorBody);
      res.status(500).json(errorBody);
    }
  };
}

/**
 * ヘルスチェックエンドポイントを追加
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { addHealthCheck } from '@smartcall/rpa-sdk/rpa';
 *
 * const app = express();
 * addHealthCheck(app);
 * ```
 */
export function addHealthCheck(app: Application, path: string = '/health'): void {
  app.get(path, (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });
}

/**
 * 基本的なRPAサーバーをセットアップ
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { setupRpaServer } from '@smartcall/rpa-sdk/rpa';
 * import { syncQueue } from './queue';
 *
 * const app = express();
 *
 * setupRpaServer(app, {
 *   queue: syncQueue,
 *   endpointPath: '/beautymerit/sync-cycle',
 * });
 *
 * app.listen(3000);
 * ```
 */
export function setupRpaServer(
  app: Application,
  config: {
    queue: Queue<RpaJobData>;
    endpointPath: string;
    options?: RpaServerOptions;
  }
): void {
  const { queue, endpointPath, options } = config;

  // JSONパーサー（既に設定されている場合は重複しないように注意）
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.headers['content-type']?.includes('application/json') && !req.body) {
      let data = '';
      req.on('data', (chunk: Buffer | string) => (data += chunk));
      req.on('end', () => {
        try {
          req.body = JSON.parse(data);
          next();
        } catch {
          res.status(400).json({ success: false, error: 'Invalid JSON', code: 'INVALID_JSON' });
        }
      });
    } else {
      next();
    }
  });

  // ヘルスチェック
  addHealthCheck(app);

  // sync-cycleエンドポイント
  app.post(endpointPath, createSyncCycleHandler(queue, options));
}

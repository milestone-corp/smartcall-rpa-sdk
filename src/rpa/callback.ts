/**
 * SmartCall RPA SDK - Callback Helper
 *
 * 処理結果をSmartCallに送信するためのヘルパー
 */

export interface CallbackOptions {
  /** タイムアウト（ms） */
  timeout?: number;
  /** リトライ回数 */
  retries?: number;
  /** リトライ間隔（ms） */
  retryDelay?: number;
}

/**
 * 予約操作結果の詳細
 */
export interface ReservationResultDetail {
  /** 結果: success / failed */
  status: 'success' | 'failed';
  /** 予約システム側の予約ID（成功時） */
  external_reservation_id?: string;
  /** エラーコード（失敗時） */
  error_code?: string | null;
  /** エラーメッセージ（失敗時） */
  error_message?: string | null;
}

/**
 * 予約操作結果の型（API仕様準拠）
 */
export interface ReservationResult {
  /** SmartCall側の予約ID */
  reservation_id: string;
  /** 操作種別: create / update / cancel */
  operation: 'create' | 'update' | 'cancel';
  /** 結果オブジェクト */
  result: ReservationResultDetail;
}

/**
 * 空き枠情報の型（API仕様準拠）
 */
export interface AvailableSlot {
  /** 日付（YYYY-MM-DD） */
  date: string;
  /** 時刻（HH:MM） */
  time: string;
  /** 所要時間（分） */
  duration_min: number;
  /** 空き枠数 */
  stock: number;
  /** リソース名（担当者名など） */
  resource_name?: string;
}

/**
 * エラー情報の型（API仕様準拠）
 */
export interface CallbackError {
  /** エラーコード */
  code: string;
  /** エラーメッセージ */
  message: string;
}

/**
 * コールバック結果の型（API仕様準拠）
 */
export interface CallbackResult {
  /** 対応するジョブID */
  job_id: string;
  /** 店舗ID */
  external_shop_id: string;
  /** 同期完了日時（ISO 8601形式） */
  synced_at: string;
  /** 予約操作結果リスト */
  reservation_results: ReservationResult[];
  /** 予約一覧（現在は空配列を返す） */
  reservations: unknown[];
  /** 空き枠情報 */
  available_slots: AvailableSlot[];
  /** エラー情報 */
  error?: CallbackError;
  /** その他のカスタムフィールド */
  [key: string]: unknown;
}

/**
 * コールバックを送信
 *
 * @param callbackUrl コールバックURL
 * @param result 処理結果
 * @param options オプション
 */
export async function sendCallback(
  callbackUrl: string,
  result: CallbackResult,
  options: CallbackOptions = {}
): Promise<void> {
  const { timeout = 30000, retries = 3, retryDelay = 1000 } = options;
  const callbackId = `cb-${Date.now()}`;
  const startTime = Date.now();

  // コールバックリクエストログ
  console.log(`[SmartCall SDK] [${callbackId}] === CALLBACK REQUEST ===`);
  console.log(`[SmartCall SDK] [${callbackId}] URL: ${callbackUrl}`);
  console.log(`[SmartCall SDK] [${callbackId}] JobID: ${result.job_id}`);
  console.log(`[SmartCall SDK] [${callbackId}] Body: ${JSON.stringify(result)}`);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(callbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(result),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // レスポンスボディを取得
      let responseBody: string;
      try {
        responseBody = await response.text();
      } catch {
        responseBody = '[Unable to read response body]';
      }

      const duration = Date.now() - startTime;

      if (!response.ok) {
        console.log(`[SmartCall SDK] [${callbackId}] === CALLBACK RESPONSE (ERROR) ===`);
        console.log(`[SmartCall SDK] [${callbackId}] Status: ${response.status} ${response.statusText}`);
        console.log(`[SmartCall SDK] [${callbackId}] Body: ${responseBody}`);
        console.log(`[SmartCall SDK] [${callbackId}] Duration: ${duration}ms`);
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }

      // 成功ログ
      console.log(`[SmartCall SDK] [${callbackId}] === CALLBACK RESPONSE (SUCCESS) ===`);
      console.log(`[SmartCall SDK] [${callbackId}] Status: ${response.status}`);
      console.log(`[SmartCall SDK] [${callbackId}] Body: ${responseBody}`);
      console.log(`[SmartCall SDK] [${callbackId}] Duration: ${duration}ms`);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(
        `[SmartCall SDK] [${callbackId}] Callback attempt ${attempt + 1}/${retries + 1} failed:`,
        lastError.message
      );

      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }
  }

  const duration = Date.now() - startTime;
  console.error(`[SmartCall SDK] [${callbackId}] Callback failed after all retries (${duration}ms):`, lastError?.message);
  throw lastError;
}

/**
 * コールバック結果を構築するヘルパー
 *
 * @param jobId ジョブID
 * @param externalShopId 店舗ID
 * @param status ジョブ全体のステータス（後方互換性のため残すが、CallbackResultには含まれない）
 * @param data 追加データ
 */
export function buildCallbackResult(
  jobId: string,
  externalShopId: string,
  _status: 'success' | 'partial_success' | 'failed',
  data: Partial<Omit<CallbackResult, 'job_id' | 'external_shop_id' | 'synced_at'>> = {}
): CallbackResult {
  return {
    job_id: jobId,
    external_shop_id: externalShopId,
    synced_at: new Date().toISOString(),
    reservation_results: [],
    reservations: [],
    available_slots: [],
    ...data,
  };
}

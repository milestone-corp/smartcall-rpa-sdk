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

export interface CallbackResult {
  job_id: string;
  external_shop_id: string;
  synced_at: string;
  reservation_results?: Array<{
    reservation_id: string;
    operation: 'create' | 'cancel';
    result: {
      status: 'success' | 'conflict' | 'failed';
      external_reservation_id?: string;
      error_code?: string | null;
      error_message?: string | null;
    };
  }>;
  reservations?: unknown[];
  available_slots?: Array<{
    date: string;
    time: string;
    stock: number;
    duration_min: number;
    resource_name?: string;
  }>;
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

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }

      console.log(`[SmartCall SDK] Callback sent successfully: ${result.job_id}`);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(
        `[SmartCall SDK] Callback attempt ${attempt + 1}/${retries + 1} failed:`,
        lastError.message
      );

      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }
  }

  console.error('[SmartCall SDK] Callback failed after all retries:', lastError?.message);
  throw lastError;
}

/**
 * コールバック結果を構築するヘルパー
 */
export function buildCallbackResult(
  jobId: string,
  externalShopId: string,
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

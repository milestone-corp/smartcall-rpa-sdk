/**
 * SmartCall RPA SDK - Configuration
 */

import type { SDKMode, SmartCallConfig } from './types.js';

/**
 * SDK動作モードを取得
 *
 * 環境変数 SMARTCALL_MODE で制御:
 * - 'stub' または 'local': スタブモード（メモリキュー）
 * - それ以外: 本番モード（BullMQ + Redis）
 */
export function getMode(): SDKMode {
  const mode = process.env.SMARTCALL_MODE?.toLowerCase();
  if (mode === 'stub' || mode === 'local' || mode === 'development') {
    return 'stub';
  }
  return 'production';
}

/**
 * スタブモードかどうか
 */
export function isStubMode(): boolean {
  return getMode() === 'stub';
}

/**
 * SDK設定を取得
 */
export function getConfig(): SmartCallConfig {
  const mode = getMode();
  const apiConfigId = parseInt(process.env.API_CONFIG_ID || '0', 10);
  const environment = process.env.ENVIRONMENT || 'staging';
  const redisHost = process.env.REDIS_HOST || '192.168.20.70';
  const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
  const redisDb = parseInt(process.env.REDIS_DB || String(apiConfigId), 10);

  return {
    mode,
    apiConfigId,
    environment,
    redis: {
      host: redisHost,
      port: redisPort,
      db: redisDb,
    },
  };
}

/**
 * 設定をログ出力
 */
export function logConfig(): void {
  const config = getConfig();
  console.log('[SmartCall SDK] Configuration:');
  console.log(`  Mode: ${config.mode}`);
  console.log(`  API Config ID: ${config.apiConfigId}`);
  console.log(`  Environment: ${config.environment}`);
  if (config.mode === 'production') {
    console.log(`  Redis: ${config.redis.host}:${config.redis.port} DB=${config.redis.db}`);
  } else {
    console.log('  Redis: (stub mode - using in-memory queue)');
  }
}

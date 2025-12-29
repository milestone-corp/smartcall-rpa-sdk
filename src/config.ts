/**
 * SmartCall RPA SDK - Configuration
 * v2.0 - Real-time RPA patterns (no Redis/BullMQ)
 */

import type { SmartCallConfig } from './types.js';

/**
 * SDK設定を取得
 */
export function getConfig(): SmartCallConfig {
  const apiConfigId = parseInt(process.env.API_CONFIG_ID || '0', 10);
  const environment = process.env.ENVIRONMENT || 'staging';

  return {
    apiConfigId,
    environment,
  };
}

/**
 * 設定をログ出力
 */
export function logConfig(): void {
  const config = getConfig();
  console.log('[SmartCall SDK] Configuration:');
  console.log(`  API Config ID: ${config.apiConfigId}`);
  console.log(`  Environment: ${config.environment}`);
}

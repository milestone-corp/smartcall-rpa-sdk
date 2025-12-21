/**
 * SmartCall RPA SDK - Credentials Helper
 *
 * 環境変数から認証情報を取得するヘルパー
 * デプロイ時にdocker-compose.ymlで設定された環境変数を読み取ります
 */

export interface RpaCredentials {
  /** ログインID */
  loginKey: string;
  /** ログインパスワード */
  loginPassword: string;
  /** その他のカスタムクレデンシャル */
  [key: string]: string | undefined;
}

/**
 * 環境変数から認証情報を取得
 *
 * デプロイ時に設定される環境変数:
 * - LOGIN_KEY: ログインID
 * - LOGIN_PASSWORD: ログインパスワード
 *
 * @returns 認証情報オブジェクト
 * @throws ログイン情報が未設定の場合はエラー
 *
 * @example
 * ```typescript
 * import { getCredentials } from '@smartcall/rpa-sdk';
 *
 * const { loginKey, loginPassword } = getCredentials();
 * await loginPage.login(loginKey, loginPassword);
 * ```
 */
export function getCredentials(): RpaCredentials {
  const loginKey = process.env.LOGIN_KEY;
  const loginPassword = process.env.LOGIN_PASSWORD;

  if (!loginKey || !loginPassword) {
    throw new Error(
      '[SmartCall SDK] LOGIN_KEY and LOGIN_PASSWORD environment variables are required. ' +
      'Make sure credentials are configured in the Developer Portal.'
    );
  }

  return {
    loginKey,
    loginPassword,
  };
}

/**
 * 環境変数から認証情報を取得（オプショナル版）
 *
 * ローカル開発時など、認証情報がない場合でもエラーにならない
 *
 * @returns 認証情報オブジェクト（未設定の場合はundefined）
 *
 * @example
 * ```typescript
 * const creds = getOptionalCredentials();
 * if (creds) {
 *   await loginPage.login(creds.loginKey, creds.loginPassword);
 * } else {
 *   console.log('Credentials not configured, using default');
 * }
 * ```
 */
export function getOptionalCredentials(): RpaCredentials | null {
  const loginKey = process.env.LOGIN_KEY;
  const loginPassword = process.env.LOGIN_PASSWORD;

  if (!loginKey || !loginPassword) {
    return null;
  }

  return {
    loginKey,
    loginPassword,
  };
}

/**
 * カスタム認証情報を取得
 *
 * 標準のログイン情報以外に追加の認証情報が必要な場合に使用
 *
 * @param envVarName 環境変数名
 * @returns 認証情報の値
 *
 * @example
 * ```typescript
 * const apiToken = getCustomCredential('API_TOKEN');
 * const secretKey = getCustomCredential('SECRET_KEY');
 * ```
 */
export function getCustomCredential(envVarName: string): string | undefined {
  return process.env[envVarName];
}

/**
 * 認証情報が設定されているか確認
 */
export function hasCredentials(): boolean {
  return !!(process.env.LOGIN_KEY && process.env.LOGIN_PASSWORD);
}

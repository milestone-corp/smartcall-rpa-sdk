/**
 * SmartCall RPA SDK - Logger
 *
 * 構造化ログ出力（pino風インターフェース）
 */

export interface RpaLogger {
  info(message: string): void;
  info(obj: object, message: string): void;
  warn(message: string): void;
  warn(obj: object, message: string): void;
  error(message: string): void;
  error(obj: object, message: string): void;
  debug(message: string): void;
  debug(obj: object, message: string): void;
  child(bindings: object): RpaLogger;
}

/**
 * RPA用ロガーを作成
 *
 * 開発時はconsole、本番時はpino互換の構造化ログを出力
 */
export function createRpaLogger(context: object = {}): RpaLogger {
  const bindings = context;

  const formatMessage = (level: string, args: unknown[]): void => {
    const timestamp = new Date().toISOString();
    let obj: object = {};
    let message: string;

    if (args.length === 1) {
      message = String(args[0]);
    } else if (args.length >= 2 && typeof args[0] === 'object') {
      obj = args[0] as object;
      message = String(args[1]);
    } else {
      message = args.map(String).join(' ');
    }

    const logData = {
      level,
      time: timestamp,
      ...bindings,
      ...obj,
      msg: message,
    };

    // JSON形式で出力（本番環境向け）
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(logData));
    } else {
      // 開発環境向け：読みやすい形式
      const prefix = Object.keys(bindings).length > 0
        ? `[${Object.entries(bindings).map(([k, v]) => `${k}=${v}`).join(' ')}]`
        : '';
      const extra = Object.keys(obj).length > 0
        ? ` ${JSON.stringify(obj)}`
        : '';
      console.log(`${timestamp} ${level.toUpperCase()} ${prefix} ${message}${extra}`);
    }
  };

  return {
    info(...args: unknown[]) {
      formatMessage('info', args);
    },
    warn(...args: unknown[]) {
      formatMessage('warn', args);
    },
    error(...args: unknown[]) {
      formatMessage('error', args);
    },
    debug(...args: unknown[]) {
      if (process.env.DEBUG === 'true' || process.env.LOG_LEVEL === 'debug') {
        formatMessage('debug', args);
      }
    },
    child(newBindings: object): RpaLogger {
      return createRpaLogger({ ...bindings, ...newBindings });
    },
  };
}

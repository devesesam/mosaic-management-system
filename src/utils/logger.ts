type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL = (import.meta.env.VITE_LOG_LEVEL || 'warn') as LogLevel;
const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];

const shouldLog = (level: LogLevel): boolean => {
  return levels.indexOf(level) >= levels.indexOf(LOG_LEVEL);
};

export const logger = {
  debug: (msg: string, ...args: unknown[]): void => {
    if (shouldLog('debug')) {
      console.log(`[DEBUG] ${msg}`, ...args);
    }
  },
  info: (msg: string, ...args: unknown[]): void => {
    if (shouldLog('info')) {
      console.log(`[INFO] ${msg}`, ...args);
    }
  },
  warn: (msg: string, ...args: unknown[]): void => {
    if (shouldLog('warn')) {
      console.warn(`[WARN] ${msg}`, ...args);
    }
  },
  error: (msg: string, ...args: unknown[]): void => {
    // Always log errors regardless of log level
    console.error(`[ERROR] ${msg}`, ...args);
  },
};

export default logger;

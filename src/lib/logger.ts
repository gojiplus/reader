/**
 * Centralized logging utility for the audiobook reader application
 * Provides structured logging with different levels and proper production handling
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogContext {
  component?: string;
  userId?: string;
  bookId?: string;
  action?: string;
  [key: string]: string | number | boolean | Error | unknown;
}

class Logger {
  private level: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.level = this.isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level}]${contextStr} ${message}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    if (this.isDevelopment) {
      console.warn(this.formatMessage('DEBUG', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    console.warn(this.formatMessage('INFO', message, context));
  }

  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.WARN)) return;

    console.warn(this.formatMessage('WARN', message, context));
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    const errorInfo =
      error instanceof Error ? { message: error.message, stack: error.stack } : { error };

    const fullContext = { ...context, error: errorInfo };
    console.error(this.formatMessage('ERROR', message, fullContext));
  }

  // Specialized methods for common use cases
  firebase(message: string, context?: LogContext): void {
    this.debug(`[Firebase] ${message}`, context);
  }

  ai(message: string, context?: LogContext): void {
    this.debug(`[AI] ${message}`, context);
  }

  auth(message: string, context?: LogContext): void {
    this.debug(`[Auth] ${message}`, context);
  }

  tts(message: string, context?: LogContext): void {
    this.debug(`[TTS] ${message}`, context);
  }
}

// Export singleton instance
export const logger = new Logger();

// Legacy console replacement functions (for gradual migration)
export const createComponentLogger = (componentName: string) => ({
  debug: (message: string, context?: LogContext) =>
    logger.debug(message, { component: componentName, ...context }),
  info: (message: string, context?: LogContext) =>
    logger.info(message, { component: componentName, ...context }),
  warn: (message: string, context?: LogContext) =>
    logger.warn(message, { component: componentName, ...context }),
  error: (message: string, error?: Error | unknown, context?: LogContext) =>
    logger.error(message, error, { component: componentName, ...context }),
});

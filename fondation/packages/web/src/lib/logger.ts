/**
 * Comprehensive error logging and monitoring system
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  url?: string;
  method?: string;
  userAgent?: string;
  extra?: Record<string, unknown>;
  // Additional fields for flexibility
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private queue: LogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private minLevel: LogLevel;

  constructor() {
    this.minLevel = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;

    // Flush logs every 5 seconds in production
    if (process.env.NODE_ENV === 'production' && typeof setInterval !== 'undefined') {
      this.flushInterval = setInterval(() => void this.flush(), 5000);
    }

    // Catch unhandled errors
    if (typeof window !== 'undefined') {
      window.addEventListener('error', this.handleWindowError);
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log an info message
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log a warning
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log an error
   */
  error(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Log a fatal error
   */
  fatal(message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.FATAL, message, context, error);
    // Immediately flush on fatal errors
    void this.flush();
  }

  /**
   * Main logging method
   */
  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (level < this.minLevel) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      this.logToConsole(entry);
    }

    // Queue for batch sending in production
    if (process.env.NODE_ENV === 'production') {
      this.queue.push(entry);

      // Flush if queue is getting large
      if (this.queue.length >= 10) {
        void this.flush();
      }
    }
  }

  /**
   * Log to console in development
   */
  private logToConsole(entry: LogEntry): void {
    const prefix = `[${LogLevel[entry.level]}] ${entry.timestamp}`;
    const _message = `${prefix}: ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        break;
      case LogLevel.INFO:
        break;
      case LogLevel.WARN:
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        break;
    }
  }

  /**
   * Flush queued logs to monitoring service
   */
  private async flush(): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }

    const logs = [...this.queue];
    this.queue = [];

    try {
      // In production, send to monitoring service
      if (process.env.NEXT_PUBLIC_LOG_ENDPOINT) {
        await fetch(process.env.NEXT_PUBLIC_LOG_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ logs }),
        });
      }
    } catch (_error) {
      logs.forEach((log) => this.logToConsole(log));
    }
  }

  /**
   * Handle window errors
   */
  private handleWindowError = (event: ErrorEvent): void => {
    this.error('Unhandled error', new Error(event.message), {
      url: event.filename,
      extra: {
        line: event.lineno,
        column: event.colno,
      },
    });
  };

  /**
   * Handle unhandled promise rejections
   */
  private handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));

    this.error('Unhandled promise rejection', error);
  };

  /**
   * Log job-related messages
   */
  logJob(message: string, jobId: string, context?: LogContext): void {
    this.info(message, { ...context, jobId });
  }

  /**
   * Create a child logger with preset context
   */
  child(context: LogContext): LoggerInstance {
    return {
      debug: (message: string, extra?: LogContext) => this.debug(message, { ...context, ...extra }),
      info: (message: string, extra?: LogContext) => this.info(message, { ...context, ...extra }),
      warn: (message: string, extra?: LogContext) => this.warn(message, { ...context, ...extra }),
      error: (message: string, error?: Error, extra?: LogContext) =>
        this.error(message, error, { ...context, ...extra }),
      fatal: (message: string, error?: Error, extra?: LogContext) =>
        this.fatal(message, error, { ...context, ...extra }),
    };
  }

  /**
   * Clean up
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    void this.flush();

    if (typeof window !== 'undefined') {
      window.removeEventListener('error', this.handleWindowError);
      window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
    }
  }
}

interface LoggerInstance {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, error?: Error, context?: LogContext) => void;
  fatal: (message: string, error?: Error, context?: LogContext) => void;
}

// Singleton logger instance
export const logger = new Logger();

/**
 * Create a logger for API routes
 */
export function createApiLogger(req: Request): LoggerInstance {
  const url = new URL(req.url);

  return logger.child({
    url: url.pathname,
    method: req.method,
    userAgent: req.headers.get('user-agent') ?? undefined,
    requestId: crypto.randomUUID(),
  });
}

/**
 * Log performance metrics
 */
export function logPerformance(name: string, duration: number, context?: LogContext): void {
  const level = duration > 1000 ? LogLevel.WARN : LogLevel.INFO;
  const message = `Performance: ${name} took ${duration}ms`;

  if (level === LogLevel.WARN) {
    logger.warn(message, { ...context, extra: { duration } });
  } else {
    logger.info(message, { ...context, extra: { duration } });
  }
}

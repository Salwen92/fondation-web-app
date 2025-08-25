/**
 * Structured logging utility for the application
 * Provides consistent logging format and levels
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

type LogContext = Record<string, unknown>;

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: Error;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private currentLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
  
  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel) {
    this.currentLevel = level;
  }
  
  /**
   * Format log entry for output
   */
  private formatLogEntry(entry: LogEntry): string {
    const levelName = LogLevel[entry.level];
    const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    const errorStr = entry.error ? `\nError: ${entry.error.message}\nStack: ${entry.error.stack}` : '';
    
    return `[${entry.timestamp}] [${levelName}] ${entry.message}${contextStr}${errorStr}`;
  }
  
  /**
   * Log a message at the specified level
   */
  private log(level: LogLevel, message: string, context?: LogContext, error?: Error) {
    if (level < this.currentLevel) return;
    
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
    };
    
    // In production, send to logging service
    if (!this.isDevelopment) {
      // TODO: Integrate with logging service (e.g., Sentry, LogRocket)
      // For now, use console in production too but with structured format
      const formattedEntry = this.formatLogEntry(entry);
      
      switch (level) {
        case LogLevel.ERROR:
          console.error(formattedEntry);
          break;
        case LogLevel.WARN:
          console.warn(formattedEntry);
          break;
        default:
          console.log(formattedEntry);
      }
      return;
    }
    
    // In development, use console with colors
    const formattedEntry = this.formatLogEntry(entry);
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(`🐛 ${formattedEntry}`);
        break;
      case LogLevel.INFO:
        console.info(`ℹ️ ${formattedEntry}`);
        break;
      case LogLevel.WARN:
        console.warn(`⚠️ ${formattedEntry}`);
        break;
      case LogLevel.ERROR:
        console.error(`❌ ${formattedEntry}`);
        break;
    }
  }
  
  debug(message: string, context?: LogContext) {
    this.log(LogLevel.DEBUG, message, context);
  }
  
  info(message: string, context?: LogContext) {
    this.log(LogLevel.INFO, message, context);
  }
  
  warn(message: string, context?: LogContext) {
    this.log(LogLevel.WARN, message, context);
  }
  
  error(message: string, error?: Error, context?: LogContext) {
    this.log(LogLevel.ERROR, message, context, error);
  }
  
  /**
   * Log API request
   */
  logRequest(method: string, url: string, body?: unknown) {
    this.info('API Request', {
      method,
      url,
      body: body ? JSON.stringify(body).substring(0, 200) : undefined, // Truncate for safety
    });
  }
  
  /**
   * Log API response
   */
  logResponse(method: string, url: string, status: number, duration?: number) {
    const level = status >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    this.log(level, 'API Response', {
      method,
      url,
      status,
      duration: duration ? `${duration}ms` : undefined,
    });
  }
  
  /**
   * Log job operation
   */
  logJob(operation: string, jobId: string, context?: LogContext) {
    this.info(`Job ${operation}`, {
      jobId,
      ...context,
    });
  }
  
  /**
   * Log authentication event
   */
  logAuth(event: string, userId?: string, context?: LogContext) {
    this.info(`Auth ${event}`, {
      userId,
      ...context,
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing or custom instances
export { Logger };
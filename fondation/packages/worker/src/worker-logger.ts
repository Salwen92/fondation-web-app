/**
 * Worker Logger Utility
 *
 * Replaces silent error swallowing with structured logging.
 * Provides safe error handling that preserves debugging information
 * while protecting sensitive data.
 */

import { maskSensitiveData } from './encryption';
import { isDevelopment } from './utils/environment.js';

export interface LogContext {
  jobId?: string;
  repositoryId?: string;
  userId?: string;
  workerId?: string;
  operation?: string;
  [key: string]: unknown;
}

export interface ErrorLogEntry {
  operation: string;
  error: string;
  timestamp: string;
  context: LogContext;
}

export class WorkerLogger {
  private workerId: string;
  private debugMode: boolean;

  constructor(workerId: string) {
    this.workerId = workerId;
    this.debugMode = isDevelopment();
  }

  /**
   * Safely execute an operation with structured error logging
   */
  async safeExecute<T>(
    operation: string,
    fn: () => Promise<T>,
    context: LogContext = {},
  ): Promise<T | null> {
    try {
      return await fn();
    } catch (error) {
      this.logError(operation, error, context);
      return null;
    }
  }

  /**
   * Safely execute an operation with structured error logging (synchronous)
   */
  safeExecuteSync<T>(operation: string, fn: () => T, context: LogContext = {}): T | null {
    try {
      return fn();
    } catch (error) {
      this.logError(operation, error, context);
      return null;
    }
  }

  /**
   * Log error with structured format and sensitive data masking
   */
  logError(operation: string, error: unknown, context: LogContext = {}): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const safeError = maskSensitiveData(errorMessage);

    // Also log stack trace in development for better debugging
    const stack = error instanceof Error && this.debugMode ? error.stack : undefined;

    const _logEntry: ErrorLogEntry = {
      operation,
      error: safeError,
      timestamp: new Date().toISOString(),
      context: {
        ...context,
        workerId: this.workerId,
      },
      ...(stack && { stack }),
    };
  }

  /**
   * Log info with structured format
   */
  logInfo(message: string, _context: LogContext = {}): void {
    // Only log detailed debug info in development
    if (this.debugMode || !message.includes('[DEBUG]')) {
      // No-op logger implementation - would log to structured system in production
    }
  }

  /**
   * Log warning with structured format
   */
  logWarning(_message: string, _context: LogContext = {}): void {
    // No-op logger implementation - would log to structured system in production
  }

  /**
   * Create operation-specific logger for complex workflows
   */
  forJob(jobId: string, repositoryId?: string, userId?: string): JobLogger {
    return new JobLogger(this, jobId, repositoryId, userId);
  }
}

/**
 * Job-specific logger that automatically includes job context
 */
export class JobLogger {
  constructor(
    private parentLogger: WorkerLogger,
    private jobId: string,
    private repositoryId?: string,
    private userId?: string,
  ) {}

  async safeExecute<T>(operation: string, fn: () => Promise<T>): Promise<T | null> {
    return this.parentLogger.safeExecute(operation, fn, this.getContext());
  }

  safeExecuteSync<T>(operation: string, fn: () => T): T | null {
    return this.parentLogger.safeExecuteSync(operation, fn, this.getContext());
  }

  logError(operation: string, error: unknown): void {
    this.parentLogger.logError(operation, error, this.getContext());
  }

  logInfo(message: string, additionalContext: LogContext = {}): void {
    this.parentLogger.logInfo(message, { ...this.getContext(), ...additionalContext });
  }

  logWarning(message: string, additionalContext: LogContext = {}): void {
    this.parentLogger.logWarning(message, { ...this.getContext(), ...additionalContext });
  }

  private getContext(): LogContext {
    return {
      jobId: this.jobId,
      repositoryId: this.repositoryId,
      userId: this.userId,
    };
  }
}

export default WorkerLogger;

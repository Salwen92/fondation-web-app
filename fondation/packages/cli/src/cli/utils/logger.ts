import { isatty } from 'node:tty';
import pino from 'pino';

const pretty = require('pino-pretty');

export interface LoggerOptions {
  verbose?: boolean;
  json?: boolean;
  silent?: boolean;
  quiet?: boolean;
  logFile?: string;
  context?: string;
}

export interface LogContext {
  command?: string;
  sessionId?: string;
  model?: string;
  duration?: number;
  error?: Error | unknown;
}

export function createLogger(options: LoggerOptions = {}): pino.Logger {
  const { verbose, json, silent, quiet, logFile, context } = options;

  // Determine if we should use pretty output
  const isTTY = isatty(process.stdout.fd || 0);
  const shouldUsePretty = isTTY && !json && !logFile;

  // Handle quiet/silent modes
  if (silent || quiet) {
    return pino({
      enabled: false,
      level: 'fatal', // Only fatal errors in quiet mode
    });
  }

  // Determine log level
  const level = verbose ? 'debug' : 'info';

  // Base logger configuration
  const baseConfig: pino.LoggerOptions = {
    level,
    ...(context && { base: { context } }),
    formatters: {
      level: (label) => ({ level: label }),
    },
  };

  // Create appropriate transport
  if (shouldUsePretty) {
    return pino(
      baseConfig,
      pretty({
        colorize: true,
        ignore: 'pid,hostname',
        translateTime: 'HH:MM:ss',
        messageFormat: '{context} {msg}',
        customPrettifiers: {
          context: (value: unknown) => (value ? `[${value}]` : ''),
        },
      }),
    );
  }

  if (logFile) {
    // File output
    const transport = pino.transport({
      target: 'pino/file',
      options: { destination: logFile },
    });
    return pino(baseConfig, transport);
  }

  // JSON output (for non-TTY or --json flag)
  return pino(baseConfig);
}

// Global logger instance
let globalLogger: pino.Logger | null = null;

export function getLogger(): pino.Logger {
  if (!globalLogger) {
    globalLogger = createLogger();
  }
  return globalLogger;
}

export function setLogger(logger: pino.Logger): void {
  globalLogger = logger;
}

/**
 * Create a child logger with additional context
 */
export function withContext(logger: pino.Logger, context: LogContext): pino.Logger {
  return logger.child(context);
}

/**
 * Standard log messages for common operations
 */
export const LogMessages = {
  // Command lifecycle
  commandStart: (command: string) => `Starting ${command} command`,
  commandComplete: (command: string, duration: number) =>
    `Completed ${command} command in ${duration}ms`,
  commandFailed: (command: string, error: string) => `${command} command failed: ${error}`,

  // Configuration
  configLoading: 'Loading configuration',
  configLoaded: (source: string) => `Configuration loaded from ${source}`,
  configError: (error: string) => `Configuration error: ${error}`,

  // Query processing
  queryStart: (model: string) => `Starting query with model ${model}`,
  queryComplete: (duration: number) => `Query completed in ${duration}ms`,
  queryAborted: 'Query aborted by user',

  // Tool execution
  toolExecute: (tool: string) => `Executing tool: ${tool}`,
  toolExecuteWithArgs: (tool: string, summary: string) => `🔧 ${tool}: ${summary}`,
  toolComplete: (tool: string, duration: number) => `Tool ${tool} completed in ${duration}ms`,
  toolCompleteWithResult: (tool: string, duration: number, summary: string) =>
    `✅ ${tool}: ${summary} (${duration}ms)`,
  toolError: (tool: string, error: string) => `Tool ${tool} failed: ${error}`,

  // Thinking
  thinkingStart: 'Claude is thinking...',
  thinkingContent: (content: string) => `💭 ${content}`,
  thinkingEnd: (duration: number) => `Thinking complete (${duration}ms)`,
} as const;

/**
 * Performance timer utility
 */
export class Timer {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  elapsed(): number {
    return Date.now() - this.startTime;
  }

  log(logger: pino.Logger, message: string, level: pino.Level = 'info'): void {
    const duration = this.elapsed();
    logger[level]({ duration }, `${message} (${duration}ms)`);
  }
}

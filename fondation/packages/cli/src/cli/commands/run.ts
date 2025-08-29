import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Command } from 'commander';
import type { Logger } from 'pino';
import { ClaudeQueryProcessor } from '../../core/claude-query';
import type { QueryEventHandlers } from '../../core/types/query';
import type { ToolArgs, ToolResult } from '../../core/types/tools';
import type { Message, ToolUse } from '../../types/chat';
import { modelOption, toolsOption } from '../options/common';
import type { CLIConfig } from '../utils/config';
import { LogMessages, type Timer, withContext } from '../utils/logger';
import { createOutputFormatter, type OutputFormatter } from '../utils/output';

export const runCommand = new Command('run')
  .description('Run a prompt in headless mode')
  .argument('[prompt]', 'prompt text (if not using -p or -f)')
  .allowUnknownOption(true)
  .option('-p, --prompt <text>', 'provide prompt directly')
  .option('-f, --file <path>', 'read prompt from file')
  .option('--stdin', 'read prompt from stdin')
  .option('--thinking', 'enable thinking mode and show reasoning process')
  .option('--session <id>', 'session ID for context')
  .option('--system-prompt <path>', 'custom system prompt file')
  .addOption(modelOption)
  .addOption(toolsOption)
  .addHelpText(
    'after',
    `
Global Options (available with all commands):
  -v, --verbose                 enable verbose output for debugging
  -q, --quiet                   minimal output (just results)
  --json                        output structured JSON format
  --profile <profile>           use configuration profile
  --config <path>               path to custom config file

Examples:
  $ fondation run "What is TypeScript?"
  $ fondation run -p "Analyze this code" --thinking
  $ fondation run -f prompt.txt --quiet
  $ fondation run "Explain this error" --verbose
  
Use "fondation --help" for more information about global options.`,
  )
  .action(async (promptArg, options, command) => {
    const config = command.optsWithGlobals()._config;
    const baseLogger = command.optsWithGlobals()._logger as Logger;
    const timer = command.optsWithGlobals()._timer as Timer;
    const globalQuiet = command.optsWithGlobals().quiet;
    const globalVerbose = command.optsWithGlobals().verbose;

    // Create command-specific logger
    const logger = withContext(baseLogger, {
      command: 'run',
      model: options.model || config.model,
    });

    // Determine logging visibility first
    // Priority: --quiet overrides everything, then --verbose, then defaults

    const showToolLogs = !globalQuiet; // Tool logs visible by default
    const showSystemLogs = globalQuiet ? false : globalVerbose;

    if (showSystemLogs) {
      logger.info(LogMessages.commandStart('run'));
    }

    try {
      // Determine prompt source
      if (showSystemLogs) {
        logger.debug('Determining prompt source');
      }
      const prompt = await getPrompt(promptArg, options);

      if (!prompt) {
        throw new Error('No prompt provided. Use -p, -f, --stdin, or provide as argument.');
      }

      if (showSystemLogs) {
        logger.debug('Prompt loaded', {
          length: prompt.length,
          source: options.file
            ? 'file'
            : options.stdin
              ? 'stdin'
              : options.prompt
                ? 'flag'
                : 'argument',
        });
      }

      // Create output formatter
      const globalJson = command.optsWithGlobals().json;
      const outputFormat = globalJson ? 'json' : 'text';

      const formatter = createOutputFormatter(outputFormat, {
        stream: true, // Always stream
        quiet: globalQuiet,
        json: globalJson,
      });

      if (showSystemLogs) {
        logger.debug('Output formatter created', { format: outputFormat });
      }

      // Determine thinking configuration
      // --thinking flag enables BOTH capability AND visibility
      const isThinkingEnabled = options.thinking || false;
      const maxThinkingTokens = isThinkingEnabled ? 40000 : 0;

      if (showSystemLogs) {
        logger.debug('Thinking configuration', {
          enabled: isThinkingEnabled,
          maxTokens: maxThinkingTokens,
        });
      }

      // Logging visibility already determined above

      // Execute query
      await executePrompt(prompt, {
        ...options,
        config,
        logger,
        formatter,
        thinking: isThinkingEnabled,
        maxThinkingTokens: maxThinkingTokens,
        showToolLogs,
        showSystemLogs,
      });

      if (showSystemLogs) {
        timer.log(logger, LogMessages.commandComplete('run', timer.elapsed()));
      }
      process.exit(0);
    } catch (error) {
      const err = error as Error;
      logger.error(LogMessages.commandFailed('run', err.message), { error: err });

      if (command.optsWithGlobals().json) {
        process.stderr.write(`${JSON.stringify({ error: err.message })}\n`);
      } else if (!globalQuiet) {
        process.stderr.write(`${err.message}\n`);
      }

      process.exit(1);
    }
  });

interface RunOptions {
  prompt?: string;
  file?: string;
  stdin?: boolean;
}

async function getPrompt(arg: string | undefined, options: RunOptions): Promise<string | null> {
  // Priority: -p flag > -f flag > --stdin > argument
  if (options.prompt) {
    return options.prompt;
  }

  if (options.file) {
    const filePath = resolve(process.cwd(), options.file);
    return await readFile(filePath, 'utf-8');
  }

  if (options.stdin || !process.stdin.isTTY) {
    return await readFromStdin();
  }

  return arg || null;
}

async function readFromStdin(): Promise<string> {
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf-8'));
    });
    process.stdin.on('error', reject);
  });
}

interface ExecuteOptions {
  config: CLIConfig;
  logger: Logger;
  formatter: OutputFormatter;
  model?: string;
  systemPrompt?: string;
  maxTokens?: number;
  session?: string;
  tools?: string[];
  thinking?: boolean;
  maxThinkingTokens?: number;
  showToolLogs?: boolean;
  showSystemLogs?: boolean;
}

// Helper function to create readable tool summaries
function createToolSummary(tool: string, args: ToolArgs): string {
  switch (tool) {
    case 'Glob':
      return `Searching for "${args.pattern}" in ${args.path || 'current directory'}`;
    case 'Read':
      return `Reading file ${args.file_path}`;
    case 'Write':
      return `Writing to ${args.file_path}`;
    case 'Edit':
      return `Editing ${args.file_path}`;
    case 'MultiEdit':
      return `Making multiple edits to ${args.file_path}`;
    case 'Bash':
      return `Running command: ${args.command}`;
    case 'Grep':
      return `Searching for "${args.pattern}" in ${args.include || 'all files'}`;
    case 'LS':
      return `Listing directory ${args.path}`;
    case 'WebFetch':
      return `Fetching ${args.url}`;
    case 'WebSearch':
      return `Searching web for: ${args.query}`;
    default:
      return `Executing ${tool}`;
  }
}

function createResultSummary(tool: string, result: ToolResult): string {
  const output = result.output;

  switch (tool) {
    case 'Glob':
      if (output) {
        const lines = output.split('\n').filter(Boolean);
        return `Found ${lines.length} files`;
      }
      return 'No files found';
    case 'Read':
      if (output) {
        const lines = output.split('\n').length;
        const bytes = output.length;
        return `Read ${lines} lines (${(bytes / 1024).toFixed(1)}KB)`;
      }
      return 'File read';
    case 'Bash': {
      // For Claude SDK tools, success is determined by having output and no error
      const hasOutput = !!result.output;
      const hasError = !!result.error;
      const isSuccess = result.success !== false && (hasOutput || !hasError);
      return isSuccess ? 'Command succeeded' : 'Command failed';
    }
    case 'Write':
    case 'Edit':
    case 'MultiEdit':
      return result.success ? 'File updated' : 'Update failed';
    case 'Grep':
      if (output) {
        const lines = output.split('\n').filter(Boolean);
        return `Found ${lines.length} matches`;
      }
      return 'No matches found';
    case 'LS':
      if (output) {
        const lines = output.split('\n').filter(Boolean);
        return `Listed ${lines.length} items`;
      }
      return 'Directory listed';
    default:
      return 'Completed';
  }
}

async function executePrompt(prompt: string, options: ExecuteOptions) {
  const { config, logger, formatter } = options;

  // Track execution state
  let hasError = false;
  let messageCount = 0;
  const startTime = Date.now();
  const toolStartTimes = new Map<string, number>();
  let thinkingStartTime: number | null = null;

  if (options.showSystemLogs) {
    logger.info(LogMessages.queryStart(options.model || config.model));
  }

  // Create event handlers
  const handlers: QueryEventHandlers = {
    onMessage: (message: Message) => {
      messageCount++;
      logger.trace('Message received', {
        id: message.id,
        role: message.role,
        contentLength: message.content?.length || 0,
      });
      formatter.onMessage(message);
    },

    onMessageUpdate: (
      id: string,
      updates: Partial<Omit<Message, 'toolUse'>> & { toolUse?: Partial<ToolUse> },
    ) => {
      logger.trace('Message updated', { id, hasContent: !!updates.content });
      formatter.onMessageUpdate(id, updates as Record<string, unknown>);
    },

    onToolUse: (id: string, tool: string, args: ToolArgs) => {
      const summary = createToolSummary(tool, args);
      toolStartTimes.set(id, Date.now());
      if (options.showToolLogs) {
        if (options.showSystemLogs) {
          // Debug mode: structured logs with brackets
          logger.info(`[⏺] ${tool}: ${summary}`, { messageId: id });
        } else {
          // Clean mode: direct to stdout
          process.stdout.write(`[⏺] ${tool}: ${summary}\n`);
        }
      }
      formatter.onToolUse(id, tool, args);
    },

    onToolResult: (id: string, tool: string, result: ToolResult) => {
      const startTime = toolStartTimes.get(id);
      const duration = startTime ? Date.now() - startTime : 0;
      const summary = createResultSummary(tool, result);
      toolStartTimes.delete(id);

      // Check if tool failed and show appropriate status
      // For Claude SDK tools, success is determined by having output and no error
      const hasOutput = !!result.output;
      const hasError = !!result.error;
      const isSuccess = result.success !== false && (hasOutput || !hasError);
      const status = isSuccess ? '✓' : '✗';

      // Debug: log the tool result in debug mode
      if (options.showSystemLogs && tool === 'Bash') {
        logger.debug(
          `Bash tool result: success=${result.success}, isSuccess=${isSuccess}, hasOutput=${hasOutput}, hasError=${hasError}`,
        );
      }

      if (options.showToolLogs) {
        if (options.showSystemLogs) {
          // Debug mode: structured logs with brackets
          logger.info(`[${status}] ${tool}: ${summary} (${duration}ms)`, {
            messageId: id,
            result: result,
            success: isSuccess,
          });
        } else {
          // Clean mode: direct to stdout
          process.stdout.write(`[${status}] ${tool}: ${summary} (${duration}ms)\n`);
        }

        // Show error details for failed bash commands
        if (!isSuccess && tool === 'Bash' && result.error) {
          const errorMsg =
            typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
          if (options.showSystemLogs) {
            logger.error(`Bash command error: ${errorMsg}`, { messageId: id });
          } else {
            process.stdout.write(`   Error: ${errorMsg}\n`);
          }
        }
      }
      formatter.onToolResult(id, tool, result);
    },

    onStreamStart: (id: string) => {
      formatter.onStreamStart(id);
    },

    onStreamContent: (id: string, content: string) => {
      formatter.onStreamContent(id, content);
    },

    onStreamEnd: (id: string) => {
      formatter.onStreamEnd(id);
    },

    onThinkingStart: options.thinking
      ? (_id: string) => {
          thinkingStartTime = Date.now();
          if (options.showSystemLogs) {
            // Debug mode: structured logs
            logger.info('💭 Claude is thinking...', { messageId: _id });
          } else {
            // Clean mode: direct to stdout
            process.stdout.write('💭 Claude is thinking...\n');
          }
        }
      : undefined,

    onThinkingContent: options.thinking
      ? (_id: string, content: string) => {
          // When thinking is enabled, show thinking content based on verbosity
          if (options.showSystemLogs) {
            // Verbose mode: show all thinking with structured logs
            logger.info(`💭 ${content}`, { messageId: _id });
          } else {
            // Normal mode: show summarized thinking (first few lines)
            const lines = content.split('\n');
            if (lines.length <= 3) {
              process.stdout.write(`💭 ${content}\n`);
            }
          }
        }
      : undefined,

    onThinkingEnd: options.thinking
      ? (_id: string) => {
          const duration = thinkingStartTime ? Date.now() - thinkingStartTime : 0;
          thinkingStartTime = null;
          if (options.showSystemLogs) {
            // Debug mode: structured logs
            logger.info(`└─ Thinking complete (${(duration / 1000).toFixed(1)}s)`, {
              messageId: _id,
            });
          } else {
            // Clean mode: direct to stdout
            process.stdout.write(`└─ Thinking complete (${(duration / 1000).toFixed(1)}s)\n\n`);
          }
        }
      : undefined,

    onComplete: () => {
      const duration = Date.now() - startTime;
      if (options.showSystemLogs) {
        logger.info(LogMessages.queryComplete(duration), { messageCount });
      }
      formatter.onComplete({ duration, messageCount });
    },

    onError: (error: Error) => {
      hasError = true;
      logger.error('Query execution error', { error: error.message, stack: error.stack });
      formatter.onError(error);
    },

    onAbort: () => {
      logger.warn(LogMessages.queryAborted);
    },
  } as QueryEventHandlers;

  // Create query processor
  const processor = new ClaudeQueryProcessor(handlers, {
    model: options.model || config.model,
    ...(options.systemPrompt && { systemPrompt: options.systemPrompt }),
    temperature: config.temperature,
    maxTokens: options.maxTokens || config.maxOutputTokens,
    maxThinkingTokens: options.maxThinkingTokens || 0,
    ...(options.session && { sessionId: options.session }),
    logMessages: config.logMessages,
    allowedTools: options.tools || config.tools || [],
    workingDirectory: process.cwd(),
    logger,
  });

  // Handle SIGINT
  process.on('SIGINT', () => {
    logger.warn('Received SIGINT, aborting query');
    processor.abort();
    process.exit(130);
  });

  // Execute query
  await processor.processQuery(prompt);

  if (hasError) {
    throw new Error('Query execution failed');
  }
}

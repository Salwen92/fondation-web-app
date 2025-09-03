import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import type { SDKMessage } from '@anthropic-ai/claude-code';
import type { Logger } from 'pino';
import { getLogger } from '../cli/utils/logger';
import { formatToolResultContent, parseToolResultContent } from '../schemas/toolResults';
import {
  isAssistantMessage,
  isResultMessage,
  isSystemMessage,
  isUserMessage,
  sdkMessageToUIMessage,
} from '../types/adapters';
import { sessionManager } from './session-manager';
import type { QueryEventHandlers, QueryOptions } from './types/query';
import type { ToolArgs } from './types/tools';
import { MessageLogger } from './utils/message-logger';
import { queryWithAbortHandling } from './utils/sdk-wrapper';

// Custom error class for query aborts
export class QueryAbortError extends Error {
  constructor(message = 'Query aborted by user') {
    super(message);
    this.name = 'QueryAbortError';
  }
}

// Type for SDK message content items
type MessageContentItem =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id?: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id?: string; content?: unknown };

// Resolve the Claude Code executable path
let claudeCodeExecutablePath: string | undefined;
try {
  // Create a require function that can resolve module paths
  const require = createRequire(import.meta.url);
  claudeCodeExecutablePath = require.resolve('@anthropic-ai/claude-code/cli.js');
} catch {
  // If we can't find it in node_modules, the SDK will use its default resolution
}

// Cache for system prompts to avoid repeated file I/O
const systemPromptCache = new Map<string, string>();

export class ClaudeQueryProcessor {
  private messageLogger?: MessageLogger;
  private abortController: AbortController | undefined;
  private toolUseToMessageId: Map<string, { messageId: string; toolName: string }> = new Map();
  private sessionId: string | null = null;
  private logger: Logger;
  private isAborted = false;

  constructor(
    private handlers: QueryEventHandlers,
    private options: QueryOptions = {},
  ) {
    if (options.logMessages !== false) {
      this.messageLogger = new MessageLogger(true);
    }

    // Use provided logger or get global logger
    this.logger = options.logger || getLogger();
  }

  async processQuery(userMessage: string): Promise<void> {
    // Reset abort flag at the start of a new query
    this.isAborted = false;

    const queryStartTime = Date.now();
    this.logger.debug('Starting query processing', {
      promptLength: userMessage.length,
      model: this.options.model,
      sessionId: this.sessionId,
    });

    try {
      // Log the user prompt
      if (this.messageLogger) {
        await this.messageLogger.logUserPrompt(userMessage);
      }

      // Load system prompt
      const systemPrompt = await this.loadSystemPrompt();
      this.logger.trace('System prompt loaded', { length: systemPrompt.length });

      // Create abort controller
      this.abortController = new AbortController();

      const messages: SDKMessage[] = [];

      // Build query options
      const queryOptions = {
        prompt: userMessage,
        abortController: this.abortController,
        options: {
          customSystemPrompt: systemPrompt,
          allowedTools: this.options.allowedTools || [
            'Write',
            'Read',
            'LS',
            'Glob',
            'Grep',
            'Edit',
            'MultiEdit',
            'Bash',
            'TodoRead',
            'TodoWrite',
            'Task',
            'WebFetch',
            'WebSearch',
            'NotebookRead',
            'NotebookEdit',
            'exit_plan_mode',
          ],
          cwd: this.options.workingDirectory || process.cwd(),
          // Pass absolute path to Claude Code executable to avoid path resolution issues
          ...(claudeCodeExecutablePath && { pathToClaudeCodeExecutable: claudeCodeExecutablePath }),
          ...(this.options.model && { model: this.options.model }),
          ...(this.options.maxThinkingTokens &&
            this.options.maxThinkingTokens > 0 && {
              maxThinkingTokens: this.options.maxThinkingTokens,
            }),
          ...(this.sessionId && { resume: this.sessionId }),
        },
      };

      // Listen for external abort signal
      if (this.options.abortSignal) {
        this.options.abortSignal.addEventListener('abort', () => {
          this.abortController?.abort();
        });
      }

      // Execute query
      this.logger.trace('Executing Claude query', {
        allowedTools: queryOptions.options.allowedTools,
        claudeCodePath: claudeCodeExecutablePath,
        passedToSDK: queryOptions.options.pathToClaudeCodeExecutable,
      });

      for await (const message of queryWithAbortHandling(queryOptions)) {
        // Check if we've been aborted and exit immediately
        if (this.isAborted) {
          this.logger.debug('Query loop exiting due to abort');
          break;
        }

        messages.push(message);
        this.logger.trace('Received SDK message', { type: message.type });

        // Capture session ID from the first message if not already set
        if (!this.sessionId && 'session_id' in message && message.session_id) {
          this.sessionId = message.session_id;
          this.logger.debug('Session ID captured', { sessionId: this.sessionId });

          // Store in session manager if sessionId option is provided
          if (this.options.sessionId) {
            const session = await sessionManager.getSession(this.options.sessionId);
            if (!session) {
              await sessionManager.createSession(this.options.sessionId);
            }
          }
        }

        // Log the raw SDK message
        if (this.messageLogger) {
          await this.messageLogger.logSDKMessage(message, 'incoming');
        }

        // Debug: Log all message types received (trace level only)
        this.logger.trace('SDK message details', {
          type: message.type,
          subtype: (message as { subtype?: string }).subtype,
          hasThinking: 'thinking' in message,
        });

        // Check if thinking content is embedded in assistant messages and trigger thinking events
        // Only process thinking if we have thinking handlers registered
        if (
          message.type === 'assistant' &&
          message.message &&
          typeof message.message === 'object' &&
          (this.handlers.onThinkingStart ||
            this.handlers.onThinkingContent ||
            this.handlers.onThinkingEnd)
        ) {
          const msg = message.message as {
            content?: Array<{ type: string; text?: string; thinking?: string }>;
            id?: string;
          };
          if (msg.content && Array.isArray(msg.content)) {
            // Use find instead of for...of for early termination
            const thinkingContent = msg.content.find((c) => c.type === 'thinking' && c.thinking);
            if (thinkingContent?.thinking) {
              const messageId = msg.id || 'unknown';
              const thinkingText = thinkingContent.thinking;

              this.logger.trace('Found thinking content', {
                type: thinkingContent.type,
                thinkingLength: thinkingText.length,
              });

              // Call thinking event handlers
              this.handlers.onThinkingStart?.(messageId);
              this.handlers.onThinkingContent?.(messageId, thinkingText);
              this.handlers.onThinkingEnd?.(messageId);
            }
          }
        }

        // Check abort state before processing messages
        if (this.isAborted) {
          break;
        }

        // Handle different message types using type-safe adapters
        if (isSystemMessage(message)) {
          // Handle system initialization messages
          if (message.subtype === 'init') {
            // System messages typically don't need UI representation
          }
        } else if (isUserMessage(message)) {
          // Check abort state
          if (this.isAborted) {
            break;
          }

          // User messages from tool results
          if (message.message?.content && Array.isArray(message.message.content)) {
            // Extract content from tool results
            const content = message.message.content as MessageContentItem[];
            const toolResult = content.find(
              (c) => typeof c === 'object' && c !== null && 'type' in c && c.type === 'tool_result',
            ) as { type: 'tool_result'; tool_use_id?: string; content?: unknown } | undefined;

            if (toolResult?.tool_use_id) {
              // Check if we have a pending message to update
              const toolInfo = this.toolUseToMessageId.get(toolResult.tool_use_id);

              if (toolInfo) {
                // Update the existing message
                const parsed = parseToolResultContent('', toolResult.content);
                const formattedContent = formatToolResultContent(parsed.data);

                this.handlers.onMessageUpdate(toolInfo.messageId, {
                  toolUse: {
                    result: formattedContent,
                    status: 'completed',
                  },
                });

                // 🔧 FIX: Call onToolResult handler
                this.handlers.onToolResult(toolInfo.messageId, toolInfo.toolName, {
                  success: true,
                  output: formattedContent,
                });

                // Clean up the mapping after successful update
                this.toolUseToMessageId.delete(toolResult.tool_use_id);
              }
              // If mapping doesn't exist, the result is ignored to prevent duplicates
            }
          }
        } else if (isAssistantMessage(message)) {
          // Check abort state
          if (this.isAborted) {
            break;
          }

          // Convert assistant message using adapter
          const uiMessages = sdkMessageToUIMessage(message);
          this.logger.trace('Assistant message received', {
            messageCount: Array.isArray(uiMessages) ? uiMessages.length : 1,
          });
          if (Array.isArray(uiMessages)) {
            for (const uiMessage of uiMessages) {
              if (uiMessage.role === 'tool' && uiMessage.toolUse) {
                // Store mapping for later updates
                this.toolUseToMessageId.set(uiMessage.id, {
                  messageId: uiMessage.id,
                  toolName: uiMessage.toolUse.name,
                });

                // 🔧 FIX: Call onToolUse handler
                this.handlers.onToolUse(
                  uiMessage.id,
                  uiMessage.toolUse.name,
                  uiMessage.toolUse.input as ToolArgs,
                );
              }

              this.handlers.onMessage(uiMessage);

              // For assistant messages, also trigger streaming events
              if (uiMessage.role === 'assistant' && uiMessage.content) {
                this.handlers.onStreamStart?.(uiMessage.id);
                this.handlers.onStreamContent?.(uiMessage.id, uiMessage.content);
                this.handlers.onStreamEnd?.(uiMessage.id);
              }

              // Log UI messages
              if (this.messageLogger) {
                await this.messageLogger.logUIMessage(uiMessage);
              }
            }
          }
        } else if (isResultMessage(message)) {
          // If aborted, don't process result messages
          if (this.isAborted) {
            break;
          }

          // Handle result with different subtypes
          if (message.subtype === 'success') {
            const duration = Date.now() - queryStartTime;
            this.logger.info('Query completed successfully', {
              duration,
              messageCount: messages.length,
            });
            this.handlers.onComplete();
          } else if (message.subtype === 'error_max_turns') {
            this.logger.warn('Query reached maximum turns limit');
            this.handlers.onError(new Error('Maximum conversation turns reached'));
          } else if (message.subtype === 'error_during_execution') {
            this.logger.error('Query execution error');
            this.handlers.onError(new Error('Error occurred during query execution'));
          }
        }
      }

      // Store messages in session if sessionId is provided (only if not aborted)
      if (this.options.sessionId && !this.isAborted) {
        for (const msg of messages) {
          await sessionManager.addMessage(this.options.sessionId, msg);
        }
      }
    } catch (error) {
      const duration = Date.now() - queryStartTime;

      // Check if this is an abort - handle gracefully without propagating
      if (this.isAborted) {
        this.logger.info('Query aborted', { duration });
        return;
      }

      // Check for SDK abort errors
      if (
        error instanceof Error &&
        (error.name === 'AbortError' ||
          error.message.includes('Claude Code process exited with code 143'))
      ) {
        this.logger.info('Query terminated by abort signal', { duration });
        // Throw our custom error to be handled by callers
        throw new QueryAbortError();
      }

      this.logger.error('Query processing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      });
      this.handlers.onError(error instanceof Error ? error : new Error('Unknown error occurred'));
    }
  }

  private async loadSystemPrompt(): Promise<string> {
    if (this.options.systemPrompt) {
      // If systemPrompt is provided as a string, use it directly
      if (!this.options.systemPrompt.includes('/')) {
        return this.options.systemPrompt;
      }
      // Otherwise treat it as a file path - check cache first
      const cached = systemPromptCache.get(this.options.systemPrompt);
      if (cached) {
        return cached;
      }
      try {
        const content = await readFile(this.options.systemPrompt, 'utf-8');
        systemPromptCache.set(this.options.systemPrompt, content);
        return content;
      } catch (_error) {
        // Failed to read system prompt file, silently continue
      }
    }

    // Default to loading from prompts/general.md
    const promptPath = resolve(process.cwd(), 'prompts/general.md');

    // Check cache first
    const cached = systemPromptCache.get(promptPath);
    if (cached) {
      return cached;
    }

    try {
      const content = await readFile(promptPath, 'utf-8');
      systemPromptCache.set(promptPath, content);
      return content;
    } catch (_error) {
      const defaultPrompt = 'You are Claude, an AI assistant.';
      systemPromptCache.set(promptPath, defaultPrompt);
      return defaultPrompt;
    }
  }

  abort(): void {
    // Set abort flag immediately to stop message processing
    this.isAborted = true;

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = undefined;
    }

    // Clear all pending tool mappings
    this.toolUseToMessageId.clear();

    // Call abort handler immediately
    this.handlers.onAbort?.();

    this.logger.debug('Query processor aborted completely');
  }

  resetSession(): void {
    this.sessionId = null;
    this.toolUseToMessageId.clear();

    if (this.options.sessionId) {
      sessionManager.clearSession(this.options.sessionId).catch((err) => {
        this.options.logger?.error('Failed to clear session', err);
      });
    }
  }

  getSessionId(): string | null {
    return this.sessionId;
  }
}

// Convenience function for one-off queries
export async function processClaudeQuery(
  userMessage: string,
  handlers: QueryEventHandlers,
  options?: QueryOptions,
): Promise<ClaudeQueryProcessor> {
  const processor = new ClaudeQueryProcessor(handlers, options);
  await processor.processQuery(userMessage);
  return processor;
}

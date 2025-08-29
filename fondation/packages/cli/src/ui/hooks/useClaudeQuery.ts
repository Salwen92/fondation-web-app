import { useCallback, useRef } from 'react';
import { getModelConfig } from '../../config';
import { ClaudeQueryProcessor, QueryAbortError } from '../../core/claude-query';
import type { QueryEventHandlers, QueryOptions } from '../../core/types/query';
import type { ToolArgs, ToolResult } from '../../core/types/tools';
import { env } from '../../env';
import type { Message, ToolUse } from '../../types/chat';

interface UseClaudeQueryOptions {
  onMessage: (message: Message) => void;
  onMessageUpdate: (
    messageId: string,
    updates: Partial<Omit<Message, 'toolUse'>> & { toolUse?: Partial<ToolUse> },
  ) => void;
  onAssistantUpdate: (content: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export function useClaudeQuery({
  onMessage,
  onMessageUpdate,
  onAssistantUpdate: _onAssistantUpdate,
  onComplete,
  onError,
}: UseClaudeQueryOptions) {
  const processorRef = useRef<ClaudeQueryProcessor | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const isInitialized = useRef(false);

  // Initialize processor once on first use
  const initializeProcessor = useCallback(() => {
    if (isInitialized.current && processorRef.current) {
      return processorRef.current;
    }

    const modelConfig = getModelConfig();

    const handlers: QueryEventHandlers = {
      onMessage,
      onMessageUpdate,
      onToolUse: (_messageId: string, _tool: string, _args: ToolArgs) => {
        // Tool use is already handled by the message conversion in the core
        // The UI updates are handled via onMessage and onMessageUpdate
      },
      onToolResult: (_messageId: string, _tool: string, _result: ToolResult) => {
        // Tool results are handled via onMessageUpdate in the core
      },
      onStreamStart: (_messageId: string) => {
        // Streaming is handled by the message updates
      },
      onStreamContent: (_messageId: string, _content: string) => {
        // Content streaming is handled by message updates
      },
      onStreamEnd: (_messageId: string) => {
        // Stream end is handled by message updates
      },
      onComplete,
      onError,
      onAbort: () => {
        // Abort is handled by the processor
      },
    };

    const options: QueryOptions = {
      model: modelConfig.model,
      ...(modelConfig.temperature !== undefined && { temperature: modelConfig.temperature }),
      ...(modelConfig.maxTokens !== undefined && { maxTokens: modelConfig.maxTokens }),
      logMessages: env.CLAUDE_LOG_MESSAGES ?? env.ENABLE_MESSAGE_LOGGING,
      workingDirectory: process.cwd(),
      // Resume session if provided via environment
      ...(env.CLAUDE_SESSION_ID && { sessionId: env.CLAUDE_SESSION_ID }),
    };

    processorRef.current = new ClaudeQueryProcessor(handlers, options);
    isInitialized.current = true;
    return processorRef.current;
  }, [onMessage, onMessageUpdate, onComplete, onError]);

  const processQuery = useCallback(
    async (userMessage: string) => {
      try {
        const processor = initializeProcessor();
        await processor.processQuery(userMessage);

        // Capture the session ID for future use
        const newSessionId = processor.getSessionId();
        if (newSessionId) {
          sessionIdRef.current = newSessionId;
        }
      } catch (error) {
        // Don't treat aborts as errors - they're handled by the abort handler
        if (error instanceof QueryAbortError) {
          return;
        }
        onError(error instanceof Error ? error : new Error('Unknown error occurred'));
      }
    },
    [initializeProcessor, onError],
  );

  const abort = useCallback(() => {
    processorRef.current?.abort();
  }, []);

  const resetSession = useCallback(() => {
    sessionIdRef.current = null;
    processorRef.current?.resetSession();
  }, []);

  return {
    processQuery,
    abort,
    resetSession,
  };
}

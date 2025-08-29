import { useCallback } from 'react';
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
  onMessage: _onMessage,
  onMessageUpdate: _onMessageUpdate,
  onAssistantUpdate: _onAssistantUpdate,
  onComplete,
  onError: _onError,
}: UseClaudeQueryOptions) {
  const processQuery = useCallback(
    async (_userMessage: string) => {
      // Mock implementation - no actual processing
      // In a real mock scenario, this would be pre-populated with data
      // For our static UI generation, we don't need this to do anything

      // Simulate immediate completion for static display
      onComplete();
    },
    [onComplete],
  );

  const abort = useCallback(() => {
    // Mock abort - do nothing
  }, []);

  return {
    processQuery,
    abort,
  };
}

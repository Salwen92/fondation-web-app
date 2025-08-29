import { useCallback, useState } from 'react';
import type { ChatState, Message, ToolUse } from '../../types/chat';

const INITIAL_STATE: ChatState = {
  messages: [
    // {
    //   id: '0',
    //   role: 'system',
    //   content: 'Welcome to Claude Dev Chat! Type your message and press Enter to send. Press Ctrl+C to exit.',
    //   timestamp: new Date()
    // }
  ],
  currentInput: '',
  isProcessing: false,
  cursorPosition: 0,
};

export function useChatState() {
  const [state, setState] = useState<ChatState>(INITIAL_STATE);

  const addMessage = useCallback(
    (message: Omit<Message, 'timestamp'> | Omit<Message, 'id' | 'timestamp'>) => {
      const messageId = 'id' in message ? message.id : Date.now().toString();
      const newMessage: Message = {
        id: messageId,
        role: message.role,
        content: message.content,
        timestamp: new Date(),
      };

      if (message.toolUse) {
        newMessage.toolUse = message.toolUse;
      }

      if (message.parentToolUseId) {
        newMessage.parentToolUseId = message.parentToolUseId;
      }

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, newMessage],
      }));
    },
    [],
  );

  const updateLastAssistantMessage = useCallback((content: string) => {
    setState((prev) => {
      const messages = [...prev.messages];
      let lastAssistantIndex = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];
        if (message?.role === 'assistant') {
          lastAssistantIndex = i;
          break;
        }
      }

      if (lastAssistantIndex !== -1) {
        const message = messages[lastAssistantIndex];
        if (message) {
          messages[lastAssistantIndex] = {
            ...message,
            content,
          };
        }
      }

      return { ...prev, messages };
    });
  }, []);

  const updateMessage = useCallback(
    (
      messageId: string,
      updates: Partial<Omit<Message, 'toolUse'>> & { toolUse?: Partial<ToolUse> },
    ) => {
      setState((prev) => {
        const messages = [...prev.messages];
        const messageIndex = messages.findIndex((m) => m.id === messageId);

        if (messageIndex !== -1) {
          const currentMessage = messages[messageIndex];
          if (currentMessage) {
            const updatedMessage: Message = {
              id: currentMessage.id,
              role: updates.role ?? currentMessage.role,
              content: updates.content ?? currentMessage.content,
              timestamp: updates.timestamp ?? currentMessage.timestamp,
            };

            // Handle toolUse updates
            if (updates.toolUse) {
              if (currentMessage.toolUse) {
                updatedMessage.toolUse = {
                  ...currentMessage.toolUse,
                  ...updates.toolUse,
                } as ToolUse;
              } else {
                updatedMessage.toolUse = updates.toolUse as ToolUse;
              }
            } else if (currentMessage.toolUse) {
              updatedMessage.toolUse = currentMessage.toolUse;
            }

            // Handle parentToolUseId
            if (updates.parentToolUseId !== undefined) {
              updatedMessage.parentToolUseId = updates.parentToolUseId;
            } else if (currentMessage.parentToolUseId) {
              updatedMessage.parentToolUseId = currentMessage.parentToolUseId;
            }

            messages[messageIndex] = updatedMessage;
          }
        }

        return { ...prev, messages };
      });
    },
    [],
  );

  const setProcessing = useCallback((isProcessing: boolean) => {
    setState((prev) => ({ ...prev, isProcessing }));
  }, []);

  const setError = useCallback((error?: string) => {
    setState((prev) => {
      if (error) {
        return { ...prev, error };
      }
      const { error: _, ...rest } = prev;
      return rest as ChatState;
    });
  }, []);

  return {
    state,
    addMessage,
    updateMessage,
    updateLastAssistantMessage,
    setProcessing,
    setError,
  };
}

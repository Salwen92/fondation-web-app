import { Box, useApp } from 'ink';
import React, { useCallback } from 'react';
import { useChatInput } from '../../hooks/useChatInput';
import { useChatState } from '../../hooks/useChatState';
import { useClaudeQuery } from '../../hooks/useClaudeQuery';
import { ChatFooter } from './ChatFooter';
import { ChatHeader } from './ChatHeader';
import { ChatInput } from './ChatInput';
import { ChatScrollableArea } from './ChatScrollableArea';

export const ChatApp: React.FC = () => {
  const { exit } = useApp();
  const { state, addMessage, updateMessage, updateLastAssistantMessage, setProcessing, setError } =
    useChatState();

  const { processQuery, abort } = useClaudeQuery({
    onMessage: addMessage,
    onMessageUpdate: updateMessage,
    onAssistantUpdate: updateLastAssistantMessage,
    onComplete: () => setProcessing(false),
    onError: (error) => {
      setError(error.message);
      addMessage({
        role: 'system',
        content: `Error: ${error.message}`,
      });
      setProcessing(false);
    },
  });

  const handleSubmit = useCallback(
    async (userMessage: string) => {
      addMessage({ role: 'user', content: userMessage });
      setProcessing(true);
      setError(undefined);
    },
    [addMessage, setProcessing, setError],
  );

  const handleAbort = useCallback(() => {
    abort();
    setProcessing(false);
    addMessage({
      role: 'system',
      content: 'Response interrupted by user',
    });
  }, [abort, setProcessing, addMessage]);

  const { input, cursorPosition, showExitConfirmation, pastedBlocks } = useChatInput({
    onSubmit: handleSubmit,
    onExit: exit,
    isProcessing: state.isProcessing,
    onAbort: handleAbort,
  });

  // Process query when a new user message is added
  React.useEffect(() => {
    const lastMessage = state.messages[state.messages.length - 1];
    if (lastMessage?.role === 'user' && state.isProcessing) {
      processQuery(lastMessage.content).catch(() => {
        // Errors are already handled in processQuery
      });
    }
  }, [state.messages, state.isProcessing, processQuery]);

  return (
    <Box flexDirection="column">
      <ChatHeader />

      <ChatScrollableArea messages={state.messages} isProcessing={state.isProcessing} />

      <ChatFooter isProcessing={state.isProcessing} hasInput={input.length > 0} />

      <ChatInput
        value={input}
        cursorPosition={cursorPosition}
        isProcessing={state.isProcessing}
        showExitConfirmation={showExitConfirmation}
        pastedBlocks={pastedBlocks}
        {...(state.error ? { error: state.error } : {})}
      />
    </Box>
  );
};

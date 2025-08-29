import { Box, Text } from 'ink';
import type React from 'react';
import type { Message } from '../../../types/chat';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { Spinner } from '../spinners/Spinner';
import { ToolFactory } from '../tools/ToolFactory';

export interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  if (message.role === 'user') {
    return (
      <Box key={message.id} marginBottom={1}>
        <Text color="grey">
          {'>'} {message.content}
        </Text>
      </Box>
    );
  }

  if (message.role === 'assistant') {
    return (
      <Box key={message.id} marginBottom={1} flexDirection="column">
        <Box>
          {message.content ? (
            <MarkdownRenderer content={message.content} />
          ) : (
            <Spinner type="dots" />
          )}
        </Box>
      </Box>
    );
  }

  if (message.role === 'tool' && message.toolUse) {
    // Auto-expand certain tools that should always show their output
    const shouldAutoExpand = ['Bash', 'Read', 'Write', 'Edit', 'MultiEdit'].includes(
      message.toolUse.name,
    );

    return (
      <ToolFactory
        toolUse={message.toolUse}
        startTime={message.timestamp}
        {...(message.toolUse.result && { endTime: new Date() })}
        isExpanded={shouldAutoExpand}
      />
    );
  }

  if (message.role === 'system') {
    // If this system message is a tool result, render it with ToolFactory
    if (message.toolUse) {
      // Auto-expand certain tools that should always show their output
      const shouldAutoExpand = ['Bash', 'Read', 'Write', 'Edit', 'MultiEdit'].includes(
        message.toolUse.name,
      );

      return (
        <ToolFactory
          toolUse={{
            ...message.toolUse,
            result: message.toolUse.result || message.content,
          }}
          startTime={message.timestamp}
          {...(message.toolUse.result && { endTime: new Date() })}
          isExpanded={shouldAutoExpand}
        />
      );
    }

    // Regular system messages
    return (
      <Box key={message.id} marginBottom={1}>
        <Text color="blue" italic>
          {message.content}
        </Text>
      </Box>
    );
  }

  return null;
};

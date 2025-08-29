import { Box, Text } from 'ink';
import React from 'react';

export interface ChatInputProps {
  value: string;
  cursorPosition: number;
  isProcessing: boolean;
  error?: string;
  showExitConfirmation?: boolean;
  pastedBlocks?: Array<{
    id: string;
    lineCount: number;
    content: string;
    collapsed: boolean;
  }>;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  cursorPosition,
  isProcessing,
  error,
  showExitConfirmation,
  pastedBlocks: _pastedBlocks = [], // Reserved for future enhancements
}) => {
  // Render input with paste placeholders highlighted
  const renderInputWithPastePlaceholders = (text: string, cursorPos: number) => {
    const placeholderRegex = /\[Pasted text #\d+ \+\d+ lines\]/g;
    const parts: Array<{ text: string; isPlaceholder: boolean }> = [];
    let lastIndex = 0;
    let match = placeholderRegex.exec(text);

    while (match !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: text.slice(lastIndex, match.index), isPlaceholder: false });
      }
      parts.push({ text: match[0], isPlaceholder: true });
      lastIndex = match.index + match[0].length;
      match = placeholderRegex.exec(text);
    }

    if (lastIndex < text.length) {
      parts.push({ text: text.slice(lastIndex), isPlaceholder: false });
    }

    let currentPos = 0;
    return (
      <>
        {parts.map((part) => {
          const partStart = currentPos;
          const partEnd = currentPos + part.text.length;
          const partKey = `${partStart}-${part.isPlaceholder ? 'placeholder' : 'text'}`;
          currentPos = partEnd;

          if (part.isPlaceholder) {
            return (
              <Text key={partKey} color="blue" italic>
                {part.text}
              </Text>
            );
          }

          // Regular text with cursor
          if (cursorPos >= partStart && cursorPos <= partEnd) {
            const relativePos = cursorPos - partStart;
            return (
              <React.Fragment key={partKey}>
                {part.text.slice(0, relativePos)}
                <Text inverse> </Text>
                {part.text.slice(relativePos)}
              </React.Fragment>
            );
          }

          return <Text key={partKey}>{part.text}</Text>;
        })}
        {cursorPos >= text.length && <Text inverse> </Text>}
      </>
    );
  };
  return (
    <Box
      borderStyle="round"
      borderColor={isProcessing ? 'grey' : 'grey'}
      paddingX={1}
      flexDirection="column"
    >
      {showExitConfirmation ? (
        <Text color="yellow">Press Ctrl-C again to exit</Text>
      ) : isProcessing ? (
        <Box>
          <Text color="grey" bold>
            Processing...
          </Text>
          <Text color="grey" dimColor>
            {' '}
            Press ESC to stop
          </Text>
        </Box>
      ) : (
        <Text>
          <Text color="white" bold>
            {'> '}
          </Text>
          {renderInputWithPastePlaceholders(value, cursorPosition)}
        </Text>
      )}
      {error && !showExitConfirmation && (
        <Box marginTop={1}>
          <Text color="red">Error: {error}</Text>
        </Box>
      )}
    </Box>
  );
};

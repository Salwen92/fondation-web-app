import { Box, Text } from 'ink';
import type React from 'react';
import { Spinner } from '../spinners/Spinner';

export interface ChatFooterProps {
  isProcessing: boolean;
  hasInput: boolean;
}

export const ChatFooter: React.FC<ChatFooterProps> = ({ isProcessing, hasInput }) => {
  const isMacOS = process.platform === 'darwin';
  const modifierKey = isMacOS ? 'Cmd' : 'Ctrl';

  const getShortcutText = () => {
    if (isProcessing) {
      return 'ESC: Interrupt';
    }

    if (!hasInput) {
      return `${modifierKey}+C: Exit | Type to begin`;
    }

    // When typing
    return `Enter: Send | Backspace: Delete | ${modifierKey}+V: Paste | Ctrl+←/→: Words | ${modifierKey}+C: Exit`;
  };

  return (
    <Box justifyContent="space-between" paddingX={1}>
      <Text dimColor>{getShortcutText()}</Text>
      {isProcessing && <Spinner type="dots" />}
    </Box>
  );
};

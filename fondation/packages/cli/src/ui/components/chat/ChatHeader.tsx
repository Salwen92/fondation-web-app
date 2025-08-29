import { Box, Text } from 'ink';
import type React from 'react';

export interface ChatHeaderProps {
  title?: string;
  subtitle?: string;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  title = 'Fondation.io',
  subtitle = 'Powered by Claude Code SDK',
}) => {
  return (
    <Box borderStyle="round" borderColor="blue" paddingX={1}>
      <Text bold color="blue">
        {title}
      </Text>
      <Text dimColor> - {subtitle}</Text>
    </Box>
  );
};

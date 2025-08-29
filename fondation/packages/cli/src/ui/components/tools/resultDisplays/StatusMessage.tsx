import { Box, Text } from 'ink';
import type React from 'react';

interface StatusMessageProps {
  status: 'success' | 'error' | 'warning' | 'info';
  message: string;
  details?: string;
}

const statusConfig = {
  success: { icon: '✓', color: 'green' },
  error: { icon: '✗', color: 'red' },
  warning: { icon: '⚠', color: 'yellow' },
  info: { icon: 'ℹ', color: 'blue' },
};

export const StatusMessage: React.FC<StatusMessageProps> = ({ status, message, details }) => {
  const config = statusConfig[status];

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={config.color}>{config.icon} </Text>
        <Text>{message}</Text>
      </Box>
      {details && (
        <Box marginLeft={2}>
          <Text color="gray">{details}</Text>
        </Box>
      )}
    </Box>
  );
};

import { Box, Text } from 'ink';
import type React from 'react';
import { Spinner } from './spinners/Spinner';

export interface StatusDisplayProps {
  status: 'idle' | 'running' | 'completed' | 'error';
  message: string;
  details?: string;
}

export const StatusDisplay: React.FC<StatusDisplayProps> = ({ status, message, details }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'running':
        return 'yellow';
      case 'completed':
        return 'green';
      case 'error':
        return 'red';
      default:
        return 'white';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <Spinner type="dots" />;
      case 'completed':
        return <Text>[DONE]</Text>;
      case 'error':
        return <Text>[FAIL]</Text>;
      default:
        return <Text>[WAIT]</Text>;
    }
  };

  return (
    <Box flexDirection="column">
      <Box>
        <Box marginRight={1}>{getStatusIcon()}</Box>
        <Text color={getStatusColor()}>{message}</Text>
      </Box>
      {details && (
        <Box marginTop={1} marginLeft={2}>
          <Text dimColor>{details}</Text>
        </Box>
      )}
    </Box>
  );
};

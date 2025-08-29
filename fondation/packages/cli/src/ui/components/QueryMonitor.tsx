import { Box, Text } from 'ink';
import type React from 'react';
import { useEffect, useState } from 'react';
import { Spinner } from './spinners/Spinner';

export interface QueryStats {
  isActive: boolean;
  startTime?: Date;
  duration: number; // in milliseconds
  totalCost: number; // in USD
  numTurns: number;
  lastMessage?: string;
  status: 'waiting' | 'processing' | 'completed' | 'error';
}

export interface QueryMonitorProps {
  stats: QueryStats;
  showWarning?: boolean;
  warningThreshold?: number; // milliseconds
}

export const QueryMonitor: React.FC<QueryMonitorProps> = ({
  stats,
  showWarning = true,
  warningThreshold = 30000, // 30 seconds
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!stats.isActive) {
      return;
    }

    const timer = setInterval(() => {
      setElapsedTime(Date.now() - (stats.startTime?.getTime() || Date.now()));
    }, 100);

    return () => clearInterval(timer);
  }, [stats.isActive, stats.startTime]);

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const getStatusColor = () => {
    if (stats.status === 'error') {
      return 'red';
    }
    if (stats.status === 'completed') {
      return 'green';
    }
    if (showWarning && elapsedTime > warningThreshold) {
      return 'yellow';
    }
    return 'blue';
  };

  const getStatusMessage = () => {
    switch (stats.status) {
      case 'waiting':
        return 'Initializing Claude query...';
      case 'processing':
        return 'Claude is processing your request...';
      case 'completed':
        return 'Query completed successfully';
      case 'error':
        return 'Query encountered an error';
      default:
        return 'Unknown status';
    }
  };

  const isStuckWarning = showWarning && elapsedTime > warningThreshold && stats.isActive;

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="gray" padding={1} flexShrink={1}>
      <Text bold underline>
        Claude Query Monitor
      </Text>

      <Box marginTop={1}>
        <Box marginRight={1}>
          {stats.isActive && stats.status === 'processing' ? (
            <Spinner type="dots" />
          ) : (
            <Text>
              {stats.status === 'completed'
                ? '[DONE]'
                : stats.status === 'error'
                  ? '[FAIL]'
                  : '[WAIT]'}
            </Text>
          )}
        </Box>
        <Text color={getStatusColor()}>{getStatusMessage()}</Text>
      </Box>

      {stats.isActive && (
        <Box flexDirection="column" marginTop={1}>
          <Box justifyContent="space-between">
            <Text>
              Duration: <Text color="cyan">{formatDuration(elapsedTime)}</Text>
            </Text>
            <Text>
              Turns: <Text color="magenta">{stats.numTurns}</Text>
            </Text>
          </Box>

          <Box justifyContent="space-between" marginTop={1}>
            <Text>
              Cost: <Text color="green">${stats.totalCost.toFixed(4)}</Text>
            </Text>
          </Box>

          {isStuckWarning && (
            <Box marginTop={1}>
              <Text color="yellow">
                [WARNING] Query is taking longer than expected. It may be processing a complex
                request.
              </Text>
            </Box>
          )}
        </Box>
      )}

      {stats.lastMessage && (
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>Last Assistant Message:</Text>
          <Box marginLeft={2} marginTop={1} flexShrink={1}>
            <Text wrap="wrap">
              {stats.lastMessage.length > 150
                ? `${stats.lastMessage.substring(0, 150)}...`
                : stats.lastMessage}
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};

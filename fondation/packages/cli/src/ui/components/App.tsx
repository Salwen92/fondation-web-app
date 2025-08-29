import { Box, Text } from 'ink';
import type React from 'react';
import { useEffect, useState } from 'react';
import { ProgressTracker, type WorkflowStep } from './ProgressTracker';
import { QueryMonitor, type QueryStats } from './QueryMonitor';
import { StatusDisplay } from './StatusDisplay';

export interface AppProps {
  command: string;
  projectPath?: string;
  outputPath?: string;
  workflowSteps?: WorkflowStep[];
  currentStepIndex?: number;
  overallProgress?: number;
  queryStats?: QueryStats;
  statusMessage?: string;
  statusDetails?: string;
  logs?: string[];
  error?: {
    message: string;
    details?: string;
    type?: 'claude-process' | 'general';
  };
}

export const App: React.FC<AppProps> = ({
  command,
  projectPath,
  outputPath,
  workflowSteps = [],
  currentStepIndex = 0,
  overallProgress = 0,
  queryStats = {
    isActive: false,
    duration: 0,
    totalCost: 0,
    numTurns: 0,
    status: 'waiting',
  },
  statusMessage = 'Ready',
  statusDetails,
  logs = [],
  error,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Check if we're in VS Code terminal for better compatibility
  // const isVSCode = process.env['TERM_PROGRAM'] === 'vscode';

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <Box flexDirection="column" minWidth={60}>
      {/* Header */}
      <Box borderStyle="round" borderColor="blue" padding={1} marginBottom={1} flexShrink={0}>
        <Box flexDirection="column" width="100%">
          <Text bold color="blue">
            Claude Prompts CLI Tool
          </Text>
          <Box justifyContent="space-between" marginTop={1}>
            <Text wrap="wrap">
              Command: <Text color="cyan">{command}</Text>
            </Text>
            <Text dimColor>{currentTime.toLocaleTimeString()}</Text>
          </Box>
          {projectPath && (
            <Text wrap="wrap">
              Project: <Text color="green">{projectPath}</Text>
            </Text>
          )}
          {outputPath && (
            <Text wrap="wrap">
              Output: <Text color="yellow">{outputPath}</Text>
            </Text>
          )}
        </Box>
      </Box>

      {/* Error Display */}
      {error && (
        <Box borderStyle="round" borderColor="red" padding={1} marginBottom={1} flexShrink={0}>
          <Box flexDirection="column" width="100%">
            <Text bold color="red">
              [ERROR] {error.type === 'claude-process' ? 'Claude Process Error' : 'Error'}
            </Text>
            <Box marginTop={1}>
              <Text color="red" wrap="wrap">
                {error.message}
              </Text>
            </Box>
            {error.details && (
              <Box marginTop={1}>
                <Text dimColor wrap="wrap">
                  {error.details}
                </Text>
              </Box>
            )}
            {error.type === 'claude-process' && (
              <Box marginTop={1}>
                <Text color="yellow">
                  Tip: Try running the command again or check system resources
                </Text>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* Main Content Area */}
      <Box flexGrow={1} flexDirection="row" minHeight={0}>
        {/* Left Column - Progress and Status */}
        <Box
          flexDirection="column"
          flexGrow={1}
          flexBasis={0}
          marginRight={2}
          flexShrink={1}
          minWidth={25}
        >
          {/* Current Status */}
          <Box marginBottom={1}>
            <StatusDisplay
              status={queryStats.isActive ? 'running' : 'idle'}
              message={statusMessage}
              {...(statusDetails ? { details: statusDetails } : {})}
            />
          </Box>

          {/* Workflow Progress (only show if we have workflow steps) */}
          {workflowSteps.length > 0 && (
            <Box marginBottom={1}>
              <ProgressTracker
                steps={workflowSteps}
                currentStepIndex={currentStepIndex}
                overallProgress={overallProgress}
              />
            </Box>
          )}
        </Box>

        {/* Right Column - Query Monitor and Logs */}
        <Box flexDirection="column" flexGrow={1} flexBasis={0} flexShrink={1} minWidth={25}>
          {/* Claude Query Monitor */}
          <Box marginBottom={1}>
            <QueryMonitor stats={queryStats} />
          </Box>

          {/* Recent Logs */}
          {logs.length > 0 && (
            <Box
              borderStyle="round"
              borderColor="gray"
              padding={1}
              flexDirection="column"
              flexShrink={1}
              minHeight={5}
            >
              <Text bold underline>
                Recent Logs:
              </Text>
              <Box flexDirection="column" marginTop={1}>
                {logs.slice(-5).map((log, index) => (
                  <Text key={`log-${index}-${log.slice(0, 20)}`} dimColor wrap="wrap">
                    {log}
                  </Text>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* Footer */}
      <Box borderStyle="round" borderColor="gray" padding={1} marginTop={1} flexShrink={0}>
        <Box justifyContent="space-between" width="100%">
          <Text dimColor>Press Ctrl+C to cancel</Text>
          <Text dimColor>Claude Code SDK</Text>
        </Box>
      </Box>
    </Box>
  );
};

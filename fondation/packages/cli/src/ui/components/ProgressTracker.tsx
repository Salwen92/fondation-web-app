import { Box, Text } from 'ink';
import type React from 'react';

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
}

export interface ProgressTrackerProps {
  steps: WorkflowStep[];
  currentStepIndex: number;
  overallProgress: number; // 0 to 1
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  steps,
  currentStepIndex,
  overallProgress,
}) => {
  const getStepIcon = (step: WorkflowStep, index: number) => {
    if (step.status === 'completed') {
      return '[DONE]';
    }
    if (step.status === 'error') {
      return '[FAIL]';
    }
    if (step.status === 'running') {
      return '[RUN]';
    }
    if (index < currentStepIndex) {
      return '[DONE]';
    }
    if (index === currentStepIndex) {
      return '[>>]';
    }
    return '[...]';
  };

  const getStepColor = (step: WorkflowStep, index: number) => {
    if (step.status === 'completed' || index < currentStepIndex) {
      return 'green';
    }
    if (step.status === 'error') {
      return 'red';
    }
    if (step.status === 'running' || index === currentStepIndex) {
      return 'yellow';
    }
    return 'gray';
  };

  const createProgressBar = (percent: number, width: number = 25) => {
    const filled = Math.round(percent * width);
    const empty = width - filled;
    return '='.repeat(filled) + '-'.repeat(empty);
  };

  return (
    <Box flexDirection="column">
      {/* Overall Progress Bar */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold>Overall Progress ({Math.round(overallProgress * 100)}%)</Text>
        <Text color="green">{createProgressBar(overallProgress)}</Text>
      </Box>

      {/* Step-by-step Progress */}
      <Box flexDirection="column">
        <Text bold underline>
          Workflow Steps:
        </Text>
        {steps.map((step, index) => (
          <Box key={step.id} marginY={0}>
            <Box marginRight={1}>
              <Text>{getStepIcon(step, index)}</Text>
            </Box>
            <Box flexDirection="column" flexGrow={1}>
              <Text color={getStepColor(step, index)} bold={index === currentStepIndex}>
                {index + 1}. {step.name}
              </Text>
              {index === currentStepIndex && (
                <Box marginLeft={2}>
                  <Text dimColor>{step.description}</Text>
                </Box>
              )}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

import { Box, Text } from 'ink';
import type { ZodError, z } from 'zod';
import type { ToolResultSchemasStructured } from '../../../schemas/toolResultsStructured';
import type { ToolSchemas } from '../../../schemas/tools';
import type { ToolStatus } from '../../../types/chat';
import { Spinner } from '../spinners/Spinner';
import { toolStyles } from './styles';
import { getToolConfig, type ToolConfig } from './toolConfigs';

interface ToolRendererProps<TName extends keyof typeof ToolSchemas> {
  name: TName;
  input: unknown;
  rawResult?: string;
  parsedResult?: unknown;
  error?: ZodError | Error;
  status?: ToolStatus;
  startTime?: Date;
  endTime?: Date;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export function ToolRenderer<TName extends keyof typeof ToolSchemas>({
  name,
  input,
  rawResult,
  parsedResult,
  error,
  status = 'pending',
  startTime,
  endTime,
  isExpanded = false,
}: ToolRendererProps<TName>) {
  const config = getToolConfig(name) as ToolConfig<TName> | undefined;

  const getStatusIndicator = () => {
    switch (status) {
      case 'completed':
        return <Text color="green">⏺</Text>;
      case 'in_progress':
        return <Text color="white">⏺</Text>;
      default:
        return (
          <Text color="gray">
            <Spinner type="dots" />
          </Text>
        );
    }
  };

  const getExecutionTime = () => {
    if (startTime && endTime) {
      const duration = endTime.getTime() - startTime.getTime();
      return `${(duration / 1000).toFixed(1)}s`;
    }
    return null;
  };

  if (!config) {
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Box flexDirection="row" alignItems="center">
          {getStatusIndicator()}
          <Text bold>{name}</Text>
        </Box>
        {error && (
          <Box marginLeft={2}>
            <Text color="red">Error: {error.message}</Text>
          </Box>
        )}
      </Box>
    );
  }

  const typedInput = input as z.infer<(typeof ToolSchemas)[TName]>;
  const inputPreview = config.formatInput(typedInput);
  const typedParsedResult = parsedResult as TName extends keyof typeof ToolResultSchemasStructured
    ? z.infer<(typeof ToolResultSchemasStructured)[TName]>
    : unknown;
  const resultSummary = config.getSummary(typedInput, rawResult, typedParsedResult);
  const executionTime = getExecutionTime();
  const shouldAutoExpand = config.autoExpand && status === 'completed';

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box flexDirection="row" alignItems="center">
        {getStatusIndicator()}
        <Box marginLeft={0}>
          <Text bold color={error && status === 'completed' ? 'red' : 'white'}>
            {name}
          </Text>
          <Text>
            ({inputPreview}){executionTime && status === 'completed' && ` ${executionTime}`}
          </Text>
        </Box>
      </Box>

      {status !== 'completed' && config.renderInput && (
        <Box flexDirection="row" marginLeft={2}>
          <Text color="gray">⎿</Text>
          <Box marginLeft={1}>{config.renderInput(typedInput)}</Box>
        </Box>
      )}

      {status === 'completed' && (resultSummary || error) && (
        <Box flexDirection="row" marginLeft={2}>
          <Text color="gray">⎿</Text>
          <Box marginLeft={1}>
            {error ? (
              <Text color={toolStyles.errorColor}>Error: {error.message}</Text>
            ) : (
              <Text color="gray">{resultSummary}</Text>
            )}
          </Box>
        </Box>
      )}

      {(isExpanded || shouldAutoExpand) &&
        status === 'completed' &&
        rawResult &&
        !error &&
        config.renderResult && (
          <Box flexDirection="column" marginLeft={4} marginTop={1}>
            {config.renderResult(rawResult, typedParsedResult)}
          </Box>
        )}
    </Box>
  );
}

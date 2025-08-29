import type React from 'react';
import type { z } from 'zod';
import { ToolSchemas } from '../../../schemas/tools';
import type { ToolUse } from '../../../types/chat';
import { ToolRenderer } from './ToolRenderer';
import { getToolConfig } from './toolConfigs';

export interface ToolFactoryProps {
  toolUse: ToolUse;
  startTime?: Date;
  endTime?: Date;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const ToolFactory: React.FC<ToolFactoryProps> = ({
  toolUse,
  startTime,
  endTime,
  isExpanded,
  onToggleExpand,
}) => {
  // Check if this is a known tool type
  const isKnownTool = toolUse.name in ToolSchemas;

  if (isKnownTool) {
    const toolName = toolUse.name as keyof typeof ToolSchemas;
    const schema = ToolSchemas[toolName];

    // Validate input
    let validatedInput = toolUse.input;
    let validationError: z.ZodError | undefined;

    if (schema) {
      const result = schema.safeParse(toolUse.input);
      if (result.success) {
        validatedInput = result.data;
      } else {
        validationError = result.error;
      }
    }

    // Parse result using tool-specific parser
    const toolConfig = getToolConfig(toolName);
    let parsedResult: unknown;
    if (toolUse.result && toolConfig?.parseResult) {
      parsedResult = toolConfig.parseResult(toolUse.result);
    } else if (toolUse.result) {
      // Fallback to JSON parsing for tools without custom parsers
      try {
        parsedResult = JSON.parse(toolUse.result);
      } catch {
        // If JSON parsing fails, keep parsedResult undefined
      }
    }

    return (
      <ToolRenderer
        name={toolName}
        input={validatedInput}
        {...(toolUse.result !== undefined && { rawResult: toolUse.result })}
        {...(parsedResult !== undefined && { parsedResult })}
        {...(validationError && { error: validationError })}
        {...(toolUse.status !== undefined && { status: toolUse.status })}
        {...(startTime !== undefined && { startTime })}
        {...(endTime !== undefined && { endTime })}
        {...(isExpanded !== undefined && { isExpanded })}
        {...(onToggleExpand !== undefined && { onToggleExpand })}
      />
    );
  }

  // Fallback for unknown tools
  return (
    <ToolRenderer
      name={toolUse.name as keyof typeof ToolSchemas}
      input={toolUse.input ?? {}}
      {...(toolUse.result !== undefined && { rawResult: toolUse.result })}
      {...(toolUse.status !== undefined && { status: toolUse.status })}
      {...(startTime !== undefined && { startTime })}
      {...(endTime !== undefined && { endTime })}
    />
  );
};

import path from 'node:path';
import { Box, Text } from 'ink';
import type React from 'react';
import type { z } from 'zod';
import type { ToolResultSchemasStructured } from '../../../schemas/toolResultsStructured';
import type { ToolSchemas } from '../../../schemas/tools';
import { toolParsers } from './parsers';
import { CodeBlock } from './resultDisplays/CodeBlock';
import { FileList } from './resultDisplays/FileList';
import { StatusMessage } from './resultDisplays/StatusMessage';
import { toolStyles } from './styles';

export interface ToolConfig<TName extends keyof typeof ToolSchemas> {
  name: TName;
  autoExpand?: boolean;
  getSummary: (
    input: z.infer<(typeof ToolSchemas)[TName]>,
    result?: string,
    parsedResult?: TName extends keyof typeof ToolResultSchemasStructured
      ? z.infer<(typeof ToolResultSchemasStructured)[TName]>
      : unknown,
  ) => string | null;
  formatInput: (input: z.infer<(typeof ToolSchemas)[TName]>) => string;
  renderInput?: (input: z.infer<(typeof ToolSchemas)[TName]>) => React.ReactNode;
  renderResult?: (
    rawResult: string | undefined,
    parsedResult: TName extends keyof typeof ToolResultSchemasStructured
      ? z.infer<(typeof ToolResultSchemasStructured)[TName]> | undefined
      : unknown,
  ) => React.ReactNode;
  parseResult?: (
    rawResult: string,
  ) => TName extends keyof typeof ToolResultSchemasStructured
    ? z.infer<(typeof ToolResultSchemasStructured)[TName]> | undefined
    : unknown;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes}B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)}KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function getRelativePath(filePath: string): string {
  if (filePath === process.cwd()) {
    return '.';
  }
  return `./${path.relative(process.cwd(), filePath)}`;
}

export const toolConfigs: { [K in keyof typeof ToolSchemas]: ToolConfig<K> } = {
  Read: {
    name: 'Read',
    autoExpand: true,
    formatInput: (input) => getRelativePath(input.file_path),
    parseResult: toolParsers.Read,
    getSummary: (_input, result, parsedResult) => {
      if (!result) {
        return null;
      }
      if (parsedResult) {
        return `Read ${parsedResult.lineCount} lines (${formatBytes(parsedResult.charCount)})`;
      }
      const lines = result.split('\n').length;
      return `Read ${lines} lines`;
    },
    renderResult: (rawResult) => {
      if (!rawResult) {
        return <Text color="gray">No content</Text>;
      }
      return <CodeBlock content={rawResult} />;
    },
  },

  Write: {
    name: 'Write',
    autoExpand: true,
    formatInput: (input) => getRelativePath(input.file_path),
    getSummary: (input, result) => {
      if (!result) {
        return null;
      }
      const lines = input.content.split('\n').length;
      return `Wrote ${lines} lines`;
    },
    renderResult: (rawResult) => {
      if (!rawResult) {
        return <Text color="gray">No content</Text>;
      }
      return <CodeBlock content={rawResult} />;
    },
  },

  Bash: {
    name: 'Bash',
    autoExpand: true,
    formatInput: (input) => input.command,
    parseResult: toolParsers.Bash,
    renderInput: (input) => (
      <Box flexDirection="column">
        {input.description && (
          <Text color="gray" italic>
            {input.description}
          </Text>
        )}
        <Box>
          <Text color="green">$ </Text>
          <Text color={toolStyles.parameterColor}>{input.command}</Text>
        </Box>
      </Box>
    ),
    getSummary: (_input, result, parsedResult) => {
      if (!result) {
        return null;
      }
      if (parsedResult) {
        return parsedResult.exitCode === 0
          ? 'Completed'
          : `Failed (exit code: ${parsedResult.exitCode})`;
      }
      return 'Completed';
    },
    renderResult: (rawResult, parsedResult) => {
      if (!rawResult) {
        return <Text color="gray">No output</Text>;
      }
      return (
        <Box flexDirection="column">
          {parsedResult && (
            <StatusMessage
              status={parsedResult.exitCode === 0 ? 'success' : 'error'}
              message={`Exit code: ${parsedResult.exitCode}`}
            />
          )}
          <CodeBlock content={parsedResult?.stdout || rawResult} />
        </Box>
      );
    },
  },

  Edit: {
    name: 'Edit',
    autoExpand: true,
    formatInput: (input) => getRelativePath(input.file_path),
    getSummary: () => 'Modified file',
    renderResult: (rawResult) => {
      if (!rawResult) {
        return <Text color="gray">No changes</Text>;
      }
      return <CodeBlock content={rawResult} />;
    },
  },

  MultiEdit: {
    name: 'MultiEdit',
    autoExpand: true,
    formatInput: (input) => {
      return `${getRelativePath(input.file_path)} (${input.edits.length} edits)`;
    },
    getSummary: (input) => `Applied ${input.edits.length} edits`,
    renderResult: (rawResult) => {
      if (!rawResult) {
        return <Text color="gray">No changes</Text>;
      }
      return <CodeBlock content={rawResult} />;
    },
  },

  LS: {
    name: 'LS',
    formatInput: (input) => getRelativePath(input.path),
    parseResult: toolParsers.LS,
    getSummary: (_input, result, parsedResult) => {
      if (!result) {
        return null;
      }
      if (parsedResult) {
        const dirs = parsedResult.items.filter((i) => i.type === 'directory').length;
        const files = parsedResult.items.filter((i) => i.type === 'file').length;
        return `Found ${files} files, ${dirs} directories`;
      }
      const lines = result.split('\n').filter((l) => l.trim()).length;
      return `Found ${lines} items`;
    },
    renderResult: (rawResult, _parsedResult) => {
      if (!rawResult) {
        return <Text color="gray">No items</Text>;
      }
      const files = rawResult.split('\n').filter((l) => l.trim());
      return <FileList files={files} />;
    },
  },

  Glob: {
    name: 'Glob',
    formatInput: (input) => input.pattern,
    parseResult: toolParsers.Glob,
    getSummary: (_input, result, parsedResult) => {
      if (!result) {
        return null;
      }
      if (parsedResult) {
        return `Found ${parsedResult.matchCount} matches`;
      }
      const lines = result.split('\n').filter((l) => l.trim()).length;
      return `Found ${lines} matches`;
    },
    renderResult: (rawResult, parsedResult) => {
      if (!rawResult) {
        return <Text color="gray">No matches</Text>;
      }
      const files = parsedResult?.matches || rawResult.split('\n').filter((l) => l.trim());
      return <FileList files={files} />;
    },
  },

  Grep: {
    name: 'Grep',
    formatInput: (input) => input.pattern,
    parseResult: toolParsers.Grep,
    getSummary: (_input, result, parsedResult) => {
      if (!result) {
        return null;
      }
      if (parsedResult) {
        return `Found ${parsedResult.matchCount} matches in ${parsedResult.fileCount} files`;
      }
      const lines = result.split('\n').filter((l) => l.trim()).length;
      return `Found ${lines} matches`;
    },
    renderResult: (rawResult, _parsedResult) => {
      if (!rawResult) {
        return <Text color="gray">No matches</Text>;
      }
      const files = rawResult.split('\n').filter((l) => l.trim());
      return <FileList files={files} />;
    },
  },

  TodoRead: {
    name: 'TodoRead',
    formatInput: () => 'Read todos',
    parseResult: toolParsers.TodoRead,
    getSummary: (_input, _result, parsedResult) => {
      if (!parsedResult) {
        return null;
      }
      return `${parsedResult.totalCount} todos (${parsedResult.completedCount} completed)`;
    },
  },

  TodoWrite: {
    name: 'TodoWrite',
    formatInput: (input) => `Update ${input.todos.length} todos`,
    getSummary: (input) => `Updated ${input.todos.length} todos`,
  },

  Task: {
    name: 'Task',
    autoExpand: true,
    formatInput: (input) => input.description,
    getSummary: () => 'Task completed',
    renderResult: (rawResult) => {
      if (!rawResult) {
        return <Text color="gray">No output</Text>;
      }
      return <CodeBlock content={rawResult} />;
    },
  },

  WebSearch: {
    name: 'WebSearch',
    autoExpand: true,
    formatInput: (input) => input.query,
    getSummary: (_input, result) => {
      if (!result) {
        return null;
      }
      return 'Search completed';
    },
    renderResult: (rawResult) => {
      if (!rawResult) {
        return <Text color="gray">No results</Text>;
      }
      return <CodeBlock content={rawResult} />;
    },
  },

  WebFetch: {
    name: 'WebFetch',
    autoExpand: true,
    formatInput: (input) => {
      try {
        const url = new URL(input.url);
        return url.hostname + url.pathname;
      } catch {
        return input.url;
      }
    },
    getSummary: () => 'Content fetched and analyzed',
    renderResult: (rawResult) => {
      if (!rawResult) {
        return <Text color="gray">No content</Text>;
      }
      return <CodeBlock content={rawResult} />;
    },
  },

  NotebookRead: {
    name: 'NotebookRead',
    autoExpand: true,
    formatInput: (input) => getRelativePath(input.notebook_path),
    getSummary: (input, result) => {
      if (!result) {
        return null;
      }
      if (input.cell_id) {
        return 'Read cell';
      }
      return 'Read notebook';
    },
    renderResult: (rawResult) => {
      if (!rawResult) {
        return <Text color="gray">No content</Text>;
      }
      return <CodeBlock content={rawResult} />;
    },
  },

  NotebookEdit: {
    name: 'NotebookEdit',
    autoExpand: true,
    formatInput: (input) => getRelativePath(input.notebook_path),
    getSummary: (input) => {
      if (input.edit_mode === 'delete') {
        return 'Deleted cell';
      }
      if (input.edit_mode === 'insert') {
        return 'Inserted cell';
      }
      return 'Modified cell';
    },
    renderResult: (rawResult) => {
      if (!rawResult) {
        return <Text color="gray">No changes</Text>;
      }
      return <CodeBlock content={rawResult} />;
    },
  },

  exit_plan_mode: {
    name: 'exit_plan_mode',
    autoExpand: true,
    formatInput: () => 'Exit planning mode',
    getSummary: () => 'Plan presented',
    renderResult: (rawResult) => {
      if (!rawResult) {
        return <Text color="gray">No plan</Text>;
      }
      return <CodeBlock content={rawResult} />;
    },
  },
};

export function getToolConfig<TName extends keyof typeof ToolSchemas>(
  name: TName,
): ToolConfig<TName> | undefined {
  return toolConfigs[name];
}

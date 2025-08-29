import type { z } from 'zod';
import type {
  BashToolResultSchema,
  EditToolResultSchema,
  GlobToolResultSchema,
  GrepToolResultSchema,
  LSToolResultSchema,
  MultiEditToolResultSchema,
  ReadToolResultSchema,
  TaskToolResultSchema,
  TodoReadToolResultSchema,
  TodoWriteToolResultSchema,
  WriteToolResultSchema,
} from '../../../../schemas/toolResultsStructured';

/**
 * Parse Read tool output
 */
export function parseReadResult(
  rawResult: string,
): z.infer<typeof ReadToolResultSchema> | undefined {
  if (!rawResult) {
    return undefined;
  }

  const lines = rawResult.split('\n');
  const content = rawResult;

  return {
    content,
    lineCount: lines.length,
    charCount: rawResult.length,
    encoding: 'utf-8',
    truncated: false,
  };
}

/**
 * Parse Bash tool output
 */
export function parseBashResult(
  rawResult: string,
): z.infer<typeof BashToolResultSchema> | undefined {
  if (!rawResult) {
    return undefined;
  }

  // Look for exit code in the last line
  const lines = rawResult.split('\n');
  const lastLine = lines[lines.length - 1];
  const exitCodeMatch = lastLine?.match(/Exit code: (\d+)/);
  const exitCode = exitCodeMatch?.[1] ? Number.parseInt(exitCodeMatch[1], 10) : 0;

  // Remove exit code line from output
  const stdout = exitCodeMatch ? lines.slice(0, -1).join('\n') : rawResult;

  return {
    stdout,
    stderr: '',
    exitCode,
    executionTime: 0,
  };
}

/**
 * Parse LS tool output
 */
export function parseLSResult(rawResult: string): z.infer<typeof LSToolResultSchema> | undefined {
  if (!rawResult) {
    return undefined;
  }

  const lines = rawResult.split('\n').filter((line) => line.trim());
  const items = lines.map((line) => {
    // Simple parsing - just get the name
    // In a real implementation, we'd parse file type, size, etc.
    const name = line.trim();
    const isDirectory = line.endsWith('/');

    return {
      name: isDirectory ? name.slice(0, -1) : name,
      type: isDirectory ? ('directory' as const) : ('file' as const),
    };
  });

  return {
    items,
    totalCount: items.length,
  };
}

/**
 * Parse Glob tool output
 */
export function parseGlobResult(
  rawResult: string,
): z.infer<typeof GlobToolResultSchema> | undefined {
  if (!rawResult) {
    return undefined;
  }

  const matches = rawResult.split('\n').filter((line) => line.trim());

  return {
    matches,
    matchCount: matches.length,
  };
}

/**
 * Parse Grep tool output
 */
export function parseGrepResult(
  rawResult: string,
): z.infer<typeof GrepToolResultSchema> | undefined {
  if (!rawResult) {
    return undefined;
  }

  // For now, just return file paths
  const files = rawResult.split('\n').filter((line) => line.trim());
  const matches = files.map((file, index) => ({
    file,
    line: index + 1,
    content: '',
    match: '',
  }));

  const uniqueFiles = new Set(files);

  return {
    matches,
    fileCount: uniqueFiles.size,
    matchCount: matches.length,
  };
}

/**
 * Parse TodoRead tool output
 */
export function parseTodoReadResult(
  rawResult: string,
): z.infer<typeof TodoReadToolResultSchema> | undefined {
  if (!rawResult) {
    return undefined;
  }

  try {
    // TodoRead returns JSON
    const parsed = JSON.parse(rawResult);
    if (Array.isArray(parsed)) {
      const todos = parsed.map((todo) => ({
        id: todo.id || '',
        content: todo.content || '',
        status: todo.status || 'pending',
        priority: todo.priority || 'medium',
      }));

      const completedCount = todos.filter((t) => t.status === 'completed').length;

      return {
        todos,
        totalCount: todos.length,
        completedCount,
      };
    }
  } catch {
    // Failed to parse
  }

  return undefined;
}

/**
 * Parse Write tool output
 */
export function parseWriteResult(
  rawResult: string,
): z.infer<typeof WriteToolResultSchema> | undefined {
  if (!rawResult) {
    return undefined;
  }

  // Extract file path from success message
  const pathMatch = rawResult.match(/File written to: (.+)/);
  const path = pathMatch?.[1] || '';

  return {
    success: true,
    bytesWritten: rawResult.length,
    path,
  };
}

/**
 * Parse Edit tool output
 */
export function parseEditResult(
  rawResult: string,
): z.infer<typeof EditToolResultSchema> | undefined {
  if (!rawResult) {
    return undefined;
  }

  // Extract replacements count if available
  const replacementMatch = rawResult.match(/(\d+) replacements? made/);
  const replacements = replacementMatch?.[1] ? Number.parseInt(replacementMatch[1], 10) : 1;

  return {
    success: true,
    replacements,
    filePath: '',
  };
}

/**
 * Parse MultiEdit tool output
 */
export function parseMultiEditResult(
  rawResult: string,
): z.infer<typeof MultiEditToolResultSchema> | undefined {
  if (!rawResult) {
    return undefined;
  }

  // Extract edit count from output
  const editMatch = rawResult.match(/(\d+) edits? applied/);
  const editsApplied = editMatch?.[1] ? Number.parseInt(editMatch[1], 10) : 0;

  return {
    success: true,
    editsApplied,
    totalReplacements: editsApplied,
    filePath: '',
  };
}

/**
 * Parse TodoWrite tool output
 */
export function parseTodoWriteResult(
  rawResult: string,
): z.infer<typeof TodoWriteToolResultSchema> | undefined {
  if (!rawResult) {
    return undefined;
  }

  // Extract count from success message
  const countMatch = rawResult.match(/(\d+) todos? updated/);
  const todosUpdated = countMatch?.[1] ? Number.parseInt(countMatch[1], 10) : 0;

  return {
    success: true,
    todosUpdated,
  };
}

/**
 * Parse Task tool output
 */
export function parseTaskResult(
  rawResult: string,
): z.infer<typeof TaskToolResultSchema> | undefined {
  if (!rawResult) {
    return undefined;
  }

  return {
    taskId: `task-${Date.now()}`,
    status: 'completed' as const,
    output: rawResult,
    duration: 0,
  };
}

// Export a map of parsers
export const toolParsers = {
  Read: parseReadResult,
  Bash: parseBashResult,
  LS: parseLSResult,
  Glob: parseGlobResult,
  Grep: parseGrepResult,
  TodoRead: parseTodoReadResult,
  Write: parseWriteResult,
  Edit: parseEditResult,
  MultiEdit: parseMultiEditResult,
  TodoWrite: parseTodoWriteResult,
  Task: parseTaskResult,
} as const;

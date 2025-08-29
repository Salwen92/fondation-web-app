import { z } from 'zod';

// Base schemas for common result types
export const StringResultSchema = z.string();
export const FileListResultSchema = z.string(); // File list comes as a string with newlines
export const EmptyResultSchema = z.literal('');

// Tool-specific result schemas
export const BashResultSchema = z.string();
export const ReadResultSchema = z.string();
export const WriteResultSchema = z.string();
export const EditResultSchema = z.string();
export const MultiEditResultSchema = z.string();
export const LSResultSchema = z.string();
export const GlobResultSchema = z.string();
export const GrepResultSchema = z.string();
export const TodoReadResultSchema = z.string();
export const TodoWriteResultSchema = z.string();
export const WebFetchResultSchema = z.string();
export const WebSearchResultSchema = z.string();
export const NotebookReadResultSchema = z.string();
export const NotebookEditResultSchema = z.string();

// Task tool can return various structures
export const TaskResultSchema = z.union([
  z.string(),
  z.object({
    description: z.string().optional(),
    result: z.unknown(),
  }),
  z.unknown(),
]);

// Mapping of tool names to their result schemas
export const toolResultSchemas = {
  Bash: BashResultSchema,
  Read: ReadResultSchema,
  Write: WriteResultSchema,
  Edit: EditResultSchema,
  MultiEdit: MultiEditResultSchema,
  LS: LSResultSchema,
  Glob: GlobResultSchema,
  Grep: GrepResultSchema,
  TodoRead: TodoReadResultSchema,
  TodoWrite: TodoWriteResultSchema,
  WebFetch: WebFetchResultSchema,
  WebSearch: WebSearchResultSchema,
  NotebookRead: NotebookReadResultSchema,
  NotebookEdit: NotebookEditResultSchema,
  Task: TaskResultSchema,
  exit_plan_mode: z.string(),
} as const;

export type ToolName = keyof typeof toolResultSchemas;

// Generic tool result content schema
export const ToolResultContentSchema = z.union([
  StringResultSchema,
  TaskResultSchema,
  z.unknown(), // Fallback for unknown types
]);

// Helper function to safely parse tool result content
export function parseToolResultContent(
  toolName: string,
  content: unknown,
): {
  success: boolean;
  data: unknown;
  error?: z.ZodError;
} {
  const schema = toolResultSchemas[toolName as ToolName];

  if (!schema) {
    // Unknown tool, return raw content
    return { success: true, data: content };
  }

  const result = schema.safeParse(content);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, data: content, error: result.error };
}

// Helper function to format content for display
export function formatToolResultContent(content: unknown, maxLength: number = 200): string {
  if (typeof content === 'string') {
    return content.length > maxLength ? `${content.substring(0, maxLength)}...` : content;
  }

  if (content === null || content === undefined) {
    return '(empty)';
  }

  if (typeof content === 'object') {
    try {
      const jsonStr = JSON.stringify(content, null, 2);
      return jsonStr.length > maxLength ? `${jsonStr.substring(0, maxLength)}...` : jsonStr;
    } catch {
      return '[Complex object]';
    }
  }

  return String(content);
}

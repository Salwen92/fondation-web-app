import { z } from 'zod';

// Tool Input Schemas
export const ReadToolInputSchema = z.object({
  file_path: z.string(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});

export const WriteToolInputSchema = z.object({
  file_path: z.string(),
  content: z.string(),
});

export const BashToolInputSchema = z.object({
  command: z.string(),
  description: z.string().optional(),
  timeout: z.number().optional(),
});

// LS Tool Result Schema
export const LSToolResultSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      type: z.enum(['file', 'directory', 'symlink']),
      size: z.number().optional(),
      modified: z.string().optional(),
    }),
  ),
  totalCount: z.number(),
});

// Bash Tool Result Schema
export const BashToolResultSchema = z.object({
  stdout: z.string(),
  stderr: z.string(),
  exitCode: z.number(),
  executionTime: z.number(),
});

// Read Tool Result Schema
export const ReadToolResultSchema = z.object({
  content: z.string(),
  lineCount: z.number(),
  charCount: z.number(),
  encoding: z.string().optional(),
  truncated: z.boolean().optional(),
});

// Write Tool Result Schema
export const WriteToolResultSchema = z.object({
  success: z.boolean(),
  bytesWritten: z.number(),
  path: z.string(),
});

// Edit Tool Result Schema
export const EditToolResultSchema = z.object({
  success: z.boolean(),
  replacements: z.number(),
  filePath: z.string(),
});

// MultiEdit Tool Result Schema
export const MultiEditToolResultSchema = z.object({
  success: z.boolean(),
  editsApplied: z.number(),
  totalReplacements: z.number(),
  filePath: z.string(),
});

// Glob Tool Result Schema
export const GlobToolResultSchema = z.object({
  matches: z.array(z.string()),
  matchCount: z.number(),
});

// Grep Tool Result Schema
export const GrepToolResultSchema = z.object({
  matches: z.array(
    z.object({
      file: z.string(),
      line: z.number(),
      content: z.string(),
      match: z.string(),
    }),
  ),
  fileCount: z.number(),
  matchCount: z.number(),
});

// TodoRead Tool Result Schema
export const TodoReadToolResultSchema = z.object({
  todos: z.array(
    z.object({
      id: z.string(),
      content: z.string(),
      status: z.enum(['pending', 'in_progress', 'completed']),
      priority: z.enum(['high', 'medium', 'low']),
    }),
  ),
  totalCount: z.number(),
  completedCount: z.number(),
});

// TodoWrite Tool Result Schema
export const TodoWriteToolResultSchema = z.object({
  success: z.boolean(),
  todosUpdated: z.number(),
});

// Task Tool Result Schema
export const TaskToolResultSchema = z.object({
  taskId: z.string(),
  status: z.enum(['completed', 'failed', 'cancelled']),
  output: z.string(),
  duration: z.number().optional(),
});

// Export all result schemas
export const ToolResultSchemasStructured = {
  LS: LSToolResultSchema,
  Bash: BashToolResultSchema,
  Read: ReadToolResultSchema,
  Write: WriteToolResultSchema,
  Edit: EditToolResultSchema,
  MultiEdit: MultiEditToolResultSchema,
  Glob: GlobToolResultSchema,
  Grep: GrepToolResultSchema,
  TodoRead: TodoReadToolResultSchema,
  TodoWrite: TodoWriteToolResultSchema,
  Task: TaskToolResultSchema,
} as const;

// Input type exports
export type ReadToolInput = z.infer<typeof ReadToolInputSchema>;
export type WriteToolInput = z.infer<typeof WriteToolInputSchema>;
export type BashToolInput = z.infer<typeof BashToolInputSchema>;

// Type exports
export type LSToolResult = z.infer<typeof LSToolResultSchema>;
export type BashToolResult = z.infer<typeof BashToolResultSchema>;
export type ReadToolResult = z.infer<typeof ReadToolResultSchema>;
export type WriteToolResult = z.infer<typeof WriteToolResultSchema>;
export type EditToolResult = z.infer<typeof EditToolResultSchema>;
export type MultiEditToolResult = z.infer<typeof MultiEditToolResultSchema>;
export type GlobToolResult = z.infer<typeof GlobToolResultSchema>;
export type GrepToolResult = z.infer<typeof GrepToolResultSchema>;
export type TodoReadToolResult = z.infer<typeof TodoReadToolResultSchema>;
export type TodoWriteToolResult = z.infer<typeof TodoWriteToolResultSchema>;
export type TaskToolResult = z.infer<typeof TaskToolResultSchema>;

export type ToolResultStructured =
  | LSToolResult
  | BashToolResult
  | ReadToolResult
  | WriteToolResult
  | EditToolResult
  | MultiEditToolResult
  | GlobToolResult
  | GrepToolResult
  | TodoReadToolResult
  | TodoWriteToolResult
  | TaskToolResult;

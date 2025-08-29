import { z } from 'zod';

// LS Tool Schema
export const LSToolSchema = z.object({
  path: z.string().describe('The absolute path to the directory to list'),
  ignore: z.array(z.string()).optional().describe('List of glob patterns to ignore'),
});

// Bash Tool Schema
export const BashToolSchema = z.object({
  command: z.string().describe('The command to execute'),
  description: z
    .string()
    .optional()
    .describe('Clear, concise description of what this command does'),
  timeout: z.number().max(600000).optional().describe('Optional timeout in milliseconds'),
});

// Read Tool Schema
export const ReadToolSchema = z.object({
  file_path: z.string().describe('The absolute path to the file to read'),
  limit: z.number().optional().describe('The number of lines to read'),
  offset: z.number().optional().describe('The line number to start reading from'),
});

// Write Tool Schema
export const WriteToolSchema = z.object({
  file_path: z.string().describe('The absolute path to the file to write'),
  content: z.string().describe('The content to write to the file'),
});

// Edit Tool Schema
export const EditToolSchema = z.object({
  file_path: z.string().describe('The absolute path to the file to modify'),
  old_string: z.string().describe('The text to replace'),
  new_string: z.string().describe('The text to replace it with'),
  replace_all: z.boolean().optional().default(false).describe('Replace all occurrences'),
});

// MultiEdit Tool Schema
export const MultiEditToolSchema = z.object({
  file_path: z.string().describe('The absolute path to the file to modify'),
  edits: z
    .array(
      z.object({
        old_string: z.string().describe('The text to replace'),
        new_string: z.string().describe('The text to replace it with'),
        replace_all: z.boolean().optional().default(false).describe('Replace all occurrences'),
      }),
    )
    .min(1)
    .describe('Array of edit operations to perform'),
});

// Glob Tool Schema
export const GlobToolSchema = z.object({
  pattern: z.string().describe('The glob pattern to match files against'),
  path: z.string().optional().describe('The directory to search in'),
});

// Grep Tool Schema
export const GrepToolSchema = z.object({
  pattern: z.string().describe('The regular expression pattern to search for'),
  path: z.string().optional().describe('The directory to search in'),
  include: z.string().optional().describe('File pattern to include in the search'),
});

// TodoRead Tool Schema
export const TodoReadToolSchema = z.object({});

// TodoWrite Tool Schema
export const TodoWriteToolSchema = z.object({
  todos: z
    .array(
      z.object({
        id: z.string(),
        content: z.string().min(1),
        status: z.enum(['pending', 'in_progress', 'completed']),
        priority: z.enum(['high', 'medium', 'low']),
      }),
    )
    .describe('The updated todo list'),
});

// Task Tool Schema
export const TaskToolSchema = z.object({
  description: z.string().describe('A short (3-5 word) description of the task'),
  prompt: z.string().describe('The task for the agent to perform'),
});

// WebSearch Tool Schema
export const WebSearchToolSchema = z.object({
  query: z.string().min(2).describe('The search query to use'),
  allowed_domains: z
    .array(z.string())
    .optional()
    .describe('Only include search results from these domains'),
  blocked_domains: z
    .array(z.string())
    .optional()
    .describe('Never include search results from these domains'),
});

// WebFetch Tool Schema
export const WebFetchToolSchema = z.object({
  url: z.string().url().describe('The URL to fetch content from'),
  prompt: z.string().describe('The prompt to run on the fetched content'),
});

// NotebookRead Tool Schema
export const NotebookReadToolSchema = z.object({
  notebook_path: z.string().describe('The absolute path to the Jupyter notebook file to read'),
  cell_id: z.string().optional().describe('The ID of a specific cell to read'),
});

// NotebookEdit Tool Schema
export const NotebookEditToolSchema = z.object({
  notebook_path: z.string().describe('The absolute path to the Jupyter notebook file to edit'),
  cell_id: z.string().optional().describe('The ID of the cell to edit'),
  cell_type: z.enum(['code', 'markdown']).optional().describe('The type of the cell'),
  edit_mode: z
    .enum(['replace', 'insert', 'delete'])
    .optional()
    .describe('The type of edit to make'),
  new_source: z.string().describe('The new source for the cell'),
});

// exit_plan_mode Tool Schema
export const ExitPlanModeToolSchema = z.object({
  plan: z.string().describe('The plan you came up with'),
});

// Export all schemas
export const ToolSchemas = {
  LS: LSToolSchema,
  Bash: BashToolSchema,
  Read: ReadToolSchema,
  Write: WriteToolSchema,
  Edit: EditToolSchema,
  MultiEdit: MultiEditToolSchema,
  Glob: GlobToolSchema,
  Grep: GrepToolSchema,
  TodoRead: TodoReadToolSchema,
  TodoWrite: TodoWriteToolSchema,
  Task: TaskToolSchema,
  WebSearch: WebSearchToolSchema,
  WebFetch: WebFetchToolSchema,
  NotebookRead: NotebookReadToolSchema,
  NotebookEdit: NotebookEditToolSchema,
  exit_plan_mode: ExitPlanModeToolSchema,
} as const;

// Type exports
export type LSToolInput = z.infer<typeof LSToolSchema>;
export type BashToolInput = z.infer<typeof BashToolSchema>;
export type ReadToolInput = z.infer<typeof ReadToolSchema>;
export type WriteToolInput = z.infer<typeof WriteToolSchema>;
export type EditToolInput = z.infer<typeof EditToolSchema>;
export type MultiEditToolInput = z.infer<typeof MultiEditToolSchema>;
export type GlobToolInput = z.infer<typeof GlobToolSchema>;
export type GrepToolInput = z.infer<typeof GrepToolSchema>;
export type TodoReadToolInput = z.infer<typeof TodoReadToolSchema>;
export type TodoWriteToolInput = z.infer<typeof TodoWriteToolSchema>;
export type TaskToolInput = z.infer<typeof TaskToolSchema>;
export type WebSearchToolInput = z.infer<typeof WebSearchToolSchema>;
export type WebFetchToolInput = z.infer<typeof WebFetchToolSchema>;
export type NotebookReadToolInput = z.infer<typeof NotebookReadToolSchema>;
export type NotebookEditToolInput = z.infer<typeof NotebookEditToolSchema>;
export type ExitPlanModeToolInput = z.infer<typeof ExitPlanModeToolSchema>;

export type ToolName = keyof typeof ToolSchemas;
export type ToolInput =
  | LSToolInput
  | BashToolInput
  | ReadToolInput
  | WriteToolInput
  | EditToolInput
  | MultiEditToolInput
  | GlobToolInput
  | GrepToolInput
  | TodoReadToolInput
  | TodoWriteToolInput
  | TaskToolInput
  | WebSearchToolInput
  | WebFetchToolInput
  | NotebookReadToolInput
  | NotebookEditToolInput
  | ExitPlanModeToolInput;

export interface ToolArgs {
  // Common tool arguments
  pattern?: string;
  path?: string;
  file_path?: string;
  command?: string;
  include?: string;
  url?: string;
  query?: string;

  // Allow any other properties
  [key: string]: unknown;
}

export interface ToolResult {
  success: boolean;
  output?: string;
  error?: string;
  [key: string]: unknown;
}

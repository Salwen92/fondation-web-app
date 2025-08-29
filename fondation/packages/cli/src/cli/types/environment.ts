export interface ClaudeEnvironment {
  CLAUDE_MODEL?: string;
  CLAUDE_OUTPUT_DIR?: string;
  CLAUDE_LOG_MESSAGES?: string;
  CLAUDE_SESSION_ID?: string;
  ANTHROPIC_API_KEY?: string;
  [key: string]: string | undefined;
}

export interface CLIOptionsMap {
  model?: string;
  outputDir?: string;
  temperature?: number;
  maxTokens?: number;
  verbose?: boolean;
  quiet?: boolean;
  json?: boolean;
  logFile?: string;
  config?: string;
  profile?: string;
  [key: string]: unknown;
}

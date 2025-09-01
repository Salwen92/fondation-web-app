/**
 * Base CLI Execution Strategy Interface
 * 
 * Defines the contract for executing CLI commands in different environments
 */

export interface CLIExecutionStrategy {
  /**
   * Execute the CLI analyze command
   */
  execute(
    repoPath: string,
    options: {
      prompt: string;
      onProgress?: (step: string) => Promise<void>;
    }
  ): Promise<CLIResult>;
  
  /**
   * Validate that this strategy can run in the current environment
   */
  validate(): Promise<{ valid: boolean; errors: string[] }>;
  
  /**
   * Get strategy name for logging
   */
  getName(): string;
}

export type CLIResult = {
  success: boolean;
  message?: string;
  documents?: Array<{
    slug: string;
    title: string;
    content: string;
    kind: "chapter" | "tutorial" | "toc" | "yaml";
    chapterIndex: number;
  }>;
  error?: string;
  metadata?: Record<string, unknown>;
};
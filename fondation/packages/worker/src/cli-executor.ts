/**
 * CLI Executor - Refactored with Strategy Pattern
 * 
 * This class now uses the strategy pattern to handle different execution modes:
 * - Development: Local execution with host authentication
 * - Production: Docker container execution with environment variables
 */

import { CLIStrategyFactory, type CLIResult } from './cli-strategies';

export class CLIExecutor {
  private cliPath: string;
  
  constructor(cliPath?: string) {
    // Use provided path or default from environment or fallback
    this.cliPath = cliPath || process.env.CLI_PATH || "@fondation/cli/dist/cli.bundled.mjs";
  }
  
  async execute(
    repoPath: string,
    options: {
      prompt: string;
      onProgress?: (step: string) => Promise<void>;
    }
  ): Promise<CLIResult> {
      
      // Create appropriate strategy for current environment
      const strategy = CLIStrategyFactory.create(this.cliPath);
      const validation = await strategy.validate();
      
      if (!validation.valid) {
        throw new Error(`CLI execution validation failed:\n${validation.errors.join('\n')}`);
      }
      
      // Execute using the strategy
      return await strategy.execute(repoPath, options);
  }
}
/**
 * CLI Executor - Refactored with Strategy Pattern
 *
 * This class now uses the strategy pattern to handle different execution modes:
 * - Development: Local execution with host authentication
 * - Production: Docker container execution with environment variables
 */

import { type CLIResult, createCLIStrategy } from './cli-strategies';
import { DebugLogger, getCliPath } from './utils/environment.js';

export class CLIExecutor {
  private cliPath: string;
  private logger: DebugLogger;

  constructor(cliPath?: string) {
    // Use environment-aware CLI path resolution
    this.cliPath = cliPath || process.env.CLI_PATH || getCliPath();
    this.logger = new DebugLogger('CLIExecutor');
  }

  async execute(
    repoPath: string,
    options: {
      prompt: string;
      onProgress?: (step: string) => Promise<void>;
    },
  ): Promise<CLIResult> {
    this.logger.log(`========== Starting CLI execution ==========`);
    this.logger.log(`CLI Path: ${this.cliPath}`);
    this.logger.log(`Repo Path: ${repoPath}`);
    this.logger.log(`Prompt length: ${options.prompt.length}`);
    this.logger.log(`Has onProgress callback: ${!!options.onProgress}`);

    // Create appropriate strategy for current environment
    this.logger.log(`Creating CLI strategy`);
    const strategy = createCLIStrategy(this.cliPath);
    this.logger.log(`✅ Strategy created: ${strategy.constructor.name}`);

    this.logger.log(`Starting strategy validation`);
    const validation = await strategy.validate();
    this.logger.log(
      `Validation result: valid=${validation.valid}, errors=${validation.errors.length}`,
    );

    if (!validation.valid) {
      this.logger.error(`Validation failed with errors: ${validation.errors.join(', ')}`);
      throw new Error(`CLI execution validation failed:\n${validation.errors.join('\n')}`);
    }
    this.logger.log(`✅ Strategy validation passed`);

    // Execute using the strategy
    this.logger.log(`Starting strategy execution`);
    const result = await strategy.execute(repoPath, options);
    this.logger.log(
      `✅ Strategy execution completed. Success: ${result?.success}, documents: ${result?.documents?.length || 0}`,
    );
    this.logger.log(`========== CLI execution completed ==========`);

    return result;
  }
}

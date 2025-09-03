/**
 * Development CLI Execution Strategy (Refactored)
 * 
 * Handles local CLI execution for development mode using Template Method pattern.
 * Reduced from 279 lines to ~35 lines by extending BaseStrategy.
 * 
 * Key Behaviors (PRESERVED):
 * - Uses source TypeScript files with bun execution
 * - Leverages host Claude authentication (no environment variable required)
 * - No timeout (infinite execution)
 * - Development-friendly error messages and debugging
 * - Profile: "dev" (not "development")
 */

import { exec } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import { BaseStrategy, type CommandConfig, type ValidationResult } from "./base-strategy";
import { dev } from "@fondation/shared/environment";
import { EnvironmentConfig } from "@fondation/shared/environment-config";

const execAsync = promisify(exec);

export class DevelopmentCLIStrategy extends BaseStrategy {
  
  getName(): string {
    return "Development CLI Strategy";
  }
  
  async validate(): Promise<ValidationResult> {
    const envConfig = EnvironmentConfig.getInstance();
    
    // Use centralized development environment validation
    const validation = envConfig.validateDevelopmentEnvironment();
    
    // Add CLI-specific validation errors
    const cliErrors: string[] = [];
    
    // Check if CLI path is configured
    if (!this.cliPath) {
      cliErrors.push("CLI path not configured");
      return { valid: false, errors: [...validation.errors, ...cliErrors], warnings: validation.warnings };
    }
    
    // Check if source/bundle files exist
    if (this.cliPath.includes('src/cli.ts') && !existsSync(this.cliPath)) {
      cliErrors.push(`CLI source file not found: ${this.cliPath}`);
    }
    if (this.cliPath.includes('dist/cli.bundled.mjs') && !existsSync(this.cliPath)) {
      cliErrors.push(`CLI bundled file not found: ${this.cliPath}`);
    }
    
    // Check for Claude authentication - prefer host auth in development
    if (!envConfig.getClaudeOAuthToken()) {
      try {
        await execAsync('bunx claude --help');
      } catch (_error) {
        cliErrors.push(
          "Claude authentication not found. Either authenticate with 'bunx claude auth' or set CLAUDE_CODE_OAUTH_TOKEN"
        );
      }
    }
    
    // Check for Bun runtime
    try {
      await execAsync('bun --version');
    } catch (_error) {
      cliErrors.push("Bun runtime not available for development execution");
    }
    
    return { 
      valid: validation.valid && cliErrors.length === 0, 
      errors: [...validation.errors, ...cliErrors],
      warnings: validation.warnings
    };
  }
  
  getCommandConfig(repoPath: string): CommandConfig {
    const envConfig = EnvironmentConfig.getInstance();
    
    // Use relative path from worker's execution context (packages/worker)
    // Worker executes from packages/worker directory
    // CLI is located at packages/cli/src/cli.ts
    const cliPath = '../cli/src/cli.ts';
    const command = `bun "${cliPath}" analyze "${repoPath}" --profile dev --verbose`;
    
    return {
      command,
      env: {
        // Filter out Claude Code environment variables that interfere with CLI
        ...Object.fromEntries(
          Object.entries(process.env).filter(([key]) => 
            !key.startsWith('CLAUDE_CODE_') && key !== 'CLAUDECODE'
          )
        ),
        // In development, use host authentication - DO NOT pass OAuth token
        NODE_ENV: 'development',
        FONDATION_MODE: 'development',
        // Only pass essential environment variables
        CONVEX_URL: envConfig.getConvexUrl(),
        // DO NOT pass CLAUDE_CODE_OAUTH_TOKEN in development - let host auth work
      },
      timeout: undefined, // No timeout in development
      heartbeatInterval: 120000 // 2-minute development progress heartbeat
    };
  }
  
  // Override base methods for development-specific behavior
  protected shouldLogDebugInfo(): boolean {
    return dev.allows('debug_logging');
  }
  
  protected getAuthenticationTroubleshooting(): string {
    return `\n\n🔑 Authentication Issue: Try running 'bunx claude auth' to authenticate Claude CLI`;
  }
}
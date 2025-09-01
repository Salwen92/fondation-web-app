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
import { join, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import { BaseStrategy, type CommandConfig, type ValidationResult } from "./base-strategy.js";
import { dev } from "@fondation/shared/environment";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class DevelopmentCLIStrategy extends BaseStrategy {
  
  getName(): string {
    return "Development CLI Strategy";
  }
  
  async validate(): Promise<ValidationResult> {
    const errors: string[] = [];
    
    // Check if CLI path is configured
    if (!this.cliPath) {
      errors.push("CLI path not configured");
      return { valid: false, errors };
    }
    
    // Check if source/bundle files exist
    if (this.cliPath.includes('src/cli.ts') && !existsSync(this.cliPath)) {
      errors.push(`CLI source file not found: ${this.cliPath}`);
    }
    if (this.cliPath.includes('dist/cli.bundled.mjs') && !existsSync(this.cliPath)) {
      errors.push(`CLI bundled file not found: ${this.cliPath}`);
    }
    
    // Check for Claude authentication - prefer host auth in development
    try {
      await execAsync('bunx claude --help');
    } catch (_error) {
      if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) {
        errors.push(
          "Claude authentication not found. Either authenticate with 'bunx claude auth' or set CLAUDE_CODE_OAUTH_TOKEN"
        );
      }
    }
    
    // Check for Bun runtime
    try {
      await execAsync('bun --version');
    } catch (_error) {
      errors.push("Bun runtime not available for development execution");
    }
    
    return { valid: errors.length === 0, errors };
  }
  
  getCommandConfig(repoPath: string): CommandConfig {
    // Determine execution command based on CLI path (same logic as original)
    const cliPackageDir = resolvePath(join(__dirname, '../../../cli'));
    let command: string;
    
    if (this.cliPath.includes('cli.ts') || this.cliPath.includes('src')) {
      // Execute TypeScript source directly with Bun (preferred for development)
      command = `cd "${cliPackageDir}" && bun src/cli.ts analyze "${repoPath}" --profile dev --verbose`;
    } else {
      // Execute bundled version with Bun (fallback)
      command = `cd "${cliPackageDir}" && bun dist/cli.bundled.mjs analyze "${repoPath}" --profile dev --verbose`;
    }
    
    return {
      command,
      env: {
        ...process.env,
        // In development, let CLI use host authentication or environment variables
        NODE_ENV: 'development',
        FONDATION_MODE: 'development'
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
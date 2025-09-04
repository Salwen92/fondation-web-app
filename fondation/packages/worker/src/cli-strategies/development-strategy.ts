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

import { exec } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { dev } from '@fondation/shared/environment';
import { EnvironmentConfig } from '@fondation/shared/environment-config';
import {
  DebugLogger,
  getCliPath,
  isDevelopment,
  isProduction,
  shouldIncludeOAuthToken,
} from '../utils/environment.js';
import { BaseStrategy, type CommandConfig, type ValidationResult } from './base-strategy';

const execAsync = promisify(exec);

export class DevelopmentCLIStrategy extends BaseStrategy {
  private debugLogger: DebugLogger;

  constructor(cliPath: string) {
    super(cliPath);
    this.debugLogger = new DebugLogger('DevStrategy');
  }

  getName(): string {
    return 'Development CLI Strategy';
  }

  async validate(): Promise<ValidationResult> {
    const envConfig = EnvironmentConfig.getInstance();

    // Use centralized development environment validation
    const validation = envConfig.validateDevelopmentEnvironment();

    // Add CLI-specific validation errors
    const cliErrors: string[] = [];

    // Check if CLI path is configured
    if (!this.cliPath) {
      cliErrors.push('CLI path not configured');
      return {
        valid: false,
        errors: [...validation.errors, ...cliErrors],
        warnings: validation.warnings,
      };
    }

    // Check if CLI source file exists (use the actual path that will be used in execution)
    // In production, this strategy shouldn't be used, but let's check anyway
    if (isDevelopment()) {
      const actualCliPath = '../cli/src/cli.ts';
      if (!existsSync(actualCliPath)) {
        cliErrors.push(`CLI source file not found: ${actualCliPath}`);
      }
    }

    // Check for Claude authentication - prefer host auth in development
    if (!envConfig.getClaudeOAuthToken()) {
      try {
        await execAsync('bunx claude --help');
      } catch (_error) {
        cliErrors.push(
          "Claude authentication not found. Either authenticate with 'bunx claude auth' or set CLAUDE_CODE_OAUTH_TOKEN",
        );
      }
    }

    // Check for Bun runtime
    try {
      await execAsync('bun --version');
    } catch (_error) {
      cliErrors.push('Bun runtime not available for development execution');
    }

    return {
      valid: validation.valid && cliErrors.length === 0,
      errors: [...validation.errors, ...cliErrors],
      warnings: validation.warnings,
    };
  }

  getCommandConfig(repoPath: string): CommandConfig {
    const envConfig = EnvironmentConfig.getInstance();

    // Use environment-aware CLI path
    const cliPath = isDevelopment()
      ? path.resolve(process.cwd(), '../cli/src/cli.ts')
      : getCliPath(); // Fallback to production path if somehow used in production
    const command = `bun "${cliPath}" analyze "${repoPath}" --profile dev --verbose`;

    const baseEnv = {
      // Filter out Claude Code environment variables that interfere with CLI
      ...Object.fromEntries(
        Object.entries(process.env).filter(
          ([key]) => !key.startsWith('CLAUDE_CODE_') && key !== 'CLAUDECODE',
        ),
      ),
      NODE_ENV: 'development',
      FONDATION_MODE: 'development',
      // Only pass essential environment variables
      CONVEX_URL: envConfig.getConvexUrl(),
    };

    // Conditionally include OAuth token based on environment
    const filteredEnv = shouldIncludeOAuthToken()
      ? { ...baseEnv, CLAUDE_CODE_OAUTH_TOKEN: envConfig.getClaudeOAuthToken() || '' }
      : baseEnv; // In development, exclude token to use host auth

    // Debug: Log all environment variables being passed to CLI (only in development)
    this.debugLogger.log(
      `Environment variables being passed to CLI (${Object.keys(filteredEnv).length} total):`,
    );
    if (isDevelopment()) {
      Object.entries(filteredEnv).forEach(([key, value]) => {
        if (
          key.toLowerCase().includes('claude') ||
          key.toLowerCase().includes('auth') ||
          key.toLowerCase().includes('token')
        ) {
          this.debugLogger.debug(
            `⚠️  ${key}=${value?.toString().substring(0, 20)}${value?.toString().length > 20 ? '...' : ''}`,
          );
        }
      });
    }

    return {
      command,
      env: filteredEnv,
      timeout: undefined, // No timeout in development
      heartbeatInterval: 120000, // 2-minute development progress heartbeat
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

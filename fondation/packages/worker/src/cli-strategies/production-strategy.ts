/**
 * Production CLI Execution Strategy (Refactored)
 * 
 * Handles containerized CLI execution for production mode using Template Method pattern.
 * Reduced from 286 lines to ~45 lines by extending BaseStrategy.
 * 
 * Key Behaviors (PRESERVED):
 * - Enforces Docker container environment requirements
 * - Uses environment variable-based authentication
 * - Executes bundled CLI with strict validation
 * - 1 hour timeout with SIGTERM handling
 * - Profile: "production"
 * - French progress messages ("Étape X/6")
 */

import { BaseStrategy, type CommandConfig, type ValidationResult } from "./base-strategy";
import { EnvironmentConfig } from "@fondation/shared/environment-config";
import { shouldIncludeOAuthToken } from "../utils/environment.js";

export class ProductionCLIStrategy extends BaseStrategy {
  
  getName(): string {
    return "Production CLI Strategy";
  }
  
  async validate(): Promise<ValidationResult> {
    const envConfig = EnvironmentConfig.getInstance();
    
    // Use centralized production environment validation
    const validation = envConfig.validateProductionEnvironment();
    
    // Add CLI-specific validation errors
    const cliErrors: string[] = [];
    
    // Validate CLI bundle exists and is in correct location
    // Accept both legacy and new paths for production CLI
    const validProductionPaths = [
      '/app/cli/dist/',
      '/app/packages/cli/dist/',
      '/app/cli/node_modules/@fondation/cli/dist/',
      '/app/node_modules/@fondation/cli/dist/'
    ];
    
    const hasValidPath = validProductionPaths.some(path => this.cliPath?.includes(path));
    if (!this.cliPath || !hasValidPath) {
      cliErrors.push(`Production mode requires bundled CLI path in: ${validProductionPaths.join(', ')}`);
    }
    
    // Import existsSync only when needed for CLI path validation
    const { existsSync } = await import("node:fs");
    if (this.cliPath && !existsSync(this.cliPath)) {
      cliErrors.push(`Production CLI bundle not found: ${this.cliPath}`);
    }
    
    return { 
      valid: validation.valid && cliErrors.length === 0, 
      errors: [...validation.errors, ...cliErrors],
      warnings: validation.warnings
    };
  }
  
  getCommandConfig(repoPath: string): CommandConfig {
    const envConfig = EnvironmentConfig.getInstance();
    
    // Use production Docker command - exactly as in original implementation
    const command = `cd /app/cli && HOME=/home/worker NODE_PATH=/app/node_modules stdbuf -o0 -e0 timeout 3600 bun dist/cli.bundled.mjs analyze "${repoPath}" --profile production`;
    
    return {
      command,
      env: {
        ...process.env,
        HOME: '/home/worker',
        NODE_PATH: '/app/node_modules',
        // Centralized environment variables from singleton
        // Use environment-aware token inclusion
        ...(shouldIncludeOAuthToken() && envConfig.getClaudeOAuthToken() && {
          CLAUDE_CODE_OAUTH_TOKEN: envConfig.getClaudeOAuthToken() as string
        }),
        CONVEX_URL: envConfig.getConvexUrl(),
        // Let CLI use default .claude-tutorial-output directory in repo
      },
      timeout: 3600000, // Production timeout (1 hour)
      heartbeatInterval: undefined // No heartbeat in production
    };
  }
  
  // Override base methods for production-specific behavior
  protected shouldLogDebugInfo(): boolean {
    const envConfig = EnvironmentConfig.getInstance();
    return envConfig.isDebugMode();
  }
  
  protected getAuthenticationTroubleshooting(): string {
    return `\n\nAuthentication Issue Detected: Ensure CLAUDE_CODE_OAUTH_TOKEN is properly set and valid.`;
  }
}
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

import { existsSync } from "node:fs";
import { BaseStrategy, type CommandConfig, type ValidationResult } from "./base-strategy.js";

export class ProductionCLIStrategy extends BaseStrategy {
  
  getName(): string {
    return "Production CLI Strategy";
  }
  
  async validate(): Promise<ValidationResult> {
    const errors: string[] = [];
    
    // ENFORCE CONTAINER ARCHITECTURE: Worker MUST run inside Docker container
    const isInsideDocker = process.env.DOCKER_CONTAINER === 'true' || 
                          existsSync('/.dockerenv');
    
    if (!isInsideDocker) {
      errors.push(
        "ARCHITECTURE VIOLATION: Worker must run inside Docker container. " +
        "Set DOCKER_CONTAINER=true or run worker using docker-compose. " +
        "External Docker spawning is not supported to maintain consistent architecture."
      );
    }
    
    // Validate required environment variables for Claude integration
    if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) {
      errors.push(
        "CLAUDE_CODE_OAUTH_TOKEN environment variable is required for CLI analysis. " +
        "Ensure the Docker container is started with proper authentication tokens."
      );
    }
    
    // Validate CLI bundle exists
    if (!this.cliPath || !this.cliPath.includes('/app/packages/cli/dist/')) {
      errors.push("Production mode requires bundled CLI path at /app/packages/cli/dist/");
    }
    
    if (!existsSync(this.cliPath)) {
      errors.push(`Production CLI bundle not found: ${this.cliPath}`);
    }
    
    return { valid: errors.length === 0, errors };
  }
  
  getCommandConfig(repoPath: string): CommandConfig {
    // Use production Docker command - exactly as in original implementation
    const command = `cd /app/cli && HOME=/home/worker NODE_PATH=/app/node_modules stdbuf -o0 -e0 timeout 3600 bun dist/cli.bundled.mjs analyze "${repoPath}" --profile production`;
    
    return {
      command,
      env: {
        ...process.env,
        HOME: '/home/worker',
        NODE_PATH: '/app/node_modules',
        // Let CLI use default .claude-tutorial-output directory in repo
      },
      timeout: 3600000, // Production timeout (1 hour)
      heartbeatInterval: undefined // No heartbeat in production
    };
  }
  
  // Override base methods for production-specific behavior
  protected shouldLogDebugInfo(): boolean {
    return process.env.DEBUG === 'true';
  }
  
  protected getAuthenticationTroubleshooting(): string {
    return `\n\nAuthentication Issue Detected: Ensure CLAUDE_CODE_OAUTH_TOKEN is properly set and valid.`;
  }
}
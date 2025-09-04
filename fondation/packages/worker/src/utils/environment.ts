/**
 * Environment detection and conditional logging utilities
 * Ensures proper behavior in both development and production environments
 */

/**
 * Check if running in development environment
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.FONDATION_MODE === 'development';
}

/**
 * Check if running in production environment
 */
export function isProduction(): boolean {
  return !isDevelopment();
}

/**
 * Conditional debug logger that only logs in development
 */
export class DebugLogger {
  private context: string;
  private enabled: boolean;

  constructor(context: string) {
    this.context = context;
    this.enabled = isDevelopment();
  }

  log(message: string, ...args: any[]): void {
    if (this.enabled) {
      console.log(`[${this.context}] ${message}`, ...args);
    }
  }

  error(message: string, error?: Error, ...args: any[]): void {
    if (this.enabled) {
      console.error(`[${this.context}] ❌ ${message}`, error, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.enabled) {
      console.log(`[${this.context}] ${message}`, ...args);
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.enabled) {
      console.log(`[${this.context}] [DEBUG] ${message}`, ...args);
    }
  }
}

/**
 * Get the appropriate CLI path based on environment
 */
export function getCliPath(): string {
  if (isProduction()) {
    // Production paths in Docker container
    const dockerPaths = [
      '/app/cli/dist/cli.bundled.mjs', // Primary production path
      '/app/cli/node_modules/@fondation/cli/dist/cli.bundled.mjs', // NPM package path
      '/app/node_modules/@fondation/cli/dist/cli.bundled.mjs', // Alternative package path
    ];

    // Return first existing path or default
    const fs = require('fs');
    for (const path of dockerPaths) {
      if (fs.existsSync(path)) {
        return path;
      }
    }
    return dockerPaths[0]; // Default to primary path
  }

  // Development path
  const path = require('path');
  return path.resolve(process.cwd(), '../cli/src/cli.ts');
}

/**
 * Should include OAuth token in environment
 */
export function shouldIncludeOAuthToken(): boolean {
  // In production, always include OAuth token
  // In development, exclude it to use host authentication
  return isProduction();
}

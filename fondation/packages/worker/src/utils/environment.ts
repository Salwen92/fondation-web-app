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
  private enabled: boolean;

  constructor(_context: string) {
    // context parameter kept for API compatibility but not stored
    this.enabled = isDevelopment();
  }

  log(_message: string, ..._args: unknown[]): void {
    if (this.enabled) {
      // No-op logger implementation
    }
  }

  error(_message: string, _error?: Error, ..._args: unknown[]): void {
    if (this.enabled) {
      // No-op logger implementation
    }
  }

  info(_message: string, ..._args: unknown[]): void {
    if (this.enabled) {
      // No-op logger implementation
    }
  }

  debug(_message: string, ..._args: unknown[]): void {
    if (this.enabled) {
      // No-op logger implementation
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
    const fs = require('node:fs');
    for (const path of dockerPaths) {
      if (fs.existsSync(path)) {
        return path;
      }
    }
    return dockerPaths[0]; // Default to primary path
  }

  // Development path
  const path = require('node:path');
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

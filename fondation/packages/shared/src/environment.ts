/**
 * Environment Detection Utility
 * 
 * Provides centralized environment detection for the Fondation monorepo.
 * Supports development, production, and test environments with clear
 * detection logic and consistent behavior across packages.
 */

export type Environment = 'development' | 'production' | 'test';
export type ExecutionMode = 'local' | 'docker' | 'container';

/**
 * Detect the current environment based on NODE_ENV and other indicators
 */
export function getEnvironment(): Environment {
  // Check explicit environment variables
  if (process.env.FONDATION_ENV) {
    return process.env.FONDATION_ENV as Environment;
  }
  
  // Check NODE_ENV
  const nodeEnv = process.env.NODE_ENV?.toLowerCase();
  if (nodeEnv === 'production') { return 'production'; }
  if (nodeEnv === 'test') { return 'test'; }
  if (nodeEnv === 'development') { return 'development'; }
  
  // Default to development if not specified
  return 'development';
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return getEnvironment() === 'development';
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return getEnvironment() === 'production';
}

/**
 * Check if running in test mode
 */
export function isTest(): boolean {
  return getEnvironment() === 'test';
}

/**
 * Detect the current execution mode (local vs docker/container)
 */
export function getExecutionMode(): ExecutionMode {
  // Explicit override
  if (process.env.FONDATION_EXECUTION_MODE) {
    return process.env.FONDATION_EXECUTION_MODE as ExecutionMode;
  }
  
  // Check for Docker environment indicators
  const isInDocker = 
    process.env.DOCKER_CONTAINER === 'true' ||
    process.env.CONTAINER === 'true' ||
    existsSync('/.dockerenv') ||
    existsSync('/proc/1/cgroup') && readFileSync('/proc/1/cgroup', 'utf8').includes('docker');
  
  if (isInDocker) {
    return 'docker';
  }
  
  // Check for other container environments (Kubernetes, etc.)
  if (process.env.KUBERNETES_SERVICE_HOST) {
    return 'container';
  }
  
  return 'local';
}

/**
 * Check if running inside a Docker container
 */
export function isInsideDocker(): boolean {
  const mode = getExecutionMode();
  return mode === 'docker' || mode === 'container';
}

/**
 * Check if running locally (not in container)
 */
export function isLocalExecution(): boolean {
  return getExecutionMode() === 'local';
}

/**
 * Get environment-specific configuration with fallbacks
 */
export function getEnvironmentConfig<T>(config: {
  development?: T;
  production?: T;
  test?: T;
  default?: T;
}): T | undefined {
  const env = getEnvironment();
  
  if (config[env]) {
    return config[env];
  }
  
  return config.default;
}

/**
 * Validate environment requirements
 */
export function validateEnvironment(requirements: {
  allowedEnvironments?: Environment[];
  requiredExecutionMode?: ExecutionMode;
  requiredEnvVars?: string[];
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const currentEnv = getEnvironment();
  const currentMode = getExecutionMode();
  
  // Check allowed environments
  if (requirements.allowedEnvironments && !requirements.allowedEnvironments.includes(currentEnv)) {
    errors.push(`Environment '${currentEnv}' not allowed. Allowed: ${requirements.allowedEnvironments.join(', ')}`);
  }
  
  // Check required execution mode
  if (requirements.requiredExecutionMode && currentMode !== requirements.requiredExecutionMode) {
    errors.push(`Execution mode '${currentMode}' not allowed. Required: ${requirements.requiredExecutionMode}`);
  }
  
  // Check required environment variables
  if (requirements.requiredEnvVars) {
    for (const envVar of requirements.requiredEnvVars) {
      if (!process.env[envVar]) {
        errors.push(`Required environment variable missing: ${envVar}`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Development mode helpers
 */
export const dev = {
  /**
   * Check if development mode allows a specific feature
   */
  allows: (feature: 'docker_bypass' | 'mock_auth' | 'hot_reload' | 'debug_logging'): boolean => {
    if (!isDevelopment()) { return false; }
    
    switch (feature) {
      case 'docker_bypass':
        return process.env.FONDATION_DEV_DOCKER_BYPASS !== 'false';
      case 'mock_auth':
        return process.env.FONDATION_DEV_MOCK_AUTH === 'true';
      case 'hot_reload':
        return process.env.FONDATION_DEV_HOT_RELOAD !== 'false';
      case 'debug_logging':
        return process.env.FONDATION_DEV_DEBUG === 'true' || process.env.DEBUG === 'fondation:*';
      default:
        return false;
    }
  },
  
  /**
   * Get development-specific paths
   */
  paths: {
    cliSource: () => isDevelopment() ? '@fondation/cli/cli.ts' : null,
    cliBundle: () => isDevelopment() ? '@fondation/cli/dist/cli.bundled.mjs' : '/app/packages/cli/dist/cli.bundled.mjs',
    tempDir: () => isDevelopment() ? '/tmp/fondation-dev' : '/tmp/fondation'
  }
};

// Helper functions for file system checks
function existsSync(path: string): boolean {
  try {
    require('node:fs').statSync(path);
    return true;
  } catch {
    return false;
  }
}

function readFileSync(path: string, encoding: string): string {
  try {
    return require('node:fs').readFileSync(path, encoding);
  } catch {
    return '';
  }
}

// Export environment information for debugging
export const environmentInfo = {
  environment: getEnvironment(),
  executionMode: getExecutionMode(),
  isDocker: isInsideDocker(),
  isLocal: isLocalExecution(),
  nodeEnv: process.env.NODE_ENV,
  platform: process.platform,
  arch: process.arch
};
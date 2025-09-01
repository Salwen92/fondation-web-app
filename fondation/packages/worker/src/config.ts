import { randomBytes } from "node:crypto";
import { dev } from "@fondation/shared/environment";
import { EnvironmentConfig } from "@fondation/shared/environment-config";

// Local type until workspace resolution is fixed
type WorkerConfig = {
  workerId: string;
  convexUrl: string;
  pollInterval: number;
  leaseTime: number;
  heartbeatInterval: number;
  maxConcurrentJobs: number;
  tempDir: string;
  cliPath?: string;
  executionMode: 'local' | 'docker' | 'container';
  developmentMode: boolean;
};

// Generate config dynamically with environment-aware settings using singleton
export function createConfig(): WorkerConfig {
  const envConfig = EnvironmentConfig.getInstance();
  
  const executionMode = envConfig.getExecutionMode();
  const developmentMode = envConfig.isDevelopment();
  
  // Use centralized worker ID generation
  const workerId = envConfig.getWorkerId();
  
  // Determine CLI path based on environment and execution mode
  const cliPath = getCLIPath(developmentMode, executionMode);
  
  // Determine temp directory with development-friendly defaults
  const tempDir = getTempDir(developmentMode);
  
  return {
    workerId,
    convexUrl: envConfig.getConvexUrl(),
    pollInterval: envConfig.getPollInterval(),
    leaseTime: envConfig.getLeaseTime(),
    heartbeatInterval: envConfig.getHeartbeatInterval(),
    maxConcurrentJobs: envConfig.getMaxConcurrentJobs(),
    tempDir,
    cliPath,
    executionMode,
    developmentMode
  };
}

/**
 * Determine CLI path based on environment and execution mode using singleton
 */
function getCLIPath(developmentMode: boolean, _executionMode: string): string {
  const envConfig = EnvironmentConfig.getInstance();
  
  // Allow explicit override from singleton
  const explicitPath = envConfig.getCliPath();
  if (explicitPath) {
    return explicitPath;
  }
  
  if (developmentMode) {
    // In development, prefer source execution if available
    const sourcePath = dev.paths.cliSource();
    if (sourcePath) {
      return sourcePath;
    }
    
    // Fallback to local bundle  
    return "@fondation/cli/dist/cli.bundled.mjs";
  }
  
  // Production: Use Docker container path
  return "/app/packages/cli/dist/cli.bundled.mjs";
}

/**
 * Get appropriate temp directory for environment using singleton
 */
function getTempDir(developmentMode: boolean): string {
  const envConfig = EnvironmentConfig.getInstance();
  
  // Use singleton for environment variable access
  const explicitTempDir = envConfig.getTempDir();
  if (explicitTempDir) {
    return explicitTempDir;
  }
  
  return developmentMode 
    ? "/tmp/fondation-dev"  // Separate dev temp dir
    : "/tmp/fondation";     // Production temp dir
}

// Remove static config export - config will be created dynamically

// Validate required configuration using EnvironmentConfig singleton
export function validateConfig(config: WorkerConfig): void {
  const envConfig = EnvironmentConfig.getInstance();
  
  // Use centralized environment validation
  try {
    envConfig.requireValidEnvironment();
  } catch (error) {
    throw new Error(`Configuration validation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  // Add worker-specific validation errors
  const errors: string[] = [];
  
  // CLI-specific validation
  if (config.developmentMode) {
    // In development, CLI path should exist or be buildable
    if (config.cliPath?.includes('src/cli.ts')) {
      // Additional development CLI checks could go here
    }
  } else {
    // Production mode - CLI-specific validation
    if (!config.cliPath?.includes('/app/packages/cli/dist/')) {
      errors.push("Production mode requires bundled CLI path at /app/packages/cli/dist/");
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`Worker configuration validation failed:\n${errors.join('\n')}`);
  }
}
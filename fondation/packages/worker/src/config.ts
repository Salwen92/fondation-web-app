import { randomBytes } from "node:crypto";
import { 
  isDevelopment, 
  isInsideDocker, 
  getExecutionMode,
  dev,
} from "@fondation/shared/environment";

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

// Generate config dynamically with environment-aware settings
export function createConfig(): WorkerConfig {
  const executionMode = getExecutionMode();
  const developmentMode = isDevelopment();
  const _isDocker = isInsideDocker();
  
  // Generate worker ID based on execution mode
  const workerId = process.env.WORKER_ID || 
    `${executionMode}-worker-${randomBytes(8).toString("hex")}`;
  
  // Determine CLI path based on environment and execution mode
  const cliPath = getCLIPath(developmentMode, executionMode);
  
  // Determine temp directory with development-friendly defaults
  const tempDir = getTempDir(developmentMode);
  
  // Environment-specific polling intervals (faster in development)
  const pollInterval = developmentMode 
    ? Number.parseInt(process.env.POLL_INTERVAL || "3000", 10)  // Faster polling in dev
    : Number.parseInt(process.env.POLL_INTERVAL || "5000", 10);
  
  return {
    workerId,
    convexUrl: process.env.CONVEX_URL || "",
    pollInterval,
    leaseTime: Number.parseInt(process.env.LEASE_TIME || "300000", 10), // 5 minutes
    heartbeatInterval: Number.parseInt(process.env.HEARTBEAT_INTERVAL || "60000", 10), // 1 minute
    maxConcurrentJobs: Number.parseInt(process.env.MAX_CONCURRENT_JOBS || "1", 10),
    tempDir,
    cliPath,
    executionMode,
    developmentMode
  };
}

/**
 * Determine CLI path based on environment and execution mode
 */
function getCLIPath(developmentMode: boolean, _executionMode: string): string {
  // Allow explicit override
  if (process.env.CLI_PATH) {
    return process.env.CLI_PATH;
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
 * Get appropriate temp directory for environment
 */
function getTempDir(developmentMode: boolean): string {
  if (process.env.TEMP_DIR) {
    return process.env.TEMP_DIR;
  }
  
  return developmentMode 
    ? "/tmp/fondation-dev"  // Separate dev temp dir
    : "/tmp/fondation";     // Production temp dir
}

// Remove static config export - config will be created dynamically

// Validate required configuration with environment awareness
export function validateConfig(config: WorkerConfig): void {
  const errors: string[] = [];
  
  // Always required
  if (!config.convexUrl) {
    errors.push("CONVEX_URL environment variable is required");
  }
  
  // Environment-specific validation
  if (config.developmentMode) {
    
    // In development, CLI path should exist or be buildable
    if (config.cliPath?.includes('src/cli.ts')) {
    }
  } else {
    // Production mode - stricter validation
    if (config.executionMode === 'local') {
      errors.push("Production mode requires Docker container execution (executionMode: 'local' not allowed)");
    }
    
    if (!config.cliPath?.includes('/app/packages/cli/dist/')) {
      errors.push("Production mode requires bundled CLI path");
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}
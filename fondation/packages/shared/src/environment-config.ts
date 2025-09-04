/**
 * Environment Configuration Singleton
 *
 * Centralized environment detection and validation for the Fondation monorepo.
 * Eliminates scattered process.env checks and provides a single source of truth
 * for environment configuration across all packages.
 *
 * Phase 2 of Strategy Pattern Simplification - replaces ~30 scattered env checks
 * with a cached, validated singleton pattern.
 */

import { existsSync, readFileSync } from 'node:fs';
import type { Environment, ExecutionMode } from './environment.js';

export interface EnvironmentValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DockerEnvironmentCheck {
  isInsideDocker: boolean;
  hasDockerEnv: boolean;
  hasDockerFile: boolean;
  hasDockerProcess: boolean;
}

/**
 * Singleton class that provides centralized environment detection and validation
 * Caches results to avoid repeated environment checks and file system operations
 */
export class EnvironmentConfig {
  private static instance: EnvironmentConfig | null = null;

  // Cached values to avoid repeated checks
  private _environment: Environment | null = null;
  private _executionMode: ExecutionMode | null = null;
  private _dockerCheck: DockerEnvironmentCheck | null = null;
  private _productionValidation: EnvironmentValidationResult | null = null;
  private _developmentValidation: EnvironmentValidationResult | null = null;

  // Prevent direct instantiation
  private constructor() {}

  /**
   * Get the singleton instance
   */
  static getInstance(): EnvironmentConfig {
    if (!EnvironmentConfig.instance) {
      EnvironmentConfig.instance = new EnvironmentConfig();
    }
    return EnvironmentConfig.instance;
  }

  /**
   * Reset the singleton (useful for testing)
   */
  static reset(): void {
    EnvironmentConfig.instance = null;
  }

  /**
   * Get the current environment (development/production/test)
   * Cached after first call
   */
  getEnvironment(): Environment {
    if (this._environment === null) {
      // Check explicit environment variables
      if (process.env.FONDATION_ENV) {
        this._environment = process.env.FONDATION_ENV as Environment;
      } else {
        // Check NODE_ENV
        const nodeEnv = process.env.NODE_ENV?.toLowerCase();
        if (nodeEnv === 'production') {
          this._environment = 'production';
        } else if (nodeEnv === 'test') {
          this._environment = 'test';
        } else if (nodeEnv === 'development') {
          this._environment = 'development';
        } else {
          // Default to development if not specified
          this._environment = 'development';
        }
      }
    }
    return this._environment;
  }

  /**
   * Get the current execution mode (local/docker/container)
   * Cached after first call with comprehensive Docker detection
   */
  getExecutionMode(): ExecutionMode {
    if (this._executionMode === null) {
      // Check explicit override
      if (process.env.FONDATION_EXECUTION_MODE) {
        this._executionMode = process.env.FONDATION_EXECUTION_MODE as ExecutionMode;
      } else {
        const dockerCheck = this.getDockerEnvironmentCheck();
        if (dockerCheck.isInsideDocker) {
          this._executionMode = 'docker';
        } else if (process.env.KUBERNETES_SERVICE_HOST) {
          this._executionMode = 'container';
        } else {
          this._executionMode = 'local';
        }
      }
    }
    return this._executionMode;
  }

  /**
   * Comprehensive Docker environment detection
   * Checks multiple indicators for reliable Docker detection
   */
  getDockerEnvironmentCheck(): DockerEnvironmentCheck {
    if (this._dockerCheck === null) {
      const hasDockerEnv =
        process.env.DOCKER_CONTAINER === 'true' || process.env.CONTAINER === 'true';
      const hasDockerFile = existsSync('/.dockerenv');
      let hasDockerProcess = false;

      // Check /proc/1/cgroup for Docker indicators (safe with try/catch)
      try {
        if (existsSync('/proc/1/cgroup')) {
          const cgroupContent = readFileSync('/proc/1/cgroup', 'utf8');
          hasDockerProcess = cgroupContent.includes('docker');
        }
      } catch {
        // Ignore errors - we have other indicators
        hasDockerProcess = false;
      }

      this._dockerCheck = {
        hasDockerEnv,
        hasDockerFile,
        hasDockerProcess,
        isInsideDocker: hasDockerEnv || hasDockerFile || hasDockerProcess,
      };
    }
    return this._dockerCheck;
  }

  // Convenience methods for common checks
  isDevelopment(): boolean {
    return this.getEnvironment() === 'development';
  }

  isProduction(): boolean {
    return this.getEnvironment() === 'production';
  }

  isTest(): boolean {
    return this.getEnvironment() === 'test';
  }

  isInsideDocker(): boolean {
    return this.getDockerEnvironmentCheck().isInsideDocker;
  }

  isLocalExecution(): boolean {
    return this.getExecutionMode() === 'local';
  }

  isDockerExecution(): boolean {
    return this.getExecutionMode() === 'docker';
  }

  // Environment variable getters with defaults
  getConvexUrl(): string {
    return process.env.CONVEX_URL || '';
  }

  getClaudeOAuthToken(): string | null {
    return process.env.CLAUDE_CODE_OAUTH_TOKEN || null;
  }

  getGitHubToken(): string | null {
    return process.env.GITHUB_TOKEN || null;
  }

  getWorkerId(): string {
    return (
      process.env.WORKER_ID || `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    );
  }

  getCliPath(): string | null {
    return process.env.CLI_PATH || null;
  }

  getTempDir(): string | null {
    return process.env.TEMP_DIR || null;
  }

  getPollInterval(): number {
    const defaultInterval = this.isDevelopment() ? 3000 : 5000; // Faster polling in dev
    return Number.parseInt(process.env.POLL_INTERVAL || defaultInterval.toString(), 10);
  }

  getLeaseTime(): number {
    return Number.parseInt(process.env.LEASE_TIME || '300000', 10); // 5 minutes
  }

  getHeartbeatInterval(): number {
    return Number.parseInt(process.env.HEARTBEAT_INTERVAL || '60000', 10); // 1 minute
  }

  getMaxConcurrentJobs(): number {
    return Number.parseInt(process.env.MAX_CONCURRENT_JOBS || '1', 10);
  }

  isDebugMode(): boolean {
    return process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development';
  }

  isDryRun(): boolean {
    return process.env.DRY_RUN === 'true';
  }

  /**
   * Validate production environment requirements
   * Cached after first call for performance
   */
  validateProductionEnvironment(): EnvironmentValidationResult {
    if (this._productionValidation === null) {
      const errors: string[] = [];
      const warnings: string[] = [];

      if (!this.isProduction()) {
        this._productionValidation = {
          valid: true,
          errors: [],
          warnings: ['Not running in production mode'],
        };
        return this._productionValidation;
      }

      // CRITICAL: Production must run inside Docker container
      if (!this.isInsideDocker()) {
        errors.push(
          'ARCHITECTURE VIOLATION: Production worker must run inside Docker container. ' +
            'Set DOCKER_CONTAINER=true or run worker using docker-compose. ' +
            'External Docker spawning is not supported to maintain consistent architecture.',
        );
      }

      // Required environment variables for production
      if (!this.getClaudeOAuthToken()) {
        errors.push(
          'CLAUDE_CODE_OAUTH_TOKEN environment variable is required for CLI analysis. ' +
            'Ensure the Docker container is started with proper authentication tokens.',
        );
      }

      if (!this.getConvexUrl()) {
        errors.push(
          'CONVEX_URL environment variable is required for job processing. ' +
            'Worker will crash with exit code 158 without this.',
        );
      }

      // Warnings for optional but recommended variables
      if (!this.getGitHubToken()) {
        warnings.push(
          'GITHUB_TOKEN not set. Private repository analysis will not work unless users provide their own tokens.',
        );
      }

      this._productionValidation = {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    }
    return this._productionValidation;
  }

  /**
   * Validate development environment requirements
   * Cached after first call for performance
   */
  validateDevelopmentEnvironment(): EnvironmentValidationResult {
    if (this._developmentValidation === null) {
      const errors: string[] = [];
      const warnings: string[] = [];

      if (!this.isDevelopment()) {
        this._developmentValidation = {
          valid: true,
          errors: [],
          warnings: ['Not running in development mode'],
        };
        return this._developmentValidation;
      }

      // Development can run locally or in Docker
      if (!this.getConvexUrl()) {
        errors.push(
          'CONVEX_URL environment variable is required even in development. ' +
            'Use: https://basic-stoat-666.convex.cloud',
        );
      }

      // Claude authentication check (prefer host auth, fallback to env var)
      const hasClaudeToken = this.getClaudeOAuthToken() !== null;
      if (!hasClaudeToken) {
        warnings.push(
          "Claude authentication not found. Either authenticate with 'bunx claude auth' or set CLAUDE_CODE_OAUTH_TOKEN",
        );
      }

      // Check for development tools
      if (this.isLocalExecution()) {
        warnings.push('Running in local mode - ensure all development dependencies are installed');
      }

      this._developmentValidation = {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    }
    return this._developmentValidation;
  }

  /**
   * Get comprehensive environment summary for debugging
   */
  getEnvironmentSummary(): Record<string, any> {
    const dockerCheck = this.getDockerEnvironmentCheck();

    return {
      // Basic environment info
      environment: this.getEnvironment(),
      executionMode: this.getExecutionMode(),
      nodeEnv: process.env.NODE_ENV,
      platform: process.platform,
      arch: process.arch,

      // Docker detection details
      docker: dockerCheck,

      // Environment variables (without sensitive values)
      env: {
        hasConvexUrl: Boolean(this.getConvexUrl()),
        hasClaudeToken: Boolean(this.getClaudeOAuthToken()),
        hasGitHubToken: Boolean(this.getGitHubToken()),
        hasCliPath: Boolean(this.getCliPath()),
        hasTempDir: Boolean(this.getTempDir()),
        isDebug: this.isDebugMode(),
        isDryRun: this.isDryRun(),
      },

      // Configuration values
      config: {
        workerId: this.getWorkerId(),
        pollInterval: this.getPollInterval(),
        leaseTime: this.getLeaseTime(),
        heartbeatInterval: this.getHeartbeatInterval(),
        maxConcurrentJobs: this.getMaxConcurrentJobs(),
      },

      // Validation results
      validation: {
        production: this.isProduction() ? this.validateProductionEnvironment() : null,
        development: this.isDevelopment() ? this.validateDevelopmentEnvironment() : null,
      },
    };
  }

  /**
   * Throw an error if the current environment is invalid
   * Uses cached validation results for performance
   */
  requireValidEnvironment(): void {
    const validation = this.isProduction()
      ? this.validateProductionEnvironment()
      : this.validateDevelopmentEnvironment();

    if (!validation.valid) {
      throw new Error(
        `Invalid ${this.getEnvironment()} environment configuration:\n` +
          validation.errors.join('\n'),
      );
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      console.warn(
        `Environment warnings for ${this.getEnvironment()} mode:\n` +
          validation.warnings.join('\n'),
      );
    }
  }
}

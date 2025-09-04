/**
 * Worker Configuration Builder Pattern
 *
 * Phase 3 of Strategy Pattern Simplification: Implements the Builder Pattern
 * to eliminate complex nested conditionals and make configuration assembly
 * self-documenting through method chaining.
 *
 * Key Benefits:
 * - Fluent interface makes configuration logic readable
 * - Separation of concerns for different config aspects
 * - Eliminates nested if/else chains
 * - Leverages EnvironmentConfig singleton for consistency
 * - Maintains backward compatibility with existing config.ts
 */

import { dev } from '@fondation/shared/environment';
import { EnvironmentConfig } from '@fondation/shared/environment-config';

// Re-export the WorkerConfig type for backward compatibility
export type WorkerConfig = {
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

/**
 * Builder class implementing fluent interface for worker configuration
 *
 * Usage:
 * ```typescript
 * const config = WorkerConfigBuilder
 *   .create()
 *   .withEnvironmentDefaults()
 *   .withCliPath()
 *   .withTempDirectory()
 *   .withPollingConfig()
 *   .withValidation()
 *   .build();
 * ```
 */
export class WorkerConfigBuilder {
  private envConfig: EnvironmentConfig;
  private config: Partial<WorkerConfig>;

  private constructor() {
    this.envConfig = EnvironmentConfig.getInstance();
    this.config = {};
  }

  /**
   * Create a new builder instance
   */
  static create(): WorkerConfigBuilder {
    return new WorkerConfigBuilder();
  }

  /**
   * Set environment-aware defaults based on current execution context
   * Establishes foundation configuration from EnvironmentConfig singleton
   */
  withEnvironmentDefaults(): this {
    this.config = {
      ...this.config,
      workerId: this.envConfig.getWorkerId(),
      convexUrl: this.envConfig.getConvexUrl(),
      executionMode: this.envConfig.getExecutionMode(),
      developmentMode: this.envConfig.isDevelopment(),
      // Basic timing defaults from singleton
      pollInterval: this.envConfig.getPollInterval(),
      leaseTime: this.envConfig.getLeaseTime(),
      heartbeatInterval: this.envConfig.getHeartbeatInterval(),
      maxConcurrentJobs: this.envConfig.getMaxConcurrentJobs(),
    };
    return this;
  }

  /**
   * Configure CLI path based on environment and execution context
   * Replaces complex getCLIPath() logic with clear decision tree
   */
  withCliPath(): this {
    // Check for explicit override first (highest priority)
    const explicitPath = this.envConfig.getCliPath();
    if (explicitPath) {
      this.config.cliPath = explicitPath;
      return this;
    }

    // Environment-specific CLI path resolution
    if (this.config.developmentMode) {
      this.config.cliPath = this.resolveDevelopmentCliPath();
    } else {
      this.config.cliPath = this.resolveProductionCliPath();
    }

    return this;
  }

  /**
   * Configure temporary directory based on environment
   * Replaces getTempDir() logic with clear method
   */
  withTempDirectory(): this {
    // Check for explicit override first (highest priority)
    const explicitTempDir = this.envConfig.getTempDir();
    if (explicitTempDir) {
      this.config.tempDir = explicitTempDir;
      return this;
    }

    // Environment-specific temp directory
    this.config.tempDir = this.config.developmentMode
      ? '/tmp/fondation-dev' // Separate development temp dir
      : '/tmp/fondation'; // Production temp dir

    return this;
  }

  /**
   * Apply any polling configuration overrides
   * Currently uses environment defaults but allows for future customization
   */
  withPollingConfig(): this {
    // Polling configuration is already set in withEnvironmentDefaults()
    // This method exists for future extensibility and to make the builder
    // self-documenting about configuration aspects
    return this;
  }

  /**
   * Validate the configuration and ensure all required fields are present
   * Leverages EnvironmentConfig singleton validation and adds builder-specific checks
   */
  withValidation(): this {
    // Use centralized environment validation from singleton
    this.envConfig.requireValidEnvironment();

    // Validate required configuration fields are present
    this.validateRequiredFields();

    // Add worker-specific validation
    this.validateWorkerSpecificConfig();

    return this;
  }

  /**
   * Build and return the final configuration
   * Performs final validation and returns typed WorkerConfig
   */
  build(): WorkerConfig {
    // Ensure all required fields are present
    const requiredFields: (keyof WorkerConfig)[] = [
      'workerId',
      'convexUrl',
      'pollInterval',
      'leaseTime',
      'heartbeatInterval',
      'maxConcurrentJobs',
      'tempDir',
      'executionMode',
      'developmentMode',
    ];

    for (const field of requiredFields) {
      if (this.config[field] === undefined) {
        throw new Error(`Configuration builder missing required field: ${field}`);
      }
    }

    return this.config as WorkerConfig;
  }

  // Private helper methods for clean separation of concerns

  /**
   * Resolve CLI path for development environment
   * Encapsulates development-specific CLI path logic
   */
  private resolveDevelopmentCliPath(): string {
    // In development, prefer source execution if available
    const sourcePath = dev.paths.cliSource();
    if (sourcePath) {
      return sourcePath;
    }

    // Fallback to local bundle for development
    return '@fondation/cli/dist/cli.bundled.mjs';
  }

  /**
   * Resolve CLI path for production environment
   * Encapsulates production-specific CLI path logic
   */
  private resolveProductionCliPath(): string {
    // Production always uses Docker container path
    return '/app/packages/cli/dist/cli.bundled.mjs';
  }

  /**
   * Validate that all required configuration fields are present
   */
  private validateRequiredFields(): void {
    if (!this.config.workerId) {
      throw new Error('Configuration validation failed: workerId is required');
    }

    if (!this.config.convexUrl) {
      throw new Error('Configuration validation failed: convexUrl is required');
    }

    if (this.config.executionMode === undefined) {
      throw new Error('Configuration validation failed: executionMode is required');
    }

    if (this.config.developmentMode === undefined) {
      throw new Error('Configuration validation failed: developmentMode is required');
    }
  }

  /**
   * Validate worker-specific configuration requirements
   */
  private validateWorkerSpecificConfig(): void {
    const errors: string[] = [];

    // CLI-specific validation based on environment
    if (this.config.developmentMode) {
      // Development CLI validation
      if (this.config.cliPath?.includes('src/cli.ts')) {
        // Additional development CLI checks could go here
        // For now, we trust that development setup is correct
      }
    } else {
      // Production CLI validation
      if (!this.config.cliPath?.includes('/app/packages/cli/dist/')) {
        errors.push('Production mode requires bundled CLI path at /app/packages/cli/dist/');
      }
    }

    // Validate numeric configuration values
    if ((this.config.pollInterval ?? 0) <= 0) {
      errors.push('Poll interval must be positive');
    }

    if ((this.config.leaseTime ?? 0) <= 0) {
      errors.push('Lease time must be positive');
    }

    if ((this.config.maxConcurrentJobs ?? 0) <= 0) {
      errors.push('Max concurrent jobs must be positive');
    }

    if (errors.length > 0) {
      throw new Error(`Worker configuration validation failed:\n${errors.join('\n')}`);
    }
  }
}

/**
 * Factory function for creating worker configuration using the builder pattern
 * Provides a clean, one-line interface for standard configuration creation
 */
export function createWorkerConfig(): WorkerConfig {
  return WorkerConfigBuilder.create()
    .withEnvironmentDefaults()
    .withCliPath()
    .withTempDirectory()
    .withPollingConfig()
    .withValidation()
    .build();
}

/**
 * Advanced factory function for creating worker configuration with custom steps
 * Allows for partial customization while maintaining builder pattern benefits
 */
export function createCustomWorkerConfig(
  customizer: (builder: WorkerConfigBuilder) => WorkerConfigBuilder,
): WorkerConfig {
  const builder = WorkerConfigBuilder.create()
    .withEnvironmentDefaults()
    .withCliPath()
    .withTempDirectory()
    .withPollingConfig();

  return customizer(builder).withValidation().build();
}

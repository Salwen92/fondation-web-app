/**
 * Worker Configuration Module (Refactored)
 *
 * Phase 3 of Strategy Pattern Simplification: Uses Configuration Builder Pattern
 * to simplify configuration creation and eliminate complex conditional logic.
 *
 * Reduced from 125 lines to ~40 lines by leveraging WorkerConfigBuilder
 * which encapsulates all the complex environment detection and CLI path resolution.
 */

import {
  createCustomWorkerConfig,
  createWorkerConfig,
  type WorkerConfig,
  type WorkerConfigBuilder,
} from './config-builder.js';

/**
 * Create standard worker configuration using Builder Pattern
 * Replaces complex createConfig() with single factory function call
 *
 * This eliminates ~80 lines of environment detection, CLI path resolution,
 * and temp directory logic by delegating to WorkerConfigBuilder
 */
export function createConfig(): WorkerConfig {
  return createWorkerConfig();
}

/**
 * Create custom worker configuration with builder customization
 * Provides extensibility while maintaining builder pattern benefits
 *
 * @param customizer Function to customize the builder before building
 */
export function createCustomConfig(
  customizer: (builder: WorkerConfigBuilder) => WorkerConfigBuilder,
): WorkerConfig {
  return createCustomWorkerConfig(customizer);
}

/**
 * Validate worker configuration (simplified)
 * Delegates validation to WorkerConfigBuilder's comprehensive validation
 */
export function validateConfig(config: WorkerConfig): void {
  // The WorkerConfigBuilder.withValidation() method handles all validation
  // including environment validation and worker-specific checks
  //
  // This function is kept for backward compatibility but is no longer needed
  // since the builder pattern validates during construction

  // Basic sanity check that config is not null/undefined
  if (!config || typeof config !== 'object') {
    throw new Error('Configuration validation failed: invalid config object');
  }

  // All detailed validation is handled by WorkerConfigBuilder.withValidation()
  // during config.build() - no need to duplicate logic here
}

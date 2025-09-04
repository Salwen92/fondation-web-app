/**
 * CLI Execution Strategy Factory
 *
 * Creates appropriate CLI execution strategy based on environment
 */

import { isDevelopment } from '../utils/environment.js';
import type { CLIExecutionStrategy } from './base-strategy';
import { DevelopmentCLIStrategy } from './development-strategy';
import { ProductionCLIStrategy } from './production-strategy';

/**
 * Create appropriate CLI execution strategy based on current environment
 */
export function createCLIStrategy(cliPath: string): CLIExecutionStrategy {
  if (isDevelopment()) {
    return new DevelopmentCLIStrategy(cliPath);
  }
  return new ProductionCLIStrategy(cliPath);
}

/**
 * Get strategy name for the current environment
 */
export function getCLIStrategyName(): string {
  return isDevelopment() ? 'Development' : 'Production';
}

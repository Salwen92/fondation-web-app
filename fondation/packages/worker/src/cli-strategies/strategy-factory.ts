/**
 * CLI Execution Strategy Factory
 * 
 * Creates appropriate CLI execution strategy based on environment
 */

import type { CLIExecutionStrategy } from "./base-strategy";
import { DevelopmentCLIStrategy } from "./development-strategy";
import { ProductionCLIStrategy } from "./production-strategy";
import { isDevelopment } from "../utils/environment.js";

export class CLIStrategyFactory {
  /**
   * Create appropriate CLI execution strategy based on current environment
   */
  static create(cliPath: string): CLIExecutionStrategy {
    if (isDevelopment()) {
      return new DevelopmentCLIStrategy(cliPath);
    }
      return new ProductionCLIStrategy(cliPath);
  }
  
  /**
   * Get strategy name for the current environment
   */
  static getStrategyName(): string {
    return isDevelopment() ? 'Development' : 'Production';
  }
}
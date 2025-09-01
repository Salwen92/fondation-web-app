/**
 * CLI Execution Strategy Factory
 * 
 * Creates appropriate CLI execution strategy based on environment
 */

import type { CLIExecutionStrategy } from "./base-strategy";
import { DevelopmentCLIStrategy } from "./development-strategy";
import { ProductionCLIStrategy } from "./production-strategy";
import { isDevelopment } from "@fondation/shared/environment";

export class CLIStrategyFactory {
  /**
   * Create appropriate CLI execution strategy based on current environment
   */
  static create(cliPath: string): CLIExecutionStrategy {
    if (isDevelopment()) {
      console.log('🔧 Creating Development CLI Strategy');
      return new DevelopmentCLIStrategy(cliPath);
    } else {
      console.log('🐳 Creating Production CLI Strategy');
      return new ProductionCLIStrategy(cliPath);
    }
  }
  
  /**
   * Get strategy name for the current environment
   */
  static getStrategyName(): string {
    return isDevelopment() ? 'Development' : 'Production';
  }
}
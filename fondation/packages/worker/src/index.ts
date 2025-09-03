#!/usr/bin/env node
/**
 * Fondation Worker - Persistent job processor
 * Polls Convex for pending jobs and executes Fondation CLI
 */

import { ConvexClient } from "convex/browser";
import { PermanentWorker } from "./worker";
import { createConfig, validateConfig } from "./config";
import { WorkerLogger } from "./worker-logger";

async function main() {
  
  // Check for dry run mode (for testing)
  if (process.env.DRY_RUN === 'true') {
    process.exit(0);
  }
  
  // Initialize startup logger
  const startupLogger = new WorkerLogger('startup');
  
  const config = await startupLogger.safeExecute(
    'load-config',
    async () => {
      const config = createConfig();
      validateConfig(config);
      return config;
    }
  );
  
  if (!config) {
    startupLogger.logError('worker-startup', new Error('Failed to load configuration'));
    process.exit(1);
  }
  
  const convexClient = new ConvexClient(config.convexUrl);
  const worker = new PermanentWorker(config, convexClient);

  // Graceful shutdown handlers
  process.on("SIGTERM", async () => {
    await worker.stop();
    process.exit(0);
  });
  
  process.on("SIGINT", async () => {
    await worker.stop();
    process.exit(0);
  });
  
  const startSuccess = await startupLogger.safeExecute(
    'worker-start',
    async () => {
      await worker.start();
      return true;
    }
  );
  
  if (!startSuccess) {
    startupLogger.logError('worker-startup', new Error('Worker failed to start'));
    process.exit(1);
  }
}

// Execute
main().catch((error) => {
  const emergencyLogger = new WorkerLogger('emergency');
  emergencyLogger.logError('main-execution', error);
  process.exit(1);
});
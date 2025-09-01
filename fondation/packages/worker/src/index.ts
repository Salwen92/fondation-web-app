#!/usr/bin/env node
/**
 * Fondation Worker - Persistent job processor
 * Polls Convex for pending jobs and executes Fondation CLI
 */

import { ConvexClient } from "convex/browser";
import { PermanentWorker } from "./worker";
import { createConfig, validateConfig } from "./config";

async function main() {
  
  // Check for dry run mode (for testing)
  if (process.env.DRY_RUN === 'true') {
    process.exit(0);
  }
  
  try {
    // Import config functions
    const config = createConfig();
    validateConfig(config);
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
    try {
      await worker.start();
    } catch (_error) {
      process.exit(1);
    }
  } catch (_error) {
    process.exit(1);
  }
}

// Execute
main().catch((_error) => {
  process.exit(1);
});
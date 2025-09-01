#!/usr/bin/env node
/**
 * Fondation Worker - Persistent job processor
 * Polls Convex for pending jobs and executes Fondation CLI
 */

import { ConvexClient } from "convex/browser";
import { PermanentWorker } from "./worker";
import { createConfig, validateConfig } from "./config";

async function main() {
  console.log("🚀 Starting Fondation Worker");
  
  // Check for dry run mode (for testing)
  if (process.env.DRY_RUN === 'true') {
    console.log("Dry run mode - exiting after startup check");
    process.exit(0);
  }
  
  try {
    // Import config functions
    const config = createConfig();
    console.log("Config:", {
      ...config,
      convexUrl: config.convexUrl ? "✓ Set" : "✗ Missing"
    });
    
    console.log("✅ Config loaded, validating...");
    validateConfig(config);
    console.log("✅ Config validated");
    
    // Create Convex client
    console.log("🔌 Creating Convex client...");
    const convexClient = new ConvexClient(config.convexUrl);
    console.log("✅ Convex client created");
    
    // Create and start worker
    console.log("⚡ Creating worker instance...");
    const worker = new PermanentWorker(config, convexClient);
    console.log("✅ Worker instance created");
  
    // Graceful shutdown handlers
    process.on("SIGTERM", async () => {
      console.log("📛 SIGTERM received, shutting down gracefully...");
      await worker.stop();
      process.exit(0);
    });
    
    process.on("SIGINT", async () => {
      console.log("📛 SIGINT received, shutting down gracefully...");
      await worker.stop();
      process.exit(0);
    });
    
    // Start the worker
    console.log("🚀 Starting worker...");
    try {
      await worker.start();
    } catch (error) {
      console.error("❌ Worker failed:", error);
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Fatal error during initialization:", error);
    process.exit(1);
  }
}

// Execute
main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
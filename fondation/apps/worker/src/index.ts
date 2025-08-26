#!/usr/bin/env node
/**
 * Fondation Worker - Persistent job processor
 * Polls Convex for pending jobs and executes Fondation CLI
 */

import { WorkerConfig, JobStatus } from "@fondation/shared";
import { PermanentWorker } from "./worker.js";
import { config } from "./config.js";

async function main() {
  console.log("🚀 Starting Fondation Worker");
  console.log(`📍 Worker ID: ${config.workerId}`);
  console.log(`🔄 Poll interval: ${config.pollInterval}ms`);
  console.log(`⏱️  Lease time: ${config.leaseTime}ms`);
  
  const worker = new PermanentWorker(config);
  
  // Graceful shutdown handlers
  process.on("SIGTERM", async () => {
    console.log("⏹️  Received SIGTERM, shutting down gracefully...");
    await worker.stop();
    process.exit(0);
  });
  
  process.on("SIGINT", async () => {
    console.log("⏹️  Received SIGINT, shutting down gracefully...");
    await worker.stop();
    process.exit(0);
  });
  
  // Handle uncaught errors
  process.on("uncaughtException", (error) => {
    console.error("❌ Uncaught exception:", error);
    process.exit(1);
  });
  
  process.on("unhandledRejection", (reason, promise) => {
    console.error("❌ Unhandled rejection at:", promise, "reason:", reason);
    process.exit(1);
  });
  
  // Start the worker
  try {
    await worker.start();
  } catch (error) {
    console.error("❌ Failed to start worker:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });
}
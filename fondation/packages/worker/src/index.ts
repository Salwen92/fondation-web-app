#!/usr/bin/env node
/**
 * Fondation Worker - Persistent job processor
 * Polls Convex for pending jobs and executes Fondation CLI
 */

// Environment variables loaded from root .env.local by npm scripts

// Local types until workspace resolution is fixed
type WorkerConfig = {
  workerId: string;
  convexUrl: string;
  pollInterval: number;
  leaseTime: number;
  heartbeatInterval: number;
  maxConcurrentJobs: number;
  tempDir: string;
  cliPath?: string;
};

type JobStatus = 
  | "pending" | "claimed" | "running" | "cloning" 
  | "analyzing" | "gathering" | "completed" 
  | "failed" | "canceled" | "dead";
import { ConvexClient } from "convex/browser";
import { PermanentWorker } from "./worker.js";
import { config } from "./config.js";

async function main() {
  
  
  // Create Convex client
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
  
  // Handle uncaught errors
  process.on("uncaughtException", (_error) => {
    process.exit(1);
  });
  
  process.on("unhandledRejection", (_reason, _promise) => {
    process.exit(1);
  });
  
  // Start the worker
  try {
    await worker.start();
  } catch (_error) {
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((_error) => {
    process.exit(1);
  });
}
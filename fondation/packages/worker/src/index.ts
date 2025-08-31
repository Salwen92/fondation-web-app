#!/usr/bin/env node
/**
 * Fondation Worker - Persistent job processor
 * Polls Convex for pending jobs and executes Fondation CLI
 */

// Load environment variables from root .env.local
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Load .env.local from monorepo root
try {
  const envPath = join(import.meta.dirname, '../../../.env.local');
  console.log('Loading env from:', envPath);
  const envFile = readFileSync(envPath, 'utf8');
  console.log('Env file contents:', envFile);
  for (const line of envFile.split('\n')) {
    const [key, value] = line.split('=');
    if (key && value && !process.env[key]) {
      process.env[key] = value;
      console.log(`Set ${key}=${value}`);
    }
  }
} catch (error) {
  console.warn('Could not load .env.local:', error);
}

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

async function main() {
  console.log("Main function called");
  
  // Import config functions after env vars are loaded
  const { createConfig, validateConfig } = await import("./config.js");
  const config = createConfig();
  console.log("Config:", config);
  validateConfig(config);
  
  // Create Convex client
  console.log("Creating Convex client with URL:", config.convexUrl);
  const convexClient = new ConvexClient(config.convexUrl);
  
  console.log("Creating worker...");
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
  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    process.exit(1);
  });
  
  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    process.exit(1);
  });
  
  // Start the worker
  try {
    console.log("Starting worker...");
    await worker.start();
  } catch (error) {
    console.error("Worker failed to start:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((_error) => {
    process.exit(1);
  });
}
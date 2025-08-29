// Local type until workspace resolution is fixed
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
import { randomBytes } from "crypto";

// Generate worker ID
const workerId = process.env.WORKER_ID || `worker-${randomBytes(8).toString("hex")}`;

export const config: WorkerConfig = {
  workerId,
  convexUrl: process.env.CONVEX_URL || "",
  pollInterval: parseInt(process.env.POLL_INTERVAL || "5000"),
  leaseTime: parseInt(process.env.LEASE_TIME || "300000"), // 5 minutes
  heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL || "60000"), // 1 minute
  maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS || "1"),
  tempDir: process.env.TEMP_DIR || "/tmp/fondation",
  cliPath: process.env.CLI_PATH || "claude", // Use system claude CLI by default
};

// Validate required configuration
export function validateConfig(): void {
  if (!config.convexUrl) {
    throw new Error("CONVEX_URL environment variable is required");
  }
  
  console.log("✅ Configuration validated");
  console.log(`   Worker ID: ${config.workerId}`);
  console.log(`   Convex URL: ${config.convexUrl}`);
  console.log(`   Poll interval: ${config.pollInterval}ms`);
  console.log(`   Max concurrent jobs: ${config.maxConcurrentJobs}`);
}
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
import { randomBytes } from "node:crypto";

// Generate worker ID
const workerId = process.env.WORKER_ID || `worker-${randomBytes(8).toString("hex")}`;

export const config: WorkerConfig = {
  workerId,
  convexUrl: process.env.CONVEX_URL || "",
  pollInterval: Number.parseInt(process.env.POLL_INTERVAL || "5000", 10),
  leaseTime: Number.parseInt(process.env.LEASE_TIME || "300000", 10), // 5 minutes
  heartbeatInterval: Number.parseInt(process.env.HEARTBEAT_INTERVAL || "60000", 10), // 1 minute
  maxConcurrentJobs: Number.parseInt(process.env.MAX_CONCURRENT_JOBS || "1", 10),
  tempDir: process.env.TEMP_DIR || "/tmp/fondation",
  cliPath: process.env.CLI_PATH || "claude", // Use system claude CLI by default
};

// Validate required configuration
export function validateConfig(): void {
  if (!config.convexUrl) {
    throw new Error("CONVEX_URL environment variable is required");
  }
}
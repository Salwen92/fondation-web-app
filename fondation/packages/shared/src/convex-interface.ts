// Convex interface to decouple worker from web project
export interface ConvexAPI {
  // Job management functions
  claimJob: (args: { workerId: string; leaseTime: number }) => Promise<any>;
  updateJobProgress: (args: { jobId: string; progress: ProgressUpdate }) => Promise<void>;
  completeJob: (args: { jobId: string; result: CLIResult }) => Promise<void>;
  failJob: (args: { jobId: string; error: string }) => Promise<void>;
  heartbeat: (args: { workerId: string }) => Promise<void>;
}

export interface ConvexClient {
  query: (fn: any, args?: any) => Promise<any>;
  mutation: (fn: any, args?: any) => Promise<any>;
}

// Re-export shared types that were being imported from web
export type DocumentId = string;

// Job and progress types (should already be in types.ts)
import type { CLIResult, ProgressUpdate } from './types.js';

export type { CLIResult, ProgressUpdate };

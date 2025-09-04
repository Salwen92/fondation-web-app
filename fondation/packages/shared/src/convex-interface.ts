// Convex interface to decouple worker from web project
export interface ConvexAPI {
  // Job management functions
  claimJob: (args: { workerId: string; leaseTime: number }) => Promise<{
    _id: string;
    repository: DocumentId;
    operation: string;
    status: string;
    result?: CLIResult | null;
    error?: string | null;
    progress?: ProgressUpdate | null;
    claimedAt?: number;
    claimedBy?: string | null;
  } | null>;
  updateJobProgress: (args: { jobId: string; progress: ProgressUpdate }) => Promise<void>;
  completeJob: (args: { jobId: string; result: CLIResult }) => Promise<void>;
  failJob: (args: { jobId: string; error: string }) => Promise<void>;
  heartbeat: (args: { workerId: string }) => Promise<void>;
}

// Generic function reference type for Convex
type ConvexFunctionReference = {
  _type: string;
  _visibility: string;
  _args: unknown;
  _returnType: unknown;
  _componentPath: string | undefined;
};

export interface ConvexClient {
  query: <T = unknown>(fn: ConvexFunctionReference, args?: unknown) => Promise<T>;
  mutation: <T = unknown>(fn: ConvexFunctionReference, args?: unknown) => Promise<T>;
}

// Re-export shared types that were being imported from web
export type DocumentId = string;

// Job and progress types (should already be in types.ts)
import type { CLIResult, ProgressUpdate } from './types.js';

export type { CLIResult, ProgressUpdate };

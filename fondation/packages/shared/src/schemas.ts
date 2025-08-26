import { z } from "zod";

// Retry policy configuration
export const RetryPolicySchema = z.object({
  maxAttempts: z.number().default(3),
  baseDelayMs: z.number().default(1000),
  maxDelayMs: z.number().default(60000),
  backoffMultiplier: z.number().default(2),
  jitterMs: z.number().default(1000),
});

export type RetryPolicy = z.infer<typeof RetryPolicySchema>;

// Calculate next retry delay with exponential backoff and jitter
export function calculateRetryDelay(
  attempt: number,
  policy: RetryPolicy
): number {
  const exponentialDelay = Math.min(
    policy.baseDelayMs * Math.pow(policy.backoffMultiplier, attempt - 1),
    policy.maxDelayMs
  );
  
  const jitter = Math.random() * policy.jitterMs;
  
  return exponentialDelay + jitter;
}

// Health check schema
export const HealthCheckSchema = z.object({
  status: z.enum(["healthy", "unhealthy", "degraded"]),
  uptime: z.number(),
  lastJobTime: z.number().optional(),
  activeJobs: z.number(),
  queueDepth: z.number().optional(),
  memory: z.object({
    rss: z.number(),
    heapTotal: z.number(),
    heapUsed: z.number(),
    external: z.number(),
  }),
  errors: z.array(z.string()).optional(),
});

export type HealthCheck = z.infer<typeof HealthCheckSchema>;

// Metrics schema
export const MetricsSchema = z.object({
  jobsProcessed: z.number(),
  jobsSucceeded: z.number(),
  jobsFailed: z.number(),
  jobsCanceled: z.number(),
  averageJobDuration: z.number(),
  queueDepth: z.number(),
  claimRate: z.number(),
  successRate: z.number(),
  timestamp: z.number(),
});

export type Metrics = z.infer<typeof MetricsSchema>;
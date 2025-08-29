import { z } from "zod";
export declare const RetryPolicySchema: z.ZodObject<{
    maxAttempts: z.ZodDefault<z.ZodNumber>;
    baseDelayMs: z.ZodDefault<z.ZodNumber>;
    maxDelayMs: z.ZodDefault<z.ZodNumber>;
    backoffMultiplier: z.ZodDefault<z.ZodNumber>;
    jitterMs: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
    jitterMs: number;
}, {
    maxAttempts?: number | undefined;
    baseDelayMs?: number | undefined;
    maxDelayMs?: number | undefined;
    backoffMultiplier?: number | undefined;
    jitterMs?: number | undefined;
}>;
export type RetryPolicy = z.infer<typeof RetryPolicySchema>;
export declare function calculateRetryDelay(attempt: number, policy: RetryPolicy): number;
export declare const MetricsSchema: z.ZodObject<{
    jobsProcessed: z.ZodNumber;
    jobsSucceeded: z.ZodNumber;
    jobsFailed: z.ZodNumber;
    jobsCanceled: z.ZodNumber;
    averageJobDuration: z.ZodNumber;
    queueDepth: z.ZodNumber;
    claimRate: z.ZodNumber;
    successRate: z.ZodNumber;
    timestamp: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    jobsProcessed: number;
    jobsSucceeded: number;
    jobsFailed: number;
    jobsCanceled: number;
    averageJobDuration: number;
    queueDepth: number;
    claimRate: number;
    successRate: number;
    timestamp: number;
}, {
    jobsProcessed: number;
    jobsSucceeded: number;
    jobsFailed: number;
    jobsCanceled: number;
    averageJobDuration: number;
    queueDepth: number;
    claimRate: number;
    successRate: number;
    timestamp: number;
}>;
export type Metrics = z.infer<typeof MetricsSchema>;

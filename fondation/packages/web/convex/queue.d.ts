/**
 * Claim one job atomically for processing
 * Uses compare-and-swap pattern to prevent race conditions
 */
export declare const claimOne: import("convex/server").RegisteredMutation<"public", {
    leaseMs?: number | undefined;
    workerId: string;
}, Promise<{
    id: import("convex/values").GenericId<"jobs">;
    repositoryId: import("convex/values").GenericId<"repositories">;
    userId: import("convex/values").GenericId<"users">;
    prompt: string;
    callbackToken: string;
    attempts: number | undefined;
} | null>>;
/**
 * Update job status and extend lease (heartbeat)
 */
export declare const heartbeat: import("convex/server").RegisteredMutation<"public", {
    status?: "running" | "cloning" | "analyzing" | "gathering" | undefined;
    progress?: string | undefined;
    currentStep?: number | undefined;
    leaseMs?: number | undefined;
    jobId: import("convex/values").GenericId<"jobs">;
    workerId: string;
}, Promise<{
    success: boolean;
}>>;
/**
 * Mark job as completed
 */
export declare const complete: import("convex/server").RegisteredMutation<"public", {
    result?: string | {
        data?: string | undefined;
        message?: string | undefined;
        success: boolean;
    } | null | undefined;
    docsCount?: number | undefined;
    jobId: import("convex/values").GenericId<"jobs">;
    workerId: string;
}, Promise<{
    success: boolean;
}>>;
/**
 * Handle job failure with retry logic
 */
export declare const retryOrFail: import("convex/server").RegisteredMutation<"public", {
    error: string;
    jobId: import("convex/values").GenericId<"jobs">;
    workerId: string;
}, Promise<{
    status: string;
    attempts: number;
    nextRunAt?: undefined;
} | {
    status: string;
    attempts: number;
    nextRunAt: string;
}>>;
/**
 * Reclaim expired leases (for failed workers)
 */
export declare const reclaimExpired: import("convex/server").RegisteredMutation<"internal", {}, Promise<{
    reclaimed: number;
    checked: number;
}>>;
/**
 * Create a job with deduplication support
 */
export declare const createJob: import("convex/server").RegisteredMutation<"public", {
    dedupeKey?: string | undefined;
    userId: import("convex/values").GenericId<"users">;
    repositoryId: import("convex/values").GenericId<"repositories">;
    prompt: string;
    callbackToken: string;
}, Promise<{
    jobId: import("convex/values").GenericId<"jobs">;
    duplicate: boolean;
    status: string;
}>>;
/**
 * Get queue metrics
 */
export declare const getMetrics: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    counts: {
        pending: number;
        processing: number;
        completed: number;
        failed: number;
        dead: number;
    };
    recentActivity: {
        total: number;
        completed: number;
        failed: number;
    };
    timestamp: number;
}>>;
//# sourceMappingURL=queue.d.ts.map
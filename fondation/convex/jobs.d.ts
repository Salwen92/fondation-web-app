export declare const create: import("convex/server").RegisteredMutation<"public", {
    userId: import("convex/values").GenericId<"users">;
    repositoryId: import("convex/values").GenericId<"repositories">;
    prompt: string;
}, Promise<{
    jobId: import("convex/values").GenericId<"jobs">;
    callbackToken: string;
}>>;
export declare const listUserJobs: import("convex/server").RegisteredQuery<"public", {
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    _id: import("convex/values").GenericId<"jobs">;
    _creationTime: number;
    runAt?: number | undefined;
    attempts?: number | undefined;
    maxAttempts?: number | undefined;
    lockedBy?: string | undefined;
    leaseUntil?: number | undefined;
    dedupeKey?: string | undefined;
    lastError?: string | undefined;
    updatedAt?: number | undefined;
    completedAt?: number | undefined;
    progress?: string | undefined;
    currentStep?: number | undefined;
    totalSteps?: number | undefined;
    result?: string | {
        message?: string | undefined;
        data?: string | undefined;
        success: boolean;
    } | null | undefined;
    error?: string | undefined;
    docsCount?: number | undefined;
    cancelRequested?: boolean | undefined;
    runId?: string | undefined;
    regenerationStats?: {
        inserted: number;
        updated: number;
        skipped: number;
        rejected: number;
        deleted: number;
    } | undefined;
    createdAt: number;
    userId: import("convex/values").GenericId<"users">;
    repositoryId: import("convex/values").GenericId<"repositories">;
    status: "pending" | "claimed" | "cloning" | "analyzing" | "gathering" | "running" | "completed" | "failed" | "canceled" | "dead";
    prompt: string;
    callbackToken: string;
}[]>>;
export declare const getJob: import("convex/server").RegisteredQuery<"public", {
    jobId: import("convex/values").GenericId<"jobs">;
}, Promise<{
    _id: import("convex/values").GenericId<"jobs">;
    _creationTime: number;
    runAt?: number | undefined;
    attempts?: number | undefined;
    maxAttempts?: number | undefined;
    lockedBy?: string | undefined;
    leaseUntil?: number | undefined;
    dedupeKey?: string | undefined;
    lastError?: string | undefined;
    updatedAt?: number | undefined;
    completedAt?: number | undefined;
    progress?: string | undefined;
    currentStep?: number | undefined;
    totalSteps?: number | undefined;
    result?: string | {
        message?: string | undefined;
        data?: string | undefined;
        success: boolean;
    } | null | undefined;
    error?: string | undefined;
    docsCount?: number | undefined;
    cancelRequested?: boolean | undefined;
    runId?: string | undefined;
    regenerationStats?: {
        inserted: number;
        updated: number;
        skipped: number;
        rejected: number;
        deleted: number;
    } | undefined;
    createdAt: number;
    userId: import("convex/values").GenericId<"users">;
    repositoryId: import("convex/values").GenericId<"repositories">;
    status: "pending" | "claimed" | "cloning" | "analyzing" | "gathering" | "running" | "completed" | "failed" | "canceled" | "dead";
    prompt: string;
    callbackToken: string;
} | null>>;
export declare const getById: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"jobs">;
}, Promise<{
    _id: import("convex/values").GenericId<"jobs">;
    _creationTime: number;
    runAt?: number | undefined;
    attempts?: number | undefined;
    maxAttempts?: number | undefined;
    lockedBy?: string | undefined;
    leaseUntil?: number | undefined;
    dedupeKey?: string | undefined;
    lastError?: string | undefined;
    updatedAt?: number | undefined;
    completedAt?: number | undefined;
    progress?: string | undefined;
    currentStep?: number | undefined;
    totalSteps?: number | undefined;
    result?: string | {
        message?: string | undefined;
        data?: string | undefined;
        success: boolean;
    } | null | undefined;
    error?: string | undefined;
    docsCount?: number | undefined;
    cancelRequested?: boolean | undefined;
    runId?: string | undefined;
    regenerationStats?: {
        inserted: number;
        updated: number;
        skipped: number;
        rejected: number;
        deleted: number;
    } | undefined;
    createdAt: number;
    userId: import("convex/values").GenericId<"users">;
    repositoryId: import("convex/values").GenericId<"repositories">;
    status: "pending" | "claimed" | "cloning" | "analyzing" | "gathering" | "running" | "completed" | "failed" | "canceled" | "dead";
    prompt: string;
    callbackToken: string;
} | null>>;
export declare const getJobByRepository: import("convex/server").RegisteredQuery<"public", {
    repositoryId: import("convex/values").GenericId<"repositories">;
}, Promise<{
    _id: import("convex/values").GenericId<"jobs">;
    _creationTime: number;
    runAt?: number | undefined;
    attempts?: number | undefined;
    maxAttempts?: number | undefined;
    lockedBy?: string | undefined;
    leaseUntil?: number | undefined;
    dedupeKey?: string | undefined;
    lastError?: string | undefined;
    updatedAt?: number | undefined;
    completedAt?: number | undefined;
    progress?: string | undefined;
    currentStep?: number | undefined;
    totalSteps?: number | undefined;
    result?: string | {
        message?: string | undefined;
        data?: string | undefined;
        success: boolean;
    } | null | undefined;
    error?: string | undefined;
    docsCount?: number | undefined;
    cancelRequested?: boolean | undefined;
    runId?: string | undefined;
    regenerationStats?: {
        inserted: number;
        updated: number;
        skipped: number;
        rejected: number;
        deleted: number;
    } | undefined;
    createdAt: number;
    userId: import("convex/values").GenericId<"users">;
    repositoryId: import("convex/values").GenericId<"repositories">;
    status: "pending" | "claimed" | "cloning" | "analyzing" | "gathering" | "running" | "completed" | "failed" | "canceled" | "dead";
    prompt: string;
    callbackToken: string;
} | null>>;
export declare const updateStatus: import("convex/server").RegisteredMutation<"public", {
    progress?: string | undefined;
    currentStep?: number | undefined;
    totalSteps?: number | undefined;
    result?: string | {
        message?: string | undefined;
        data?: string | undefined;
        success: boolean;
    } | null | undefined;
    error?: string | undefined;
    status: "pending" | "claimed" | "cloning" | "analyzing" | "gathering" | "running" | "completed" | "failed" | "canceled" | "dead";
    callbackToken: string;
    jobId: import("convex/values").GenericId<"jobs">;
}, Promise<{
    success: boolean;
}>>;
export declare const clearStuckJobs: import("convex/server").RegisteredMutation<"public", {
    repositoryId: import("convex/values").GenericId<"repositories">;
}, Promise<{
    clearedJobsCount: number;
}>>;
export declare const clearAllStuckJobsForRepo: import("convex/server").RegisteredMutation<"public", {
    repositoryFullName: string;
}, Promise<{
    clearedJobsCount: number;
    repositoriesProcessed: number;
}>>;
export declare const cancelJob: import("convex/server").RegisteredMutation<"public", {
    userId: import("convex/values").GenericId<"users">;
    jobId: import("convex/values").GenericId<"jobs">;
}, Promise<{
    success: boolean;
    jobId: import("convex/values").GenericId<"jobs">;
}>>;
export declare const requestCancel: import("convex/server").RegisteredMutation<"public", {
    jobId: import("convex/values").GenericId<"jobs">;
}, Promise<{
    success: boolean;
}>>;
export declare const getLatestCompletedByRepository: import("convex/server").RegisteredQuery<"public", {
    repositoryId: import("convex/values").GenericId<"repositories">;
}, Promise<{
    _id: import("convex/values").GenericId<"jobs">;
    _creationTime: number;
    runAt?: number | undefined;
    attempts?: number | undefined;
    maxAttempts?: number | undefined;
    lockedBy?: string | undefined;
    leaseUntil?: number | undefined;
    dedupeKey?: string | undefined;
    lastError?: string | undefined;
    updatedAt?: number | undefined;
    completedAt?: number | undefined;
    progress?: string | undefined;
    currentStep?: number | undefined;
    totalSteps?: number | undefined;
    result?: string | {
        message?: string | undefined;
        data?: string | undefined;
        success: boolean;
    } | null | undefined;
    error?: string | undefined;
    docsCount?: number | undefined;
    cancelRequested?: boolean | undefined;
    runId?: string | undefined;
    regenerationStats?: {
        inserted: number;
        updated: number;
        skipped: number;
        rejected: number;
        deleted: number;
    } | undefined;
    createdAt: number;
    userId: import("convex/values").GenericId<"users">;
    repositoryId: import("convex/values").GenericId<"repositories">;
    status: "pending" | "claimed" | "cloning" | "analyzing" | "gathering" | "running" | "completed" | "failed" | "canceled" | "dead";
    prompt: string;
    callbackToken: string;
} | null>>;
export declare const startAnalysis: import("convex/server").RegisteredMutation<"public", {
    userId: import("convex/values").GenericId<"users">;
    repositoryId: import("convex/values").GenericId<"repositories">;
    repoUrl: string;
}, Promise<{
    jobId: import("convex/values").GenericId<"jobs">;
}>>;
export declare const getLogs: import("convex/server").RegisteredQuery<"public", {
    afterSeq?: number | undefined;
    jobId: import("convex/values").GenericId<"jobs">;
}, Promise<{
    _id: import("convex/values").GenericId<"jobLogs">;
    _creationTime: number;
    jobId: import("convex/values").GenericId<"jobs">;
    ts: number;
    seq: number;
    level: "error" | "info";
    msg: string;
}[]>>;
export declare const appendLog: import("convex/server").RegisteredMutation<"public", {
    jobId: import("convex/values").GenericId<"jobs">;
    level: "error" | "info";
    msg: string;
}, Promise<void>>;
export declare const setStatus: import("convex/server").RegisteredMutation<"public", {
    error?: string | undefined;
    status: "pending" | "claimed" | "cloning" | "analyzing" | "gathering" | "running" | "completed" | "failed" | "canceled" | "dead";
    jobId: import("convex/values").GenericId<"jobs">;
}, Promise<void>>;
export declare const runWorker: import("convex/server").RegisteredAction<"public", {
    jobId: import("convex/values").GenericId<"jobs">;
}, Promise<void>>;
//# sourceMappingURL=jobs.d.ts.map
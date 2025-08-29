import { z } from "zod";
export declare const JobStatus: z.ZodEnum<["pending", "claimed", "running", "cloning", "analyzing", "gathering", "completed", "failed", "canceled", "dead"]>;
export type JobStatus = z.infer<typeof JobStatus>;
export declare const JobSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    repositoryId: z.ZodString;
    repositoryUrl: z.ZodOptional<z.ZodString>;
    branch: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    prompt: z.ZodString;
    callbackToken: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<["pending", "claimed", "running", "cloning", "analyzing", "gathering", "completed", "failed", "canceled", "dead"]>;
    attempts: z.ZodDefault<z.ZodNumber>;
    maxAttempts: z.ZodDefault<z.ZodNumber>;
    lockedBy: z.ZodOptional<z.ZodString>;
    leaseUntil: z.ZodOptional<z.ZodNumber>;
    dedupeKey: z.ZodOptional<z.ZodString>;
    runAt: z.ZodOptional<z.ZodNumber>;
    createdAt: z.ZodOptional<z.ZodNumber>;
    updatedAt: z.ZodOptional<z.ZodNumber>;
    completedAt: z.ZodOptional<z.ZodNumber>;
    result: z.ZodOptional<z.ZodAny>;
    error: z.ZodOptional<z.ZodString>;
    lastError: z.ZodOptional<z.ZodString>;
    progress: z.ZodOptional<z.ZodString>;
    currentStep: z.ZodOptional<z.ZodNumber>;
    totalSteps: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "claimed" | "running" | "cloning" | "analyzing" | "gathering" | "completed" | "failed" | "canceled" | "dead";
    id: string;
    userId: string;
    repositoryId: string;
    prompt: string;
    attempts: number;
    maxAttempts: number;
    repositoryUrl?: string | undefined;
    branch?: string | undefined;
    callbackToken?: string | undefined;
    lockedBy?: string | undefined;
    leaseUntil?: number | undefined;
    dedupeKey?: string | undefined;
    runAt?: number | undefined;
    createdAt?: number | undefined;
    updatedAt?: number | undefined;
    completedAt?: number | undefined;
    result?: any;
    error?: string | undefined;
    lastError?: string | undefined;
    progress?: string | undefined;
    currentStep?: number | undefined;
    totalSteps?: number | undefined;
}, {
    status: "pending" | "claimed" | "running" | "cloning" | "analyzing" | "gathering" | "completed" | "failed" | "canceled" | "dead";
    id: string;
    userId: string;
    repositoryId: string;
    prompt: string;
    repositoryUrl?: string | undefined;
    branch?: string | undefined;
    callbackToken?: string | undefined;
    attempts?: number | undefined;
    maxAttempts?: number | undefined;
    lockedBy?: string | undefined;
    leaseUntil?: number | undefined;
    dedupeKey?: string | undefined;
    runAt?: number | undefined;
    createdAt?: number | undefined;
    updatedAt?: number | undefined;
    completedAt?: number | undefined;
    result?: any;
    error?: string | undefined;
    lastError?: string | undefined;
    progress?: string | undefined;
    currentStep?: number | undefined;
    totalSteps?: number | undefined;
}>;
export type Job = z.infer<typeof JobSchema>;
export declare const WorkerConfigSchema: z.ZodObject<{
    workerId: z.ZodString;
    convexUrl: z.ZodString;
    pollInterval: z.ZodDefault<z.ZodNumber>;
    leaseTime: z.ZodDefault<z.ZodNumber>;
    heartbeatInterval: z.ZodDefault<z.ZodNumber>;
    maxConcurrentJobs: z.ZodDefault<z.ZodNumber>;
    tempDir: z.ZodDefault<z.ZodString>;
    cliPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    workerId: string;
    convexUrl: string;
    pollInterval: number;
    leaseTime: number;
    heartbeatInterval: number;
    maxConcurrentJobs: number;
    tempDir: string;
    cliPath?: string | undefined;
}, {
    workerId: string;
    convexUrl: string;
    pollInterval?: number | undefined;
    leaseTime?: number | undefined;
    heartbeatInterval?: number | undefined;
    maxConcurrentJobs?: number | undefined;
    tempDir?: string | undefined;
    cliPath?: string | undefined;
}>;
export type WorkerConfig = z.infer<typeof WorkerConfigSchema>;
export declare const ProgressUpdateSchema: z.ZodObject<{
    jobId: z.ZodString;
    status: z.ZodEnum<["pending", "claimed", "running", "cloning", "analyzing", "gathering", "completed", "failed", "canceled", "dead"]>;
    progress: z.ZodOptional<z.ZodString>;
    currentStep: z.ZodOptional<z.ZodNumber>;
    totalSteps: z.ZodOptional<z.ZodNumber>;
    error: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "claimed" | "running" | "cloning" | "analyzing" | "gathering" | "completed" | "failed" | "canceled" | "dead";
    jobId: string;
    error?: string | undefined;
    progress?: string | undefined;
    currentStep?: number | undefined;
    totalSteps?: number | undefined;
}, {
    status: "pending" | "claimed" | "running" | "cloning" | "analyzing" | "gathering" | "completed" | "failed" | "canceled" | "dead";
    jobId: string;
    error?: string | undefined;
    progress?: string | undefined;
    currentStep?: number | undefined;
    totalSteps?: number | undefined;
}>;
export type ProgressUpdate = z.infer<typeof ProgressUpdateSchema>;
export declare const CLIResultSchema: z.ZodObject<{
    success: z.ZodBoolean;
    documents: z.ZodOptional<z.ZodArray<z.ZodObject<{
        slug: z.ZodString;
        title: z.ZodString;
        content: z.ZodString;
        kind: z.ZodEnum<["chapter", "tutorial", "toc", "yaml"]>;
        chapterIndex: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        slug: string;
        title: string;
        content: string;
        kind: "chapter" | "tutorial" | "toc" | "yaml";
        chapterIndex: number;
    }, {
        slug: string;
        title: string;
        content: string;
        kind: "chapter" | "tutorial" | "toc" | "yaml";
        chapterIndex: number;
    }>, "many">>;
    error: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    error?: string | undefined;
    documents?: {
        slug: string;
        title: string;
        content: string;
        kind: "chapter" | "tutorial" | "toc" | "yaml";
        chapterIndex: number;
    }[] | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    success: boolean;
    error?: string | undefined;
    documents?: {
        slug: string;
        title: string;
        content: string;
        kind: "chapter" | "tutorial" | "toc" | "yaml";
        chapterIndex: number;
    }[] | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export type CLIResult = z.infer<typeof CLIResultSchema>;
export declare const HealthCheckSchema: z.ZodObject<{
    status: z.ZodEnum<["healthy", "degraded", "unhealthy"]>;
    workerId: z.ZodString;
    uptime: z.ZodNumber;
    lastJobTime: z.ZodNumber;
    activeJobs: z.ZodNumber;
    maxConcurrentJobs: z.ZodNumber;
    memory: z.ZodObject<{
        rss: z.ZodNumber;
        heapTotal: z.ZodNumber;
        heapUsed: z.ZodNumber;
        external: z.ZodNumber;
        percentUsed: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        rss: number;
        heapTotal: number;
        heapUsed: number;
        external: number;
        percentUsed: number;
    }, {
        rss: number;
        heapTotal: number;
        heapUsed: number;
        external: number;
        percentUsed: number;
    }>;
    cpu: z.ZodObject<{
        loadAverage: z.ZodArray<z.ZodNumber, "many">;
        cores: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        loadAverage: number[];
        cores: number;
    }, {
        loadAverage: number[];
        cores: number;
    }>;
    system: z.ZodObject<{
        platform: z.ZodString;
        arch: z.ZodString;
        nodeVersion: z.ZodString;
        totalMemory: z.ZodNumber;
        freeMemory: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        platform: string;
        arch: string;
        nodeVersion: string;
        totalMemory: number;
        freeMemory: number;
    }, {
        platform: string;
        arch: string;
        nodeVersion: string;
        totalMemory: number;
        freeMemory: number;
    }>;
}, "strip", z.ZodTypeAny, {
    status: "healthy" | "degraded" | "unhealthy";
    workerId: string;
    maxConcurrentJobs: number;
    uptime: number;
    lastJobTime: number;
    activeJobs: number;
    memory: {
        rss: number;
        heapTotal: number;
        heapUsed: number;
        external: number;
        percentUsed: number;
    };
    cpu: {
        loadAverage: number[];
        cores: number;
    };
    system: {
        platform: string;
        arch: string;
        nodeVersion: string;
        totalMemory: number;
        freeMemory: number;
    };
}, {
    status: "healthy" | "degraded" | "unhealthy";
    workerId: string;
    maxConcurrentJobs: number;
    uptime: number;
    lastJobTime: number;
    activeJobs: number;
    memory: {
        rss: number;
        heapTotal: number;
        heapUsed: number;
        external: number;
        percentUsed: number;
    };
    cpu: {
        loadAverage: number[];
        cores: number;
    };
    system: {
        platform: string;
        arch: string;
        nodeVersion: string;
        totalMemory: number;
        freeMemory: number;
    };
}>;
export type HealthCheck = z.infer<typeof HealthCheckSchema>;

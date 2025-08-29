import { z } from "zod";
// Job status enum
export const JobStatus = z.enum([
    "pending",
    "claimed",
    "running",
    "cloning",
    "analyzing",
    "gathering",
    "completed",
    "failed",
    "canceled",
    "dead",
]);
// Job schema for queue operations
export const JobSchema = z.object({
    id: z.string(),
    userId: z.string(),
    repositoryId: z.string(),
    repositoryUrl: z.string().optional(), // Optional since we get it from repo
    branch: z.string().default("main").optional(),
    prompt: z.string(),
    callbackToken: z.string().optional(), // Added for auth
    status: JobStatus,
    attempts: z.number().default(0),
    maxAttempts: z.number().default(3),
    lockedBy: z.string().optional(),
    leaseUntil: z.number().optional(),
    dedupeKey: z.string().optional(),
    runAt: z.number().optional(),
    createdAt: z.number().optional(),
    updatedAt: z.number().optional(),
    completedAt: z.number().optional(),
    result: z.any().optional(),
    error: z.string().optional(),
    lastError: z.string().optional(),
    progress: z.string().optional(),
    currentStep: z.number().optional(),
    totalSteps: z.number().optional(),
});
// Worker configuration
export const WorkerConfigSchema = z.object({
    workerId: z.string(),
    convexUrl: z.string(),
    pollInterval: z.number().default(5000),
    leaseTime: z.number().default(300000), // 5 minutes
    heartbeatInterval: z.number().default(60000), // 1 minute
    maxConcurrentJobs: z.number().default(1),
    tempDir: z.string().default("/tmp/fondation"),
    cliPath: z.string().optional(),
});
// Progress update schema
export const ProgressUpdateSchema = z.object({
    jobId: z.string(),
    status: JobStatus,
    progress: z.string().optional(),
    currentStep: z.number().optional(),
    totalSteps: z.number().optional(),
    error: z.string().optional(),
});
// CLI result schema
export const CLIResultSchema = z.object({
    success: z.boolean(),
    documents: z.array(z.object({
        slug: z.string(),
        title: z.string(),
        content: z.string(),
        kind: z.enum(["chapter", "tutorial", "toc", "yaml"]),
        chapterIndex: z.number(),
    })).optional(),
    error: z.string().optional(),
    metadata: z.record(z.any()).optional(),
});
// Health check schema
export const HealthCheckSchema = z.object({
    status: z.enum(["healthy", "degraded", "unhealthy"]),
    workerId: z.string(),
    uptime: z.number(),
    lastJobTime: z.number(),
    activeJobs: z.number(),
    maxConcurrentJobs: z.number(),
    memory: z.object({
        rss: z.number(),
        heapTotal: z.number(),
        heapUsed: z.number(),
        external: z.number(),
        percentUsed: z.number(),
    }),
    cpu: z.object({
        loadAverage: z.array(z.number()),
        cores: z.number(),
    }),
    system: z.object({
        platform: z.string(),
        arch: z.string(),
        nodeVersion: z.string(),
        totalMemory: z.number(),
        freeMemory: z.number(),
    }),
});

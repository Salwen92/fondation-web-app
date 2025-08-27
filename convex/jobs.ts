import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { v4 as uuidv4 } from "uuid";
import { api } from "./_generated/api";

// Job status constants for queue management
const JOB_STATUS = {
  PENDING: "pending",
  CLAIMED: "claimed", 
  RUNNING: "running",
  CLONING: "cloning",
  ANALYZING: "analyzing",
  GATHERING: "gathering",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELED: "canceled",
  DEAD: "dead", // Max attempts exceeded
} as const;

// Claim a pending job atomically with lease
export const claimOne = mutation({
  args: {
    workerId: v.string(),
    leaseMs: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Find oldest pending job that's ready to run using index
    const pendingJob = await ctx.db
      .query("jobs")
      .withIndex("by_status_runAt", (q) => 
        q.eq("status", JOB_STATUS.PENDING)
      )
      .filter((q) =>
        q.or(
          q.eq(q.field("runAt"), undefined),
          q.lte(q.field("runAt"), now)
        )
      )
      .order("asc")
      .first();

    if (!pendingJob) {
      return null;
    }

    // Atomically claim the job with sanity check
    const job = await ctx.db.get(pendingJob._id);
    if (!job || job.status !== JOB_STATUS.PENDING) {
      return null; // Job was claimed by another worker
    }

    await ctx.db.patch(pendingJob._id, {
      status: JOB_STATUS.CLAIMED,
      lockedBy: args.workerId,
      leaseUntil: now + args.leaseMs,
      updatedAt: now,
    });

    return pendingJob;
  },
});

// Extend lease for a job (heartbeat)
export const heartbeat = mutation({
  args: {
    jobId: v.id("jobs"),
    workerId: v.string(),
    leaseMs: v.number(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    
    if (!job) {
      throw new Error("Job not found");
    }

    if (job.lockedBy !== args.workerId) {
      throw new Error("Job not locked by this worker");
    }

    const now = Date.now();
    
    await ctx.db.patch(args.jobId, {
      leaseUntil: now + args.leaseMs,
      updatedAt: now,
    });
  },
});

// Complete a job successfully
export const complete = mutation({
  args: {
    jobId: v.id("jobs"),
    result: v.any(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    await ctx.db.patch(args.jobId, {
      status: JOB_STATUS.COMPLETED,
      result: args.result,
      completedAt: now,
      updatedAt: now,
      lockedBy: undefined,
      leaseUntil: undefined,
    });
  },
});

// Handle job failure with retry logic
export const retryOrFail = mutation({
  args: {
    jobId: v.id("jobs"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    
    if (!job) {
      throw new Error("Job not found");
    }

    const now = Date.now();
    const attempts = (job.attempts || 0) + 1;
    const maxAttempts = job.maxAttempts || 3;

    if (attempts >= maxAttempts) {
      // Max attempts exceeded, mark as dead
      await ctx.db.patch(args.jobId, {
        status: JOB_STATUS.DEAD,
        error: args.error,
        lastError: args.error,
        attempts,
        updatedAt: now,
        completedAt: now,
        lockedBy: undefined,
        leaseUntil: undefined,
      });
    } else {
      // Calculate exponential backoff with jitter
      const baseDelay = 5000; // 5 seconds
      const backoffMultiplier = 2;
      const maxDelay = 600000; // 10 minutes
      const jitter = Math.random() * 5000; // 0-5 second jitter
      
      const exponentialDelay = Math.min(
        baseDelay * Math.pow(backoffMultiplier, attempts - 1),
        maxDelay
      );
      
      const nextRunAt = now + exponentialDelay + jitter;

      // Reset to pending with backoff
      await ctx.db.patch(args.jobId, {
        status: JOB_STATUS.PENDING,
        attempts,
        lastError: args.error,
        runAt: nextRunAt,
        updatedAt: now,
        lockedBy: undefined,
        leaseUntil: undefined,
      });
    }
  },
});

// Reclaim expired leases
export const reclaimExpired = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // Find jobs with expired leases using index
    const expiredJobs = await ctx.db
      .query("jobs")
      .withIndex("by_leaseUntil")
      .filter((q) =>
        q.and(
          q.lt(q.field("leaseUntil"), now),
          q.or(
            q.eq(q.field("status"), JOB_STATUS.CLAIMED),
            q.eq(q.field("status"), JOB_STATUS.RUNNING),
            q.eq(q.field("status"), JOB_STATUS.CLONING),
            q.eq(q.field("status"), JOB_STATUS.ANALYZING),
            q.eq(q.field("status"), JOB_STATUS.GATHERING)
          )
        )
      )
      .collect();

    // Reset expired jobs to pending
    for (const job of expiredJobs) {
      await ctx.db.patch(job._id, {
        status: JOB_STATUS.PENDING,
        lockedBy: undefined,
        leaseUntil: undefined,
        updatedAt: now,
        lastError: "Lease expired",
      });
    }

    return expiredJobs.length;
  },
});

// Get queue metrics (optimized with bounded queries)
export const getMetrics = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    const oneDayAgo = now - 86400000;

    // Get pending jobs count using index
    const pendingCount = await ctx.db
      .query("jobs")
      .withIndex("by_status_runAt", (q) => q.eq("status", JOB_STATUS.PENDING))
      .collect()
      .then(jobs => jobs.length);

    // Get running jobs count
    const runningCount = await ctx.db
      .query("jobs")
      .withIndex("by_status_runAt", (q) => q.eq("status", JOB_STATUS.RUNNING))
      .collect()
      .then(jobs => jobs.length);

    // Get recent completed jobs for metrics
    const recentCompleted = await ctx.db
      .query("jobs")
      .withIndex("by_status_runAt", (q) => q.eq("status", JOB_STATUS.COMPLETED))
      .filter((q) => q.gte(q.field("completedAt"), oneHourAgo))
      .collect();

    // Get recent failed jobs
    const recentFailed = await ctx.db
      .query("jobs")
      .withIndex("by_status_runAt", (q) => q.eq("status", JOB_STATUS.FAILED))
      .filter((q) => q.gte(q.field("updatedAt"), oneDayAgo))
      .collect();

    // Get dead jobs count
    const deadCount = await ctx.db
      .query("jobs")
      .withIndex("by_status_runAt", (q) => q.eq("status", JOB_STATUS.DEAD))
      .collect()
      .then(jobs => jobs.length);

    const averageDuration = recentCompleted.length > 0
      ? recentCompleted.reduce((sum, job) => 
          sum + ((job.completedAt || 0) - job.createdAt), 0
        ) / recentCompleted.length
      : 0;

    return {
      queueDepth: pendingCount,
      running: runningCount,
      completed: recentCompleted.length,
      failed: recentFailed.length,
      dead: deadCount,
      recentJobsCount: recentCompleted.length + recentFailed.length,
      averageDuration,
      timestamp: now,
    };
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    repositoryId: v.id("repositories"),
    prompt: v.string(),
    dedupeKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check for duplicate if dedupeKey provided
    if (args.dedupeKey) {
      const existing = await ctx.db
        .query("jobs")
        .withIndex("by_dedupeKey", (q) => q.eq("dedupeKey", args.dedupeKey))
        .filter((q) =>
          q.or(
            q.eq(q.field("status"), JOB_STATUS.PENDING),
            q.eq(q.field("status"), JOB_STATUS.CLAIMED),
            q.eq(q.field("status"), JOB_STATUS.RUNNING)
          )
        )
        .first();
      
      if (existing) {
        return existing._id;
      }
    }
    
    const callbackToken = uuidv4();

    // Get repository details
    const repository = await ctx.db.get(args.repositoryId);
    if (!repository) {
      throw new Error("Repository not found");
    }

    // Check for existing active jobs for this repository
    const activeJob = await ctx.db
      .query("jobs")
      .withIndex("by_repository", (q) => q.eq("repositoryId", args.repositoryId))
      .filter((q) => 
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "cloning"),
          q.eq(q.field("status"), "analyzing"),
          q.eq(q.field("status"), "gathering"),
          q.eq(q.field("status"), "running")
        )
      )
      .first();

    if (activeJob) {
      throw new Error("A job is already running for this repository. Please wait for it to complete or cancel it first.");
    }

    // Create the job
    const jobId = await ctx.db.insert("jobs", {
      userId: args.userId,
      repositoryId: args.repositoryId,
      status: "pending",
      prompt: args.prompt,
      callbackToken,
      createdAt: Date.now(),
      currentStep: 0,
      totalSteps: 7,
      progress: "Initializing...",
    });

    // Get user's GitHub token
    const user = await ctx.db.get(args.userId);
    const githubToken = user?.githubAccessToken;
    
    // Don't trigger Scaleway Gateway from here in development
    // The client will trigger it directly to avoid localhost restrictions
    console.log("Job created, client will trigger Scaleway Gateway service");

    return {
      jobId,
      callbackToken,
    };
  },
});

export const listUserJobs = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("jobs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const getJob = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});

export const getById = query({
  args: { id: v.id("jobs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getJobByRepository = query({
  args: { repositoryId: v.id("repositories") },
  handler: async (ctx, args) => {
    const job = await ctx.db
      .query("jobs")
      .withIndex("by_repository", (q) => q.eq("repositoryId", args.repositoryId))
      .order("desc")
      .first();
    return job;
  },
});

export const updateStatus = mutation({
  args: {
    jobId: v.id("jobs"),
    status: v.union(
      v.literal("pending"),
      v.literal("cloning"),
      v.literal("analyzing"),
      v.literal("gathering"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("canceled"),
    ),
    callbackToken: v.string(),
    progress: v.optional(v.string()),
    currentStep: v.optional(v.number()),
    totalSteps: v.optional(v.number()),
    result: v.optional(v.union(
      v.object({
        success: v.boolean(),
        message: v.optional(v.string()),
        data: v.optional(v.string()),
      }),
      v.string(),
      v.null()
    )),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);

    if (!job) {
      throw new Error("Job not found");
    }

    if (job.callbackToken !== args.callbackToken) {
      throw new Error("Invalid callback token");
    }

    await ctx.db.patch(args.jobId, {
      status: args.status,
      ...(args.progress && { progress: args.progress }),
      ...(args.currentStep !== undefined && { currentStep: args.currentStep }),
      ...(args.totalSteps !== undefined && { totalSteps: args.totalSteps }),
      ...(args.result && { result: args.result }),
      ...(args.error && { error: args.error }),
    });

    return { success: true };
  },
});

export const clearStuckJobs = mutation({
  args: {
    repositoryId: v.id("repositories"),
  },
  handler: async (ctx, args) => {
    // Find stuck jobs for this repository (pending status older than 5 minutes)
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    
    const stuckJobs = await ctx.db
      .query("jobs")
      .withIndex("by_repository", (q) => q.eq("repositoryId", args.repositoryId))
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "pending"),
          q.lt(q.field("createdAt"), fiveMinutesAgo)
        )
      )
      .collect();

    // Mark all stuck jobs as failed
    for (const job of stuckJobs) {
      await ctx.db.patch(job._id, {
        status: "failed",
        error: "Job cleared - was stuck in pending status",
        progress: "Job was stuck and has been cleared",
      });
    }

    return { clearedJobsCount: stuckJobs.length };
  },
});

export const clearAllStuckJobsForRepo = mutation({
  args: {
    repositoryFullName: v.string(),
  },
  handler: async (ctx, args) => {
    // Find all repositories with this fullName
    const repositories = await ctx.db
      .query("repositories")
      .filter((q) => q.eq(q.field("fullName"), args.repositoryFullName))
      .collect();

    let totalClearedJobs = 0;

    for (const repo of repositories) {
      // Find all pending jobs for this repository (regardless of age for direct clearing)
      const stuckJobs = await ctx.db
        .query("jobs")
        .withIndex("by_repository", (q) => q.eq("repositoryId", repo._id))
        .filter((q) => q.eq(q.field("status"), "pending"))
        .collect();

      // Mark all pending jobs as failed
      for (const job of stuckJobs) {
        await ctx.db.patch(job._id, {
          status: "failed",
          error: "Job cleared - was stuck in pending status (manual clear)",
          progress: "Job was manually cleared and reset",
        });
        totalClearedJobs++;
      }
    }

    return { 
      clearedJobsCount: totalClearedJobs,
      repositoriesProcessed: repositories.length 
    };
  },
});

export const cancelJob = mutation({
  args: {
    jobId: v.id("jobs"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);

    if (!job) {
      throw new Error("Job not found");
    }

    // Verify the user owns this job
    if (job.userId !== args.userId) {
      throw new Error("Unauthorized - you can only cancel your own jobs");
    }

    // Only allow canceling jobs that are currently running
    if (!["pending", "cloning", "analyzing", "gathering", "running"].includes(job.status)) {
      throw new Error("Cannot cancel job - it's not currently running");
    }

    // Update job status to failed with cancellation message
    await ctx.db.patch(args.jobId, {
      status: "failed",
      error: "Job cancelled by user",
      progress: "Job was cancelled by user request",
    });

    return { success: true, jobId: args.jobId };
  },
});

export const requestCancel = mutation({
  args: {
    jobId: v.id("jobs"),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      throw new Error("Job not found");
    }
    
    // Only allow cancelling active jobs
    if (!["pending", "running", "cloning", "analyzing", "gathering"].includes(job.status)) {
      throw new Error("Job is not active and cannot be cancelled");
    }
    
    // Set the cancelRequested flag
    await ctx.db.patch(args.jobId, {
      cancelRequested: true,
      status: "canceled",
      error: "Job cancelled by user",
      completedAt: Date.now()
    });
    
    return { success: true };
  }
});

export const getLatestCompletedByRepository = query({
  args: { repositoryId: v.id("repositories") },
  handler: async (ctx, args) => {
    const job = await ctx.db
      .query("jobs")
      .withIndex("by_repository", (q) => q.eq("repositoryId", args.repositoryId))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .order("desc")
      .first();
    return job;
  },
});


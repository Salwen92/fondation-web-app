import { v } from "convex/values";
import { mutation, query, action, internalAction } from "./_generated/server";
import { v4 as uuidv4 } from "uuid";
import { api } from "./_generated/api";
import { internal } from "./_generated/api";

export const create = mutation({
  args: {
    userId: v.id("users"),
    repositoryId: v.id("repositories"),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    // Start job creation
    const callbackToken = uuidv4();
    const now = Date.now();

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
          q.eq(q.field("status"), "claimed"),
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

    // Create the job with queue fields
    const jobId = await ctx.db.insert("jobs", {
      userId: args.userId,
      repositoryId: args.repositoryId,
      status: "pending",
      prompt: args.prompt,
      callbackToken,
      // Queue fields
      runAt: now,
      attempts: 0,
      maxAttempts: 5,
      dedupeKey: `${args.repositoryId}_${now}`,
      // Timestamps
      createdAt: now,
      updatedAt: now,
      // Progress
      currentStep: 0,
      totalSteps: 6,
      progress: "Initializing...",
    });
    // Job created successfully

    // Get user's GitHub token
    const user = await ctx.db.get(args.userId);
    const githubToken = user?.githubAccessToken;
    
    // Don't trigger worker service from here in development
    // The client will trigger it directly to avoid localhost restrictions
    // Client will trigger worker service in development

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
      v.literal("claimed"),
      v.literal("cloning"),
      v.literal("analyzing"),
      v.literal("gathering"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("canceled"),
      v.literal("dead"),
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

    const now = Date.now();

    await ctx.db.patch(args.jobId, {
      status: args.status,
      updatedAt: now,
      ...(args.progress && { progress: args.progress }),
      ...(args.currentStep !== undefined && { currentStep: args.currentStep }),
      ...(args.totalSteps !== undefined && { totalSteps: args.totalSteps }),
      ...(args.result && { result: args.result }),
      ...(args.error && { error: args.error, lastError: args.error }),
      ...(args.status === "completed" && { completedAt: now }),
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

    // Only allow canceling jobs that are currently running (includes 'claimed')
    if (!["pending", "claimed", "cloning", "analyzing", "gathering", "running"].includes(job.status)) {
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
    
    // Only allow cancelling active jobs (includes 'claimed')
    if (!["pending", "claimed", "running", "cloning", "analyzing", "gathering"].includes(job.status)) {
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

// Removed startAnalysis - use jobs.create instead for consistent worker polling

export const getLogs = query({
  args: { 
    jobId: v.id("jobs"), 
    afterSeq: v.optional(v.number()) 
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("jobLogs")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId))
      .collect();
    
    const filtered = logs.filter(l => (args.afterSeq ?? -1) < l.seq);
    return filtered.sort((a, b) => a.seq - b.seq);
  },
});

export const appendLog = mutation({
  args: { 
    jobId: v.id("jobs"), 
    level: v.union(v.literal("info"), v.literal("error")), 
    msg: v.string() 
  },
  handler: async (ctx, args) => {
    const seq = Date.now(); // simple monotonic
    await ctx.db.insert("jobLogs", { 
      jobId: args.jobId, 
      ts: Date.now(), 
      seq, 
      level: args.level, 
      msg: args.msg 
    });
  },
});

export const setStatus = mutation({
  args: { 
    jobId: v.id("jobs"), 
    status: v.union(
      v.literal("pending"),
      v.literal("claimed"),
      v.literal("cloning"),
      v.literal("analyzing"),
      v.literal("gathering"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("canceled"),
      v.literal("dead"),
    ), 
    error: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const patch: any = { status: args.status };
    if (args.status === "running") patch.updatedAt = Date.now();
    if (args.status === "completed" || args.status === "failed") {
      patch.completedAt = Date.now();
      patch.updatedAt = Date.now();
    }
    if (args.error) patch.error = args.error;
    
    await ctx.db.patch(args.jobId, patch);
  },
});

// Atomic regenerate mutation - cancels active jobs and creates new one
export const regenerate = mutation({
  args: {
    repositoryId: v.id("repositories"),
    userId: v.id("users"),
    prompt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Cancel any active jobs for this repository (atomic)
    const activeJob = await ctx.db
      .query("jobs")
      .withIndex("by_repository", (q) => q.eq("repositoryId", args.repositoryId))
      .filter((q) => 
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "claimed"),
          q.eq(q.field("status"), "cloning"),
          q.eq(q.field("status"), "analyzing"),
          q.eq(q.field("status"), "gathering"),
          q.eq(q.field("status"), "running")
        )
      )
      .first();

    if (activeJob) {
      await ctx.db.patch(activeJob._id, {
        status: "canceled",
        error: "Job cancelled for regeneration",
        updatedAt: Date.now(),
      });
    }

    // 2. Create new job immediately (atomic) - same logic as repositories.triggerAnalyze
    const callbackToken = uuidv4();
    const now = Date.now();
    
    const jobId = await ctx.db.insert("jobs", {
      userId: args.userId,
      repositoryId: args.repositoryId,
      status: "pending",
      prompt: args.prompt || "Regenerate course documentation",
      callbackToken,
      // Queue fields - same as triggerAnalyze
      runAt: now,
      attempts: 0,
      maxAttempts: 5,
      dedupeKey: `${args.repositoryId}_regen_${now}`,
      // Timestamps
      createdAt: now,
      updatedAt: now,
      // Progress tracking
      currentStep: 0,
      totalSteps: 6,
      progress: "Initializing regeneration...",
    });

    return { jobId };
  },
});

// Removed runWorker - all jobs must go through worker polling for consistent architecture


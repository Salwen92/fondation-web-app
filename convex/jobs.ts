import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { v4 as uuidv4 } from "uuid";
import { api } from "./_generated/api";

export const create = mutation({
  args: {
    userId: v.id("users"),
    repositoryId: v.id("repositories"),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
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
    
    // Don't trigger Cloud Run from here in development
    // The client will trigger it directly to avoid localhost restrictions
    console.log("Job created, client will trigger Cloud Run service");

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
    result: v.optional(v.any()),
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


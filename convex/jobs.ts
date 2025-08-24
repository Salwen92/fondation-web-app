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

    // Create the job
    const jobId = await ctx.db.insert("jobs", {
      userId: args.userId,
      repositoryId: args.repositoryId,
      status: "pending",
      prompt: args.prompt,
      callbackToken,
      createdAt: Date.now(),
    });

    // Get user's GitHub token
    const user = await ctx.db.get(args.userId);
    const githubToken = user?.githubAccessToken;
    
    // Trigger Cloud Run service if URL is configured
    const cloudRunUrl = process.env.CLOUD_RUN_URL;
    if (cloudRunUrl) {
      // Trigger Cloud Run service
      await ctx.scheduler.runAfter(0, api.cloudRun.triggerDocGeneration, {
        jobId,
        repositoryUrl: `https://github.com/${repository.fullName}`,
        branch: repository.defaultBranch,
        prompt: args.prompt,
        callbackToken,
        githubToken,
      });
    } else {
      console.log("Cloud Run URL not configured, job created but not triggered");
    }

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
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    callbackToken: v.string(),
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
    });

    return { success: true };
  },
});


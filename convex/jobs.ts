import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { v4 as uuidv4 } from "uuid";

export const create = mutation({
  args: {
    userId: v.id("users"),
    repositoryId: v.id("repositories"),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const callbackToken = uuidv4();
    
    const jobId = await ctx.db.insert("jobs", {
      userId: args.userId,
      repositoryId: args.repositoryId,
      status: "pending",
      prompt: args.prompt,
      callbackToken,
      createdAt: Date.now(),
    });

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

export const updateStatus = mutation({
  args: {
    jobId: v.id("jobs"),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
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
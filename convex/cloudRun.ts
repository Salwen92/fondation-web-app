import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// Internal mutation to update job status
export const updateJobStatus = internalMutation({
  args: {
    jobId: v.id("jobs"),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: args.status,
    });
  },
});

// Action to trigger Cloud Run service
export const triggerDocGeneration = action({
  args: {
    jobId: v.id("jobs"),
    repositoryUrl: v.string(),
    branch: v.string(),
    prompt: v.string(),
    callbackToken: v.string(),
    githubToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cloudRunUrl = process.env.CLOUD_RUN_URL;
    const cloudRunToken = process.env.CLOUD_RUN_TOKEN;

    if (!cloudRunUrl) {
      console.error("CLOUD_RUN_URL not configured");
      await ctx.runMutation(internal.cloudRun.updateJobStatus, {
        jobId: args.jobId,
        status: "failed",
      });
      return { success: false, error: "Service not configured" };
    }

    try {
      // Get the callback URL for this deployment
      const convexUrl = process.env.CONVEX_URL || "https://your-deployment.convex.cloud";
      const callbackUrl = `${convexUrl}/api/webhook/job-callback`;

      // Trigger Cloud Run service
      const response = await fetch(`${cloudRunUrl}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cloudRunToken && { Authorization: `Bearer ${cloudRunToken}` }),
        },
        body: JSON.stringify({
          jobId: args.jobId,
          repositoryUrl: args.repositoryUrl,
          branch: args.branch,
          prompt: args.prompt,
          callbackUrl,
          callbackToken: args.callbackToken,
          githubToken: args.githubToken,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Cloud Run trigger failed: ${response.status} - ${error}`);
      }

      const result = await response.json() as Record<string, unknown>;
      
      // Update job status to running
      await ctx.runMutation(internal.cloudRun.updateJobStatus, {
        jobId: args.jobId,
        status: "running",
      });

      return { success: true, cloudRunResponse: result };
    } catch (error) {
      console.error("Failed to trigger Cloud Run:", error);
      
      await ctx.runMutation(internal.cloudRun.updateJobStatus, {
        jobId: args.jobId,
        status: "failed",
      });

      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  },
});
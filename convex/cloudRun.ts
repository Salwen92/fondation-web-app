import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// Internal mutation to update job status
export const updateJobStatus = internalMutation({
  args: {
    jobId: v.id("jobs"),
    status: v.union(
      v.literal("pending"),
      v.literal("cloning"),
      v.literal("analyzing"),
      v.literal("gathering"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
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
    const updateData: Record<string, unknown> = {
      status: args.status,
    };
    
    if (args.progress) updateData.progress = args.progress;
    if (args.currentStep !== undefined) updateData.currentStep = args.currentStep;
    if (args.totalSteps !== undefined) updateData.totalSteps = args.totalSteps;
    if (args.result) updateData.result = args.result;
    if (args.error) updateData.error = args.error;
    
    await ctx.db.patch(args.jobId, updateData);
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
      // Note: Cannot use external logger in Convex actions
      await ctx.runMutation(internal.cloudRun.updateJobStatus, {
        jobId: args.jobId,
        status: "failed",
        error: "CLOUD_RUN_URL not configured",
      });
      return { success: false, error: "Service not configured" };
    }

    try {
      // For local development, use the Next.js webhook endpoint
      const callbackUrl = process.env.NODE_ENV === "production"
        ? `${process.env.CONVEX_URL}/api/webhook/job-callback`
        : "http://localhost:3000/api/webhook/job-callback";

      // Use proxy for localhost URLs  
      const targetUrl = cloudRunUrl.includes("localhost") 
        ? "http://localhost:3000/api/analyze-proxy"
        : `${cloudRunUrl}/analyze`;

      // Triggering Cloud Run service

      // Trigger Cloud Run service
      const response = await fetch(targetUrl, {
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
      // Failed to trigger Cloud Run service
      
      await ctx.runMutation(internal.cloudRun.updateJobStatus, {
        jobId: args.jobId,
        status: "failed",
        error: error instanceof Error ? error.message : "Failed to trigger Cloud Run",
      });

      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  },
});
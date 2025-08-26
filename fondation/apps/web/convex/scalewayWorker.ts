/**
 * Scaleway Worker Integration
 * 
 * This module handles triggering Scaleway workers (via the API Gateway)
 * for long-running Fondation CLI analyze jobs.
 * 
 * In development: Calls localhost:8081 (Scaleway Gateway)
 * In production: Will call the deployed Scaleway Container URL
 */

import { v } from "convex/values";
import { mutation } from "./_generated/server";

// Get the worker URL based on environment
const getWorkerUrl = (): string => {
  // In production, this would be the Scaleway Container URL
  // For now, we use localhost for development
  const baseUrl = process.env.SCALEWAY_GATEWAY_URL ?? "http://localhost:8081";
  return `${baseUrl}/analyze`;
};

export const triggerScalewayAnalyze = mutation({
  args: {
    repositoryId: v.id("repositories"),
  },
  handler: async (ctx, args) => {
    // Get repository details
    const repository = await ctx.db.get(args.repositoryId);
    if (!repository) {
      throw new Error("Repository not found");
    }

    // Get the user who owns this repository
    const user = await ctx.db.get(repository.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Generate a callback token
    const callbackToken = Math.random().toString(36).substr(2, 9) + Math.random().toString(36).substr(2, 9);

    // Create a new job for the analysis
    const newJobId = await ctx.db.insert("jobs", {
      userId: repository.userId,
      repositoryId: args.repositoryId,
      status: "pending",
      prompt: "Regenerate course documentation",
      callbackToken,
      createdAt: Date.now(),
      currentStep: 0,
      totalSteps: 7,
      progress: "Initializing analysis...",
    });

    // Prepare the request to Scaleway Gateway
    const workerUrl = getWorkerUrl();
    const callbackUrl = process.env.CONVEX_SITE_URL 
      ? `${process.env.CONVEX_SITE_URL}/api/webhook/job-callback`
      : "http://localhost:3000/api/webhook/job-callback";

    try {
      // Trigger the Scaleway worker via the API Gateway
      const response = await fetch(workerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobId: newJobId,
          repositoryUrl: `https://github.com/${repository.fullName}`,
          branch: repository.defaultBranch ?? "main",
          callbackUrl,
          callbackToken,
          // Note: GitHub token should be handled securely
          // For now, we don't include it
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to trigger Scaleway worker:", errorText);
        
        // Update job status to failed
        await ctx.db.patch(newJobId, {
          status: "failed",
          error: `Failed to start worker: ${errorText}`,
        });
        
        throw new Error(`Failed to trigger Scaleway worker: ${errorText}`);
      }

      const result = await response.json() as {
        status: string;
        jobId: string;
        message: string;
        mode: string;
        pid?: number;
        scwJobId?: string;
      };

      console.log("Scaleway worker triggered successfully:", result);

      // Update job with worker information
      await ctx.db.patch(newJobId, {
        progress: "Worker started, analysis in progress...",
      });

      return {
        jobId: newJobId,
        callbackToken,
        workerMode: result.mode,
        repository: {
          fullName: repository.fullName,
          defaultBranch: repository.defaultBranch ?? "main"
        }
      };
    } catch (error) {
      console.error("Error triggering Scaleway worker:", error);
      
      // Update job status to failed
      await ctx.db.patch(newJobId, {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      
      throw error;
    }
  },
});
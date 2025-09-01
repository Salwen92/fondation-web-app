import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  query,
  mutation,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { Octokit } from "@octokit/rest";

export const fetchGitHubRepositories = action({
  args: {
    accessToken: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const octokit = new Octokit({
      auth: args.accessToken,
    });

    try {
      const { data: repos, headers } = await octokit.rest.repos.listForAuthenticatedUser(
        {
          per_page: 100,
          sort: "updated",
        },
      );

      // Check rate limit
      const rateLimit = headers['x-ratelimit-remaining'];
      const rateLimitReset = headers['x-ratelimit-reset'];
      
      if (rateLimit && parseInt(rateLimit) < 10) {
        const resetTime = rateLimitReset ? new Date(parseInt(rateLimitReset) * 1000).toLocaleString() : 'unknown';
        console.warn(`GitHub API rate limit low: ${rateLimit} requests remaining. Resets at: ${resetTime}`);
      }

      const repositories = await Promise.all(
        repos.map(async (repo) => {
          const existingRepo = await ctx.runQuery(
            internal.repositories.getByGithubId,
            {
              githubRepoId: repo.id.toString(),
              userId: args.userId,
            },
          );

          if (!existingRepo) {
            await ctx.runMutation(internal.repositories.create, {
              userId: args.userId,
              githubRepoId: repo.id.toString(),
              name: repo.name,
              fullName: repo.full_name,
              description: repo.description ?? undefined,
              defaultBranch: repo.default_branch ?? "main",
            });
          } else {
            // Update existing repository in case details changed
            await ctx.runMutation(internal.repositories.update, {
              id: existingRepo._id,
              name: repo.name,
              fullName: repo.full_name,
              description: repo.description ?? undefined,
              defaultBranch: repo.default_branch ?? "main",
            });
          }

          return {
            githubRepoId: repo.id.toString(),
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description,
            defaultBranch: repo.default_branch ?? "main",
          };
        }),
      );

      return repositories;
    } catch (error) {
      console.error("Error fetching repositories:", error);
      
      // Handle specific GitHub API errors
      if (error instanceof Error) {
        if (error.message.includes('rate limit')) {
          throw new Error('GitHub API rate limit exceeded. Please try again later.');
        }
        if (error.message.includes('401') || error.message.includes('unauthorized')) {
          throw new Error('GitHub authentication failed. Please sign in again.');
        }
        if (error.message.includes('403')) {
          throw new Error('Access forbidden. Please check your GitHub permissions.');
        }
      }
      
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      throw new Error(`Failed to fetch GitHub repositories: ${errorMessage}`);
    }
  },
});

export const getByGithubId = internalQuery({
  args: {
    githubRepoId: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("repositories")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("githubRepoId"), args.githubRepoId))
      .first();
  },
});

export const create = internalMutation({
  args: {
    userId: v.id("users"),
    githubRepoId: v.string(),
    name: v.string(),
    fullName: v.string(),
    description: v.optional(v.string()),
    defaultBranch: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("repositories", args);
  },
});

export const update = internalMutation({
  args: {
    id: v.id("repositories"),
    name: v.string(),
    fullName: v.string(),
    description: v.optional(v.string()),
    defaultBranch: v.string(),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    return await ctx.db.patch(id, updates);
  },
});


export const listUserRepositories = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("repositories")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const getByFullName = query({
  args: { 
    fullName: v.string()
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("repositories")
      .filter((q) => q.eq(q.field("fullName"), args.fullName))
      .collect();
  },
});

export const getByRepositoryId = query({
  args: {
    repositoryId: v.id("repositories"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.repositoryId);
  },
});

export const triggerAnalyze = mutation({
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

    // Generate a callback token using Math.random (crypto is not available in Convex)
    const callbackToken = Math.random().toString(36).substr(2, 9) + Math.random().toString(36).substr(2, 9);

    const now = Date.now();
    
    // Create a new job for regeneration with queue fields
    const newJobId = await ctx.db.insert("jobs", {
      userId: repository.userId,
      repositoryId: args.repositoryId,
      status: "pending",
      prompt: "Regenerate course documentation",
      callbackToken,
      // Queue fields
      runAt: now,
      attempts: 0,
      maxAttempts: 5,
      dedupeKey: `${args.repositoryId}_regen_${now}`,
      // Timestamps
      createdAt: now,
      updatedAt: now,
      // Progress
      currentStep: 0,
      totalSteps: 6,
      progress: "Initializing regeneration...",
    });

    // Note: The client will trigger the worker service directly
    // to avoid localhost restrictions in development
    console.log("Regeneration job created, client will trigger worker service");

    return {
      jobId: newJobId,
      callbackToken,
      repository: {
        fullName: repository.fullName,
        defaultBranch: repository.defaultBranch || "main"
      }
    };
  },
});

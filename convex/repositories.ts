import { v } from "convex/values";
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { Octokit } from "@octokit/rest";

export const fetchGitHubRepositories = action({
  args: { 
    accessToken: v.string(),
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    const octokit = new Octokit({
      auth: args.accessToken,
    });

    try {
      const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
        per_page: 100,
        sort: "updated",
      });

      const repositories = await Promise.all(
        repos.map(async (repo) => {
          const existingRepo = await ctx.runQuery(internal.repositories.getByGithubId, {
            githubRepoId: repo.id.toString(),
            userId: args.userId,
          });

          if (!existingRepo) {
            await ctx.runMutation(internal.repositories.create, {
              userId: args.userId,
              githubRepoId: repo.id.toString(),
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
        })
      );

      return repositories;
    } catch (error) {
      console.error("Error fetching repositories:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      throw new Error(`Failed to fetch GitHub repositories: ${errorMessage}`);
    }
  },
});

export const getByGithubId = internalQuery({
  args: { 
    githubRepoId: v.string(),
    userId: v.id("users")
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

export const listUserRepositories = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("repositories")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});
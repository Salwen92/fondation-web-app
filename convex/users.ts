import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createOrUpdateUser = mutation({
  args: {
    githubId: v.string(),
    username: v.string(),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_github_id", (q) => q.eq("githubId", args.githubId))
      .first();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        username: args.username,
        email: args.email,
        avatarUrl: args.avatarUrl,
      });
      return existingUser._id;
    } else {
      const userId = await ctx.db.insert("users", {
        githubId: args.githubId,
        username: args.username,
        email: args.email,
        avatarUrl: args.avatarUrl,
        createdAt: Date.now(),
      });
      return userId;
    }
  },
});

export const getUserByGithubId = query({
  args: { githubId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_github_id", (q) => q.eq("githubId", args.githubId))
      .first();
  },
});

export const getCurrentUser = query({
  args: { githubId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { githubId } = args;
    if (!githubId) {
      return null;
    }

    return await ctx.db
      .query("users")
      .withIndex("by_github_id", (q) => q.eq("githubId", githubId))
      .first();
  },
});

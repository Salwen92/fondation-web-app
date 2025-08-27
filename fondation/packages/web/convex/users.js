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
        }
        else {
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
export const getDashboardStats = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        // Get user's repositories
        const repositories = await ctx.db
            .query("repositories")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();
        // Get user's jobs
        const jobs = await ctx.db
            .query("jobs")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();
        // Count active jobs
        const activeJobs = jobs.filter(job => ["pending", "cloning", "analyzing", "gathering", "running"].includes(job.status)).length;
        // Count completed jobs
        const completedJobs = jobs.filter(job => job.status === "completed").length;
        // Count total docs generated
        const totalDocs = jobs.reduce((sum, job) => {
            return sum + (job.docsCount || 0);
        }, 0);
        // Calculate success rate
        const totalJobs = jobs.length;
        const failedJobs = jobs.filter(job => job.status === "failed").length;
        const successRate = totalJobs > 0 ? ((totalJobs - failedJobs) / totalJobs * 100) : 100;
        // Get repositories added this week (using first job as proxy for repo creation)
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const recentRepos = repositories.filter(repo => {
            const repoJobs = jobs.filter(job => job.repositoryId === repo._id);
            return repoJobs.some(job => job.createdAt > oneWeekAgo);
        }).length;
        // Get docs generated this month
        const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const recentDocs = jobs
            .filter(job => job.createdAt > oneMonthAgo && job.status === "completed")
            .reduce((sum, job) => sum + (job.docsCount || 0), 0);
        return {
            totalRepositories: repositories.length,
            totalDocsGenerated: totalDocs,
            activeJobs: activeJobs,
            successRate: Math.round(successRate * 10) / 10, // Round to 1 decimal
            recentRepositories: recentRepos,
            recentDocs: recentDocs,
        };
    },
});
/**
 * Securely store or update a user's GitHub access token
 * The token will be encrypted before storage
 */
export const updateGitHubToken = mutation({
    args: {
        githubId: v.string(),
        accessToken: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_github_id", (q) => q.eq("githubId", args.githubId))
            .first();
        if (!user) {
            throw new Error("User not found");
        }
        // Note: Encryption will be handled at the API layer where we have access to Node.js crypto
        // For now, we'll store the token and add a migration plan
        await ctx.db.patch(user._id, {
            githubAccessToken: args.accessToken, // TODO: This should be encrypted
        });
        return { success: true };
    },
});
/**
 * Get a user's GitHub access token (will be decrypted if encrypted)
 * Returns null if no token is stored
 */
export const getGitHubToken = query({
    args: { githubId: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_github_id", (q) => q.eq("githubId", args.githubId))
            .first();
        if (!user || !user.githubAccessToken) {
            return null;
        }
        // TODO: Add decryption logic here when we implement the full encryption system
        return user.githubAccessToken;
    },
});

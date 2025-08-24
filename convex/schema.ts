import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    githubId: v.string(),
    username: v.string(),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    githubAccessToken: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_github_id", ["githubId"]),

  repositories: defineTable({
    userId: v.id("users"),
    githubRepoId: v.string(),
    name: v.string(),
    fullName: v.string(),
    description: v.optional(v.string()),
    defaultBranch: v.string(),
  }).index("by_user", ["userId"]),

  jobs: defineTable({
    userId: v.id("users"),
    repositoryId: v.id("repositories"),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    prompt: v.string(),
    callbackToken: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_repository", ["repositoryId"]),
});

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
      v.literal("cloning"),
      v.literal("analyzing"),
      v.literal("gathering"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("canceled"),
    ),
    prompt: v.string(),
    callbackToken: v.string(),
    createdAt: v.number(),
    progress: v.optional(v.string()),
    currentStep: v.optional(v.number()),
    totalSteps: v.optional(v.number()),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
    docsCount: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    cancelRequested: v.optional(v.boolean()),
  })
    .index("by_user", ["userId"])
    .index("by_repository", ["repositoryId"]),

  docs: defineTable({
    jobId: v.id("jobs"),
    repositoryId: v.id("repositories"),
    slug: v.string(),
    title: v.string(),
    chapterIndex: v.number(),
    kind: v.union(
      v.literal("chapter"),
      v.literal("tutorial"),
      v.literal("toc"),
      v.literal("yaml")
    ),
    content: v.string(),
    createdAt: v.number(),
  })
    .index("by_job", ["jobId"])
    .index("by_repository", ["repositoryId"]),
});

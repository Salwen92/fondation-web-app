import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  users: defineTable({
    githubId: v.string(),
    username: v.string(),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    githubAccessToken: v.optional(v.string()),
    createdAt: v.number(),
  }).index('by_github_id', ['githubId']),

  repositories: defineTable({
    userId: v.id('users'),
    githubRepoId: v.string(),
    name: v.string(),
    fullName: v.string(),
    description: v.optional(v.string()),
    defaultBranch: v.string(),
    lastFetched: v.optional(v.number()),
    lastAnalyzedAt: v.optional(v.number()),
    languages: v.optional(
      v.object({
        primary: v.string(),
        all: v.array(
          v.object({
            name: v.string(),
            percentage: v.number(),
            bytes: v.number(),
          }),
        ),
      }),
    ),
    stats: v.optional(
      v.object({
        stars: v.number(),
        forks: v.number(),
        issues: v.number(),
      }),
    ),
  }).index('by_user', ['userId']),

  jobs: defineTable({
    // Core fields
    userId: v.id('users'),
    repositoryId: v.id('repositories'),
    status: v.union(
      v.literal('pending'),
      v.literal('claimed'),
      v.literal('cloning'),
      v.literal('analyzing'),
      v.literal('gathering'),
      v.literal('running'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('canceled'),
      v.literal('dead'),
    ),
    prompt: v.string(),
    callbackToken: v.string(),

    // Queue management fields
    runAt: v.optional(v.number()), // When job should run (for scheduling/backoff)
    attempts: v.optional(v.number()), // Number of attempts made
    maxAttempts: v.optional(v.number()), // Max attempts before marking dead (default: 5)
    lockedBy: v.optional(v.string()), // Worker ID that has claimed the job
    leaseUntil: v.optional(v.number()), // Lease expiration timestamp
    dedupeKey: v.optional(v.string()), // For preventing duplicate jobs
    lastError: v.optional(v.string()), // Last error message for debugging

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),

    // Progress tracking
    progress: v.optional(v.string()),
    currentStep: v.optional(v.number()),
    totalSteps: v.optional(v.number()),

    // Results
    result: v.optional(
      v.union(
        v.object({
          success: v.boolean(),
          message: v.optional(v.string()),
          data: v.optional(v.string()),
        }),
        v.string(),
        v.null(),
      ),
    ),
    error: v.optional(v.string()),
    docsCount: v.optional(v.number()),
    cancelRequested: v.optional(v.boolean()),
    runId: v.optional(v.string()),
    regenerationStats: v.optional(
      v.object({
        inserted: v.number(),
        updated: v.number(),
        skipped: v.number(),
        rejected: v.number(),
        deleted: v.number(),
      }),
    ),
  })
    .index('by_user', ['userId'])
    .index('by_repository', ['repositoryId'])
    .index('by_status_runAt', ['status', 'runAt'])
    .index('by_leaseUntil', ['leaseUntil'])
    .index('by_dedupeKey', ['dedupeKey']),

  docs: defineTable({
    jobId: v.id('jobs'),
    repositoryId: v.id('repositories'),
    slug: v.string(),
    title: v.string(),
    chapterIndex: v.number(),
    kind: v.union(v.literal('chapter'), v.literal('tutorial'), v.literal('toc'), v.literal('yaml')),
    content: v.string(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    sourceKey: v.optional(v.string()),
    runId: v.optional(v.string()),
    normalizedAt: v.optional(v.number()),
  })
    .index('by_job', ['jobId'])
    .index('by_repository', ['repositoryId'])
    .index('by_source_key', ['sourceKey']),

  jobLogs: defineTable({
    jobId: v.id('jobs'),
    ts: v.number(), // Date.now()
    seq: v.number(), // monotonic sequence
    level: v.union(v.literal('info'), v.literal('error')),
    msg: v.string(),
  })
    .index('by_job', ['jobId'])
    .index('by_job_seq', ['jobId', 'seq']),
});

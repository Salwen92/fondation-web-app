import { v } from 'convex/values';
import { internalMutation, mutation, query } from './_generated/server';

// Default configuration
const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_LEASE_TIME = 5 * 60 * 1000; // 5 minutes
const BACKOFF_BASE = 5000; // 5 seconds
const BACKOFF_MAX = 10 * 60 * 1000; // 10 minutes
const BACKOFF_JITTER = 5000; // 0-5 seconds

/**
 * Claim one job atomically for processing
 * Uses compare-and-swap pattern to prevent race conditions
 */
export const claimOne = mutation({
  args: {
    workerId: v.string(),
    leaseMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const leaseTime = args.leaseMs ?? DEFAULT_LEASE_TIME;
    const now = Date.now();

    // Looking for pending jobs ready to run

    // Find oldest pending job that's ready to run
    const job = await ctx.db
      .query('jobs')
      .withIndex('by_status_runAt', (q) => q.eq('status', 'pending').lte('runAt', now))
      .first();

    if (!job) {
      // No pending jobs found
      return null;
    }

    // Found potential job to claim

    // Atomic claim with compare-and-swap
    // Re-fetch to ensure it's still pending
    const currentJob = await ctx.db.get(job._id);
    if (!currentJob || currentJob.status !== 'pending') {
      // Job was already claimed by another worker
      return null;
    }

    // Claim the job
    // Claim the job
    await ctx.db.patch(job._id, {
      status: 'claimed',
      lockedBy: args.workerId,
      leaseUntil: now + leaseTime,
      updatedAt: now,
    });

    // [Queue] Job claimed by worker - would log to monitoring in production
    return {
      id: job._id,
      repositoryId: job.repositoryId,
      userId: job.userId,
      prompt: job.prompt,
      callbackToken: job.callbackToken,
      attempts: job.attempts,
    };
  },
});

/**
 * Update job status and extend lease (heartbeat)
 */
export const heartbeat = mutation({
  args: {
    jobId: v.id('jobs'),
    workerId: v.string(),
    status: v.optional(
      v.union(
        v.literal('cloning'),
        v.literal('analyzing'),
        v.literal('gathering'),
        v.literal('running'),
      ),
    ),
    progress: v.optional(v.string()),
    currentStep: v.optional(v.number()),
    totalSteps: v.optional(v.number()),
    leaseMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);

    if (!job || job.lockedBy !== args.workerId) {
      throw new Error('Job not found or not owned by worker');
    }

    const now = Date.now();
    const leaseTime = args.leaseMs ?? DEFAULT_LEASE_TIME;

    await ctx.db.patch(args.jobId, {
      ...(args.status && { status: args.status }),
      ...(args.progress && { progress: args.progress }),
      ...(args.currentStep !== undefined && { currentStep: args.currentStep }),
      ...(args.totalSteps !== undefined && { totalSteps: args.totalSteps }),
      leaseUntil: now + leaseTime,
      updatedAt: now,
    });

    return { success: true };
  },
});

/**
 * Mark job as completed
 */
export const complete = mutation({
  args: {
    jobId: v.id('jobs'),
    workerId: v.string(),
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
    docsCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);

    if (!job || job.lockedBy !== args.workerId) {
      throw new Error('Job not found or not owned by worker');
    }

    const now = Date.now();

    await ctx.db.patch(args.jobId, {
      status: 'completed',
      result: args.result,
      docsCount: args.docsCount,
      completedAt: now,
      updatedAt: now,
      lockedBy: undefined,
      leaseUntil: undefined,
    });

    return { success: true };
  },
});

/**
 * Handle job failure with retry logic
 */
export const retryOrFail = mutation({
  args: {
    jobId: v.id('jobs'),
    workerId: v.string(),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);

    if (!job || job.lockedBy !== args.workerId) {
      throw new Error('Job not found or not owned by worker');
    }

    const now = Date.now();
    const attempts = (job.attempts ?? 0) + 1;
    const maxAttempts = job.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

    if (attempts >= maxAttempts) {
      // Mark as dead - exceeded max attempts
      await ctx.db.patch(args.jobId, {
        status: 'dead',
        error: args.error,
        lastError: args.error,
        completedAt: now,
        updatedAt: now,
        lockedBy: undefined,
        leaseUntil: undefined,
      });
      return { status: 'dead', attempts };
    }

    // Calculate exponential backoff with jitter
    const baseDelay = Math.min(BACKOFF_BASE * 2 ** (attempts - 1), BACKOFF_MAX);
    const jitter = Math.random() * BACKOFF_JITTER;
    const nextRunAt = now + baseDelay + jitter;

    // Return to pending with backoff
    await ctx.db.patch(args.jobId, {
      status: 'pending',
      attempts,
      runAt: nextRunAt,
      lastError: args.error,
      updatedAt: now,
      lockedBy: undefined,
      leaseUntil: undefined,
    });

    return {
      status: 'retrying',
      attempts,
      nextRunAt: new Date(nextRunAt).toISOString(),
    };
  },
});

/**
 * Reclaim expired leases (for failed workers)
 */
export const reclaimExpired = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find jobs with expired leases
    const expiredJobs = await ctx.db
      .query('jobs')
      .withIndex('by_leaseUntil', (q) => q.lte('leaseUntil', now))
      .collect();

    let reclaimed = 0;

    for (const job of expiredJobs) {
      // Only reclaim if still in processing state
      if (['claimed', 'cloning', 'analyzing', 'gathering', 'running'].includes(job.status)) {
        await ctx.db.patch(job._id, {
          status: 'pending',
          attempts: (job.attempts ?? 0) + 1,
          runAt: now,
          lastError: 'Lease expired - worker likely crashed',
          updatedAt: now,
          lockedBy: undefined,
          leaseUntil: undefined,
        });
        reclaimed++;
      }
    }

    return { reclaimed, checked: expiredJobs.length };
  },
});

/**
 * Create a job with deduplication support
 */
export const createJob = mutation({
  args: {
    userId: v.id('users'),
    repositoryId: v.id('repositories'),
    prompt: v.string(),
    callbackToken: v.string(),
    dedupeKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    // Creating new job

    // Check for duplicate if dedupeKey provided
    if (args.dedupeKey) {
      const existing = await ctx.db
        .query('jobs')
        .withIndex('by_dedupeKey', (q) => q.eq('dedupeKey', args.dedupeKey))
        .filter((q) =>
          q.or(
            q.eq(q.field('status'), 'pending'),
            q.eq(q.field('status'), 'claimed'),
            q.eq(q.field('status'), 'cloning'),
            q.eq(q.field('status'), 'analyzing'),
            q.eq(q.field('status'), 'gathering'),
            q.eq(q.field('status'), 'running'),
          ),
        )
        .first();

      if (existing) {
        return {
          jobId: existing._id,
          duplicate: true,
          status: existing.status,
        };
      }
    }

    // Create new job
    // Insert the job
    const jobId = await ctx.db.insert('jobs', {
      userId: args.userId,
      repositoryId: args.repositoryId,
      prompt: args.prompt,
      callbackToken: args.callbackToken,
      dedupeKey: args.dedupeKey,
      status: 'pending',
      runAt: now,
      attempts: 0,
      createdAt: now,
      updatedAt: now,
      currentStep: 0,
      totalSteps: 6,
      progress: 'Initializing...',
    });

    // [Queue] Job created - would log to monitoring in production

    return {
      jobId,
      duplicate: false,
      status: 'pending',
    };
  },
});

/**
 * Get queue metrics
 */
export const getMetrics = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    // Get counts by status (limited query)
    const pending = await ctx.db
      .query('jobs')
      .withIndex('by_status_runAt', (q) => q.eq('status', 'pending'))
      .take(100);

    const processing = await ctx.db
      .query('jobs')
      .withIndex('by_status_runAt', (q) => q.eq('status', 'claimed'))
      .take(100);

    const completed = await ctx.db
      .query('jobs')
      .withIndex('by_status_runAt', (q) => q.eq('status', 'completed'))
      .take(100);

    const failed = await ctx.db
      .query('jobs')
      .withIndex('by_status_runAt', (q) => q.eq('status', 'failed'))
      .take(100);

    const dead = await ctx.db
      .query('jobs')
      .withIndex('by_status_runAt', (q) => q.eq('status', 'dead'))
      .take(100);

    // Get recent activity (last hour)
    const recentJobs = await ctx.db
      .query('jobs')
      .filter((q) => q.gte(q.field('updatedAt'), oneHourAgo))
      .take(100);

    return {
      counts: {
        pending: pending.length,
        processing: processing.length,
        completed: completed.length,
        failed: failed.length,
        dead: dead.length,
      },
      recentActivity: {
        total: recentJobs.length,
        completed: recentJobs.filter((j) => j.status === 'completed').length,
        failed: recentJobs.filter((j) => j.status === 'failed' || j.status === 'dead').length,
      },
      timestamp: now,
    };
  },
});

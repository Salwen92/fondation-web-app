import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const upsertFromJob = mutation({
  args: {
    jobId: v.id("jobs"),
    repositoryId: v.id("repositories"),
    files: v.array(v.object({
      slug: v.string(),
      title: v.string(),
      chapterIndex: v.optional(v.number()),
      content: v.string(),
      kind: v.union(v.literal("chapter"), v.literal("tutorial"), v.literal("toc"), v.literal("yaml"))
    })),
    summary: v.object({
      chaptersCount: v.number(),
      tutorialsCount: v.number(),
      generatedAt: v.number()
    })
  },
  handler: async (ctx, args) => {
    // First, delete any existing docs for this job to avoid duplicates
    const existingDocs = await ctx.db
      .query("docs")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId))
      .collect();
    
    for (const doc of existingDocs) {
      await ctx.db.delete(doc._id);
    }

    // Insert new docs
    const docIds = [];
    for (const file of args.files) {
      const docId = await ctx.db.insert("docs", {
        jobId: args.jobId,
        repositoryId: args.repositoryId,
        slug: file.slug,
        title: file.title,
        chapterIndex: file.chapterIndex || 0,
        kind: file.kind,
        content: file.content,
        createdAt: Date.now()
      });
      docIds.push(docId);
    }

    // Update job with docs count
    await ctx.db.patch(args.jobId, {
      docsCount: args.files.length,
      completedAt: args.summary.generatedAt
    });

    return { docsCount: args.files.length, docIds };
  }
});

export const listByJobId = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("docs")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId))
      .order("asc")
      .collect();
  }
});

export const getBySlug = query({
  args: { 
    jobId: v.id("jobs"),
    slug: v.string() 
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("docs")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId))
      .filter((q) => q.eq(q.field("slug"), args.slug))
      .first();
  }
});

export const listByRepository = query({
  args: { repositoryId: v.id("repositories") },
  handler: async (ctx, args) => {
    // Get the latest completed job for this repository
    const latestJob = await ctx.db
      .query("jobs")
      .withIndex("by_repository", (q) => q.eq("repositoryId", args.repositoryId))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .order("desc")
      .first();

    if (!latestJob) {
      return [];
    }

    return await ctx.db
      .query("docs")
      .withIndex("by_job", (q) => q.eq("jobId", latestJob._id))
      .order("asc")
      .collect();
  }
});
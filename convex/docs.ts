import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Helper function to normalize markdown content
function normalizeMarkdown(content: string): string {
  if (!content) return content;
  
  // Normalize line endings to \n
  let normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Auto-close dangling code fences
  const backtickMatches = (normalized.match(/```/g) || []).length;
  if (backtickMatches % 2 !== 0) {
    // Odd number of code fences means one is unclosed
    normalized += '\n```\n';
  }
  
  // Ensure final newline at EOF
  if (!normalized.endsWith('\n')) {
    normalized += '\n';
  }
  
  // Ensure blank line before headings (optional tidy)
  normalized = normalized.replace(/\n(#{1,6}\s)/g, '\n\n$1');
  
  // Remove excessive blank lines (more than 2)
  normalized = normalized.replace(/\n{3,}/g, '\n\n');
  
  return normalized;
}

// Helper to derive stable source key from file metadata
function deriveSourceKey(repositoryId: string, slug: string, title: string): string {
  // Create deterministic key from repo + normalized slug + title
  const normalizedSlug = slug.replace(/^(chapters|reviewed-chapters)\//, '');
  return `${repositoryId}:${normalizedSlug}:${title}`;
}

export const upsertFromJob = mutation({
  args: {
    jobId: v.id("jobs"),
    repositoryId: v.id("repositories"),
    runId: v.optional(v.string()), // Track regeneration run
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
    const stats = {
      inserted: 0,
      updated: 0,
      skipped: 0,
      rejected: 0,
      deleted: 0
    };

    // First, get all existing docs for this job
    const existingDocs = await ctx.db
      .query("docs")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId))
      .collect();
    
    // Build map of existing docs by source key
    const existingByKey = new Map();
    const toDelete = new Set(existingDocs.map(d => d._id));
    
    for (const doc of existingDocs) {
      const key = deriveSourceKey(args.repositoryId, doc.slug, doc.title);
      existingByKey.set(key, doc);
    }

    // Process new files with deduplication
    const processedKeys = new Set<string>();
    const docIds = [];
    
    for (const file of args.files) {
      // V7 Guard: Reject empty content for chapters/tutorials
      if ((file.kind === 'chapter' || file.kind === 'tutorial') && 
          (!file.content || file.content.trim().length === 0)) {
        console.warn('[V7] Rejecting empty content:', {
          slug: file.slug,
          title: file.title,
          kind: file.kind
        });
        stats.rejected++;
        continue;
      }

      // Derive stable source key
      const sourceKey = deriveSourceKey(args.repositoryId, file.slug, file.title);
      
      // Skip if we've already processed this key in this batch
      if (processedKeys.has(sourceKey)) {
        console.warn('[V7] Duplicate in batch:', sourceKey);
        stats.skipped++;
        continue;
      }
      processedKeys.add(sourceKey);

      // Normalize markdown content before storing
      const normalizedContent = file.kind === 'yaml' ? file.content : normalizeMarkdown(file.content);
      
      const existing = existingByKey.get(sourceKey);
      
      if (existing) {
        // Update existing if content changed
        toDelete.delete(existing._id);
        
        if (existing.content !== normalizedContent || 
            existing.chapterIndex !== (file.chapterIndex || 0)) {
          await ctx.db.patch(existing._id, {
            content: normalizedContent,
            chapterIndex: file.chapterIndex || 0,
            slug: file.slug, // Update slug in case prefix changed
            updatedAt: Date.now(),
            runId: args.runId
          });
          stats.updated++;
        } else {
          stats.skipped++;
        }
        docIds.push(existing._id);
      } else {
        // Insert new doc
        const docId = await ctx.db.insert("docs", {
          jobId: args.jobId,
          repositoryId: args.repositoryId,
          slug: file.slug,
          title: file.title,
          chapterIndex: file.chapterIndex || 0,
          kind: file.kind,
          content: normalizedContent,
          sourceKey,
          runId: args.runId,
          createdAt: Date.now()
        });
        docIds.push(docId);
        stats.inserted++;
      }
    }

    // Delete orphaned docs not in current batch
    for (const docId of toDelete) {
      await ctx.db.delete(docId);
      stats.deleted++;
    }

    // Update job with docs count
    await ctx.db.patch(args.jobId, {
      docsCount: docIds.length,
      completedAt: args.summary.generatedAt,
      runId: args.runId,
      regenerationStats: stats
    });

    console.log('[V7] Regeneration complete:', stats);
    return { docsCount: docIds.length, docIds, stats };
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

// One-time migration to normalize existing markdown content
export const normalizeExistingDocs = mutation({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("docs")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId))
      .collect();
    
    let normalizedCount = 0;
    
    for (const doc of docs) {
      if (doc.kind !== 'yaml' && doc.content) {
        const normalized = normalizeMarkdown(doc.content);
        if (normalized !== doc.content) {
          await ctx.db.patch(doc._id, {
            content: normalized,
            normalizedAt: Date.now()
          });
          normalizedCount++;
        }
      }
    }
    
    return { 
      totalDocs: docs.length, 
      normalizedCount,
      message: `Normalized ${normalizedCount} out of ${docs.length} documents`
    };
  }
});

// V7 Data cleanup: Remove duplicate documents
export const cleanupDuplicates = mutation({
  args: { 
    jobId: v.id("jobs"),
    dryRun: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("docs")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId))
      .collect();
    
    // Group by title to find duplicates
    const docsByTitle = new Map<string, typeof docs>();
    
    for (const doc of docs) {
      const existing = docsByTitle.get(doc.title) || [];
      existing.push(doc);
      docsByTitle.set(doc.title, existing);
    }
    
    const stats = {
      total: docs.length,
      duplicateGroups: 0,
      deleted: 0,
      kept: 0,
      emptyDeleted: 0
    };
    
    const toDelete: string[] = [];
    
    for (const [title, duplicates] of docsByTitle) {
      if (duplicates.length > 1) {
        stats.duplicateGroups++;
        
        // Sort by preference: non-empty > reviewed- > recent
        duplicates.sort((a, b) => {
          // Prefer non-empty content
          const aEmpty = !a.content || a.content.trim().length === 0;
          const bEmpty = !b.content || b.content.trim().length === 0;
          if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;
          
          // Prefer reviewed- prefix
          const aReviewed = a.slug.includes('reviewed-');
          const bReviewed = b.slug.includes('reviewed-');
          if (aReviewed !== bReviewed) return bReviewed ? 1 : -1;
          
          // Prefer more recent
          return (b.createdAt || 0) - (a.createdAt || 0);
        });
        
        // Keep the first (best) one
        const keep = duplicates[0];
        stats.kept++;
        
        // Mark others for deletion
        for (let i = 1; i < duplicates.length; i++) {
          const doc = duplicates[i];
          toDelete.push(doc._id);
          if (!doc.content || doc.content.trim().length === 0) {
            stats.emptyDeleted++;
          }
        }
        
        console.log('[V7 Cleanup] Duplicate group:', {
          title,
          kept: { id: keep._id, slug: keep.slug, size: keep.content?.length || 0 },
          deleted: duplicates.slice(1).map(d => ({
            id: d._id,
            slug: d.slug,
            size: d.content?.length || 0
          }))
        });
      } else {
        stats.kept++;
      }
    }
    
    if (!args.dryRun && toDelete.length > 0) {
      for (const docId of toDelete) {
        await ctx.db.delete(docId as any);
        stats.deleted++;
      }
    }
    
    return {
      ...stats,
      dryRun: args.dryRun || false,
      message: args.dryRun 
        ? `[DRY RUN] Would delete ${toDelete.length} duplicates`
        : `Deleted ${stats.deleted} duplicate documents`
    };
  }
});

// Export all docs for backup
export const exportAll = query({
  args: { jobId: v.optional(v.id("jobs")) },
  handler: async (ctx, args) => {
    if (args.jobId !== undefined) {
      const jobId = args.jobId;
      return await ctx.db
        .query("docs")
        .withIndex("by_job", (q) => q.eq("jobId", jobId))
        .collect();
    } else {
      // Export all docs
      return await ctx.db.query("docs").collect();
    }
  }
});
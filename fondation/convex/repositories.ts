import { Octokit } from '@octokit/rest';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import { action, internalMutation, internalQuery, mutation, query } from './_generated/server';

// Helper function to fetch and transform GitHub language data
async function fetchRepositoryLanguages(
  octokit: Octokit,
  owner: string,
  repo: string,
): Promise<{ primary: string; all: Array<{ name: string; percentage: number; bytes: number }> } | undefined> {
  try {
    const { data: languagesData } = await octokit.rest.repos.listLanguages({
      owner,
      repo,
    });

    // GitHub API returns { "TypeScript": 12345, "JavaScript": 6789, ... }
    const languageEntries = Object.entries(languagesData);
    
    if (languageEntries.length === 0) {
      return undefined;
    }

    const totalBytes = languageEntries.reduce((sum, [, bytes]) => sum + bytes, 0);

    const allLanguages = languageEntries
      .map(([name, bytes]) => ({
        name,
        bytes,
        percentage: Math.round((bytes / totalBytes) * 100 * 100) / 100, // Round to 2 decimal places
      }))
      .sort((a, b) => b.bytes - a.bytes); // Sort by bytes descending

    const primaryLanguage = allLanguages[0]?.name || 'Unknown';

    return {
      primary: primaryLanguage,
      all: allLanguages,
    };
  } catch (error) {
    // Language fetch failed, but don't fail the entire repository sync
    // Log the error for debugging but continue with repository sync
    console.error(`[CONVEX] Failed to fetch languages for ${owner}/${repo}:`, {
      error: error instanceof Error ? error.message : String(error),
      status: error instanceof Error && 'status' in error ? (error as any).status : undefined,
    });
    return undefined;
  }
}

export const fetchGitHubRepositories = action({
  args: {
    accessToken: v.string(),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const octokit = new Octokit({
      auth: args.accessToken,
    });

    try {
      const { data: repos, headers } = await octokit.rest.repos.listForAuthenticatedUser({
        per_page: 100,
        sort: 'updated',
      });

      // Check rate limit
      const rateLimit = headers['x-ratelimit-remaining'];

      if (rateLimit && Number.parseInt(rateLimit, 10) < 10) {
        // GitHub API rate limit low - would log to monitoring service in production
        // Rate limit: ${rateLimit} requests remaining
        // Reset time available in x-ratelimit-reset header
      }

      const repositories = await Promise.all(
        repos.map(async (repo) => {
          const existingRepo = await ctx.runQuery(internal.repositories.getByGithubId, {
            githubRepoId: repo.id.toString(),
            userId: args.userId,
          });

          // Fetch language data from GitHub API - with detailed error handling
          let languageData: Awaited<ReturnType<typeof fetchRepositoryLanguages>> = undefined;
          try {
            const [owner, repoName] = repo.full_name.split('/');
            if (owner && repoName) {
              console.info(`[CONVEX] Fetching languages for ${repo.full_name}...`);
              languageData = await fetchRepositoryLanguages(octokit, owner, repoName);
              
              if (languageData) {
                console.info(`[CONVEX] Successfully fetched languages for ${repo.full_name}:`, {
                  primary: languageData.primary,
                  count: languageData.all.length,
                });
              } else {
                console.info(`[CONVEX] No languages found for ${repo.full_name}`);
              }
            } else {
              console.warn(`[CONVEX] Invalid repository name format: ${repo.full_name}`);
            }
          } catch (error) {
            // Language fetch failed for this specific repo - continue without language data
            console.error(`[CONVEX] Failed to fetch languages for ${repo.full_name}:`, {
              error: error instanceof Error ? error.message : String(error),
              status: error instanceof Error && 'status' in error ? (error as any).status : undefined,
            });
            languageData = undefined;
          }

          if (!existingRepo) {
            console.info(`[CONVEX] Creating new repository: ${repo.full_name}`, {
              hasLanguages: !!languageData,
              languagesCount: languageData?.all.length || 0,
            });
            await ctx.runMutation(internal.repositories.create, {
              userId: args.userId,
              githubRepoId: repo.id.toString(),
              name: repo.name,
              fullName: repo.full_name,
              description: repo.description ?? undefined,
              defaultBranch: repo.default_branch ?? 'main',
              languages: languageData,
            });
          } else {
            // Update existing repository in case details changed
            console.info(`[CONVEX] Updating existing repository: ${repo.full_name}`, {
              hasLanguages: !!languageData,
              languagesCount: languageData?.all.length || 0,
            });
            await ctx.runMutation(internal.repositories.update, {
              id: existingRepo._id,
              name: repo.name,
              fullName: repo.full_name,
              description: repo.description ?? undefined,
              defaultBranch: repo.default_branch ?? 'main',
              languages: languageData,
            });
          }

          return {
            githubRepoId: repo.id.toString(),
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description,
            defaultBranch: repo.default_branch ?? 'main',
          };
        }),
      );

      return repositories;
    } catch (error) {
      // Enhanced error handling with detailed logging
      console.error('[CONVEX] GitHub API Error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });

      // Handle specific GitHub API errors
      if (error instanceof Error) {
        if (error.message.includes('rate limit')) {
          throw new Error('GitHub API rate limit exceeded. Please try again later.');
        }
        if (error.message.includes('401') || error.message.includes('unauthorized') || error.message.includes('Bad credentials')) {
          throw new Error('GitHub authentication failed. Please sign in again.');
        }
        if (error.message.includes('403')) {
          throw new Error('Access forbidden. Please check your GitHub permissions.');
        }
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to fetch GitHub repositories: ${errorMessage}`);
    }
  },
});

export const getByGithubId = internalQuery({
  args: {
    githubRepoId: v.string(),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('repositories')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .filter((q) => q.eq(q.field('githubRepoId'), args.githubRepoId))
      .first();
  },
});

export const create = internalMutation({
  args: {
    userId: v.id('users'),
    githubRepoId: v.string(),
    name: v.string(),
    fullName: v.string(),
    description: v.optional(v.string()),
    defaultBranch: v.string(),
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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('repositories', args);
  },
});

export const update = internalMutation({
  args: {
    id: v.id('repositories'),
    name: v.string(),
    fullName: v.string(),
    description: v.optional(v.string()),
    defaultBranch: v.string(),
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
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    return await ctx.db.patch(id, updates);
  },
});

export const listUserRepositories = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('repositories')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();
  },
});

export const getByFullName = query({
  args: {
    fullName: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('repositories')
      .filter((q) => q.eq(q.field('fullName'), args.fullName))
      .collect();
  },
});

export const getByRepositoryId = query({
  args: {
    repositoryId: v.id('repositories'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.repositoryId);
  },
});

export const triggerAnalyze = mutation({
  args: {
    repositoryId: v.id('repositories'),
  },
  handler: async (ctx, args) => {
    // Get repository details
    const repository = await ctx.db.get(args.repositoryId);
    if (!repository) {
      throw new Error('Repository not found');
    }

    // Get the user who owns this repository
    const user = await ctx.db.get(repository.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate a callback token using Math.random (crypto is not available in Convex)
    const callbackToken =
      Math.random().toString(36).substr(2, 9) + Math.random().toString(36).substr(2, 9);

    const now = Date.now();

    // Create a new job for regeneration with queue fields
    const newJobId = await ctx.db.insert('jobs', {
      userId: repository.userId,
      repositoryId: args.repositoryId,
      status: 'pending',
      prompt: 'Regenerate course documentation',
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
      progress: 'Initializing regeneration...',
    });

    // Note: The client will trigger the worker service directly
    // to avoid localhost restrictions in development
    // Regeneration job created, client will trigger worker service

    return {
      jobId: newJobId,
      callbackToken,
      repository: {
        fullName: repository.fullName,
        defaultBranch: repository.defaultBranch || 'main',
      },
    };
  },
});

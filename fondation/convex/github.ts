import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

// Fetch and update repository metadata from GitHub
export const updateRepositoryMetadata = mutation({
  args: {
    repositoryId: v.id('repositories'),
    lastAnalyzedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const repository = await ctx.db.get(args.repositoryId);
    if (!repository) {
      throw new Error('Repository not found');
    }

    // If only updating lastAnalyzedAt (no metadata fetch), do that quickly
    if (args.lastAnalyzedAt !== undefined) {
      await ctx.db.patch(args.repositoryId, {
        lastAnalyzedAt: args.lastAnalyzedAt,
      });
      return { success: true };
    }

    const user = await ctx.db.get(repository.userId);
    if (!user?.githubAccessToken) {
      console.error('No GitHub access token available');
      return null;
    }

    try {
      // Note: In production, this should use the GitHubClient with rate limiting
      // For now, keeping the direct fetch but adding basic rate limit handling
      const languagesResponse = await fetch(
        `https://api.github.com/repos/${repository.fullName}/languages`,
        {
          headers: {
            Authorization: `Bearer ${user.githubAccessToken}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'Fondation-App/1.0',
          },
        },
      );

      // Check for rate limiting
      if (languagesResponse.status === 429) {
        const resetTime = languagesResponse.headers.get('X-RateLimit-Reset');
        console.error(`GitHub rate limit exceeded. Reset at: ${resetTime}`);
        return { success: false, error: 'Rate limit exceeded' };
      }

      if (!languagesResponse.ok) {
        throw new Error(`GitHub API error: ${languagesResponse.status}`);
      }

      const languagesData = (await languagesResponse.json()) as Record<string, number>;

      // Calculate total bytes and percentages
      const totalBytes = Object.values(languagesData).reduce((sum, bytes) => sum + bytes, 0);
      const languages = Object.entries(languagesData)
        .map(([name, bytes]) => ({
          name,
          bytes,
          percentage: totalBytes > 0 ? Math.round((bytes / totalBytes) * 100) : 0,
        }))
        .sort((a, b) => b.percentage - a.percentage);

      // Fetch repository stats
      const repoResponse = await fetch(`https://api.github.com/repos/${repository.fullName}`, {
        headers: {
          Authorization: `Bearer ${user.githubAccessToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Fondation-App/1.0',
        },
      });

      // Check for rate limiting
      if (repoResponse.status === 429) {
        const resetTime = repoResponse.headers.get('X-RateLimit-Reset');
        console.error(`GitHub rate limit exceeded. Reset at: ${resetTime}`);
        return { success: false, error: 'Rate limit exceeded' };
      }

      if (!repoResponse.ok) {
        throw new Error(`GitHub API error: ${repoResponse.status}`);
      }

      const repoData = (await repoResponse.json()) as {
        stargazers_count: number;
        forks_count: number;
        open_issues_count: number;
      };

      // Update repository with fetched data
      const updateData: any = {
        languages: {
          primary: languages[0]?.name ?? 'Unknown',
          all: languages,
        },
        stats: {
          stars: repoData.stargazers_count,
          forks: repoData.forks_count,
          issues: repoData.open_issues_count,
        },
        lastFetched: Date.now(),
      };

      // Add lastAnalyzedAt if provided
      if (args.lastAnalyzedAt !== undefined) {
        updateData.lastAnalyzedAt = args.lastAnalyzedAt;
      }

      await ctx.db.patch(args.repositoryId, updateData);

      return { success: true };
    } catch (error) {
      console.error('Failed to fetch GitHub metadata:', error);
      // Don't throw - gracefully degrade
      return null;
    }
  },
});

// Get repository with fresh metadata (fetches if stale)
export const getRepositoryWithMetadata = query({
  args: {
    repositoryId: v.id('repositories'),
  },
  handler: async (ctx, args) => {
    const repository = await ctx.db.get(args.repositoryId);
    if (!repository) return null;

    // Check if data is stale (older than 1 hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const isStale = !repository.lastFetched || repository.lastFetched < oneHourAgo;

    return {
      ...repository,
      isStale,
    };
  },
});

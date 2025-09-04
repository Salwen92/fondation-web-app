import { api } from '@convex/generated/api';
import { ConvexHttpClient } from 'convex/browser';
import { type NextRequest, NextResponse } from 'next/server';
import { clearStuckJobsSchema } from '@/lib/api-validation';
import { logger } from '@/lib/logger';
import { withValidation } from '@/lib/middleware/validation';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface ClearJobsRequest {
  repositoryFullName: string;
}

export const POST = withValidation(
  clearStuckJobsSchema,
  async (_req: NextRequest, body: ClearJobsRequest) => {
    try {
      const { repositoryFullName } = body;

      logger.info(`[Clear Stuck Jobs] Clearing jobs for repository: ${repositoryFullName}`);

      // Clear stuck jobs for all repositories with this fullName (simpler approach)
      const result = await convex.mutation(api.jobs.clearAllStuckJobsForRepo, {
        repositoryFullName,
      });

      logger.info(
        `[Clear Stuck Jobs] Cleared ${result.clearedJobsCount} stuck jobs from ${result.repositoriesProcessed} repositories`,
      );

      return NextResponse.json({
        success: true,
        clearedJobsCount: result.clearedJobsCount,
        repositoriesProcessed: result.repositoriesProcessed,
      });
    } catch (error) {
      logger.error(
        '[Clear Stuck Jobs] Error',
        error instanceof Error ? error : new Error(String(error)),
      );
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 },
      );
    }
  },
);

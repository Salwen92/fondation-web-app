import { api } from '@convex/generated/api';
import { ConvexHttpClient } from 'convex/browser';
import { type NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> },
) {
  const { owner, repo } = await params;

  try {
    // Find the repository
    const fullName = `${owner}/${repo}`;
    const repositories = await convexClient.query(api.repositories.getByFullName, {
      fullName,
    });

    if (!repositories || repositories.length === 0) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }

    // Get the latest completed job for this repository
    const repositoryId = repositories[0]?._id;
    if (!repositoryId) {
      return NextResponse.json({ error: 'Repository ID not found' }, { status: 404 });
    }

    const latestJob = await convexClient.query(api.jobs.getLatestCompletedByRepository, {
      repositoryId,
    });

    if (!latestJob) {
      return NextResponse.json(
        { error: 'No completed course found for this repository' },
        { status: 404 },
      );
    }

    // Redirect to the specific job's course page
    return NextResponse.redirect(
      new URL(`/course/${owner}/${repo}/${latestJob._id}`, request.url),
      302,
    );
  } catch (error) {
    logger.error(
      'Error finding latest course',
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json({ error: 'Failed to find latest course' }, { status: 500 });
  }
}

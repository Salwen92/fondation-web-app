import { api } from '@convex/generated/api';
import type { Id } from '@convex/generated/dataModel';
import { ConvexHttpClient } from 'convex/browser';
import { type NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const convexUrl =
  process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL ?? 'http://localhost:3210';
const client = new ConvexHttpClient(convexUrl);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Get job details
    const job = await client.query(api.jobs.getById, {
      id: id as Id<'jobs'>,
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: job._id,
      status: job.status,
      cancelRequested: job.cancelRequested ?? false,
      currentStep: job.currentStep,
      totalSteps: job.totalSteps,
      progress: job.progress,
    });
  } catch (error) {
    logger.error(
      'Error getting job status',
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json({ error: 'Failed to get job status' }, { status: 500 });
  }
}

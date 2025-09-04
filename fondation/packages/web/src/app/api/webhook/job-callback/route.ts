import { api } from '@convex/generated/api';
import type { Id } from '@convex/generated/dataModel';
import { ConvexHttpClient } from 'convex/browser';
import { type NextRequest, NextResponse } from 'next/server';
import { jobCallbackSchema } from '@/lib/api-validation';
import { logger } from '@/lib/logger';
import { withValidation } from '@/lib/middleware/validation';

interface CallbackBody {
  jobId?: string;
  type?: string;
  status?: string;
  timestamp?: string;
  progress?: string;
  step?: number;
  totalSteps?: number;
  error?: string;
  files?: Array<{
    path?: string;
    type?: string;
    content?: string;
  }>;
}

const convexUrl =
  process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL ?? 'http://localhost:3210';
const client = new ConvexHttpClient(convexUrl);

export const POST = withValidation(
  jobCallbackSchema,
  async (req: NextRequest, body: CallbackBody) => {
    try {
      const callbackToken = req.headers.get('X-Job-Token');

      logger.logJob('Webhook received', body.jobId ?? 'unknown', {
        type: body.type ?? 'unknown',
        status: body.status ?? 'unknown',
        timestamp: body.timestamp ?? 'unknown',
        callbackToken: callbackToken ? '***PRESENT***' : 'MISSING',
      });

      // Map the callback data to the updateStatus mutation format
      const { jobId, type, status, progress, step, totalSteps, error, files } = body;

      if (!jobId) {
        logger.error('Job callback webhook missing jobId');
        return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
      }

      if (!callbackToken) {
        logger.error('Job callback webhook missing callbackToken');
        return NextResponse.json({ error: 'Missing callbackToken' }, { status: 400 });
      }

      // Determine status based on callback type
      let convexStatus = status ?? 'running';
      if (type === 'progress' && !status) {
        if (progress?.includes('Cloning')) {
          convexStatus = 'cloning';
        } else if (progress?.includes('analysis') || progress?.includes('AI')) {
          convexStatus = 'analyzing';
        } else if (progress?.includes('Gathering')) {
          convexStatus = 'gathering';
        } else {
          convexStatus = 'running';
        }
      } else if (type === 'complete') {
        convexStatus = 'completed';
      } else if (type === 'error') {
        convexStatus = 'failed';
      }

      // Handle completion with docs persistence
      if (type === 'complete' && files && Array.isArray(files)) {
        logger.info(`Processing ${files.length} files for job completion`, { jobId });

        // Get job to extract repositoryId
        const job = await client.query(api.jobs.getJob, { jobId: jobId as Id<'jobs'> });
        if (!job) {
          throw new Error('Job not found for docs persistence');
        }

        // Transform files to match docs schema
        const docsFiles = files.map((file) => {
          // Determine kind based on file path
          let kind: 'chapter' | 'tutorial' | 'toc' | 'yaml' = 'chapter';
          if (file.path?.includes('tutorial')) {
            kind = 'tutorial';
          } else if (file.type === 'yaml' || file.path?.endsWith('.yaml')) {
            kind = 'yaml';
          } else if (file.path?.includes('toc') || file.path?.toLowerCase().includes('table')) {
            kind = 'toc';
          }

          // Extract chapter index from filename if it's a chapter
          let chapterIndex = 0;
          if (kind === 'chapter') {
            const match = file.path?.match(/(\d+)/);
            if (match?.[1]) {
              chapterIndex = Number.parseInt(match[1], 10);
            }
          }

          return {
            slug: file.path ?? `doc-${Date.now()}`,
            title: file.path?.replace(/\.(md|yaml)$/, '').replace(/.*\//, '') ?? 'Document',
            chapterIndex,
            content: file.content ?? '',
            kind,
          };
        });

        // Count chapters and tutorials
        const chaptersCount = docsFiles.filter((f) => f.kind === 'chapter').length;
        const tutorialsCount = docsFiles.filter((f) => f.kind === 'tutorial').length;

        // Persist docs in Convex
        await client.mutation(api.docs.upsertFromJob, {
          jobId: jobId as Id<'jobs'>,
          repositoryId: job.repositoryId,
          files: docsFiles,
          summary: {
            chaptersCount,
            tutorialsCount,
            generatedAt: Date.now(),
          },
        });

        logger.info(`Persisted docs for job`, {
          jobId,
          totalDocs: docsFiles.length,
          chaptersCount,
          tutorialsCount,
        });
      }

      // Call the Convex updateStatus mutation
      await client.mutation(api.jobs.updateStatus, {
        jobId: jobId as Id<'jobs'>,
        status: convexStatus as
          | 'pending'
          | 'cloning'
          | 'analyzing'
          | 'gathering'
          | 'running'
          | 'completed'
          | 'failed'
          | 'canceled',
        callbackToken: callbackToken ?? '',
        ...(progress && { progress }),
        ...(step !== undefined && { currentStep: step }),
        ...(totalSteps !== undefined && { totalSteps }),
        ...(error && { error }),
      });

      logger.logJob('Status updated', jobId, {
        status: convexStatus,
        progress,
        step,
        filesProcessed: type === 'complete' && files ? files.length : undefined,
      });

      return NextResponse.json({ success: true, received: body.type });
    } catch (error) {
      logger.error(
        'Job callback webhook error',
        error instanceof Error ? error : new Error(String(error)),
      );
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Webhook error' },
        { status: 500 },
      );
    }
  },
);

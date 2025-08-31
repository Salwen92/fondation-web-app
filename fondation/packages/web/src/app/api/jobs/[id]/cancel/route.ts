import { type NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/generated/api";
import type { Id } from "@convex/generated/dataModel";
import { logger } from "@/lib/logger";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL ?? "http://localhost:3210";
const client = new ConvexHttpClient(convexUrl);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const jobId = id as Id<"jobs">;
    
    // Get job details from Convex
    const job = await client.query(api.jobs.getJob, { jobId });
    
    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }
    
    // Check if job can be cancelled
    if (job.status === "completed" || job.status === "failed" || job.status === "canceled") {
      return NextResponse.json(
        { error: `Job already ${job.status}` },
        { status: 400 }
      );
    }
    
    // Update job status in Convex to canceled
    // This will prevent workers from claiming or continuing to process the job
    await client.mutation(api.jobs.updateStatus, {
      jobId,
      status: "canceled",
      callbackToken: job.callbackToken,
      error: "Job cancelled by user",
      progress: "Job was cancelled by user request",
    });
    
    logger.info(`Job ${jobId} cancelled successfully`);
    
    return NextResponse.json({ 
      success: true,
      jobId,
      message: "Job cancelled successfully" 
    });
    
  } catch (error) {
    logger.error("[Cancel API] Error", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cancel failed" },
      { status: 500 }
    );
  }
}
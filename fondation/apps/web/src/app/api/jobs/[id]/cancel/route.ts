import { type NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
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
    
    // Call Worker Gateway cancel endpoint
    const gatewayUrl = process.env.WORKER_GATEWAY_URL ?? "http://localhost:8081";
    const cancelUrl = `${gatewayUrl}/cancel/${jobId}`;
    
    try {
      const response = await fetch(cancelUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        logger.error(`Worker cancel failed: ${response.status}`);
      } else {
        logger.info(`Worker process cancelled for job ${jobId}`);
      }
    } catch (error) {
      logger.error("Failed to call worker cancel endpoint", error instanceof Error ? error : new Error(String(error)));
      // Continue even if worker cancel fails
    }
    
    // Update job status in Convex to canceled
    await client.mutation(api.jobs.updateStatus, {
      jobId,
      status: "canceled",
      callbackToken: job.callbackToken,
      error: "Job cancelled by user",
      progress: "Job was cancelled by user request",
    });
    
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
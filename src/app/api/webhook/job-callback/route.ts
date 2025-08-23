import { type NextRequest, NextResponse } from "next/server";
import { api } from "../../../../../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { type Id } from "../../../../../convex/_generated/dataModel";

// Initialize Convex HTTP client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    // Verify the callback token
    const token = request.headers.get("X-Job-Token");
    if (!token) {
      return NextResponse.json(
        { error: "Missing authentication token" },
        { status: 401 }
      );
    }

    // Parse the request body
    const body = await request.json() as {
      jobId?: string;
      type?: string;
      status?: string;
      documentation?: Record<string, unknown>;
      error?: string;
    };
    const { jobId, type, status, documentation, error } = body;

    if (!jobId || !type) {
      return NextResponse.json(
        { error: "Missing required fields: jobId and type" },
        { status: 400 }
      );
    }

    // Handle different callback types
    switch (type) {
      case "progress":
        console.log(`Job ${jobId} progress:`, status);
        // You could update a progress field in the database
        break;

      case "complete":
        console.log(`Job ${jobId} completed successfully`);
        
        // Update job status in Convex
        await convex.mutation(api.jobs.updateStatus, {
          jobId: jobId as Id<"jobs">,
          status: "completed",
          callbackToken: token,
        });

        // Store the documentation result if provided
        if (documentation) {
          // You might want to create a separate mutation to store documentation
          console.log(`Documentation generated for job ${jobId}:`, Object.keys(documentation));
        }
        break;

      case "error":
        console.error(`Job ${jobId} failed:`, error);
        
        // Update job status to failed
        await convex.mutation(api.jobs.updateStatus, {
          jobId: jobId as Id<"jobs">,
          status: "failed",
          callbackToken: token,
        });
        break;

      default:
        console.log(`Unknown callback type for job ${jobId}:`, type);
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: `Callback processed for job ${jobId}`,
      type,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    endpoint: "job-callback",
    timestamp: new Date().toISOString(),
  });
}
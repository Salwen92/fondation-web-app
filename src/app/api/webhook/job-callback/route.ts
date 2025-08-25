import { type NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

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

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL ?? "http://localhost:3210";
const client = new ConvexHttpClient(convexUrl);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as CallbackBody;
    const callbackToken = req.headers.get('X-Job-Token');
    
    console.log("[Job Callback Webhook] Received:", {
      jobId: body.jobId ?? "unknown",
      type: body.type ?? "unknown",
      status: body.status ?? "unknown",
      timestamp: body.timestamp ?? "unknown",
      callbackToken: callbackToken ? "***PRESENT***" : "MISSING",
    });

    // Map the callback data to the updateStatus mutation format
    const { jobId, type, status, progress, step, totalSteps, error, files } = body;

    if (!jobId) {
      console.error("[Job Callback Webhook] Missing jobId");
      return NextResponse.json(
        { error: "Missing jobId" },
        { status: 400 }
      );
    }

    if (!callbackToken) {
      console.error("[Job Callback Webhook] Missing callbackToken");
      return NextResponse.json(
        { error: "Missing callbackToken" },
        { status: 400 }
      );
    }

    // Determine status based on callback type
    let convexStatus = status ?? "running";
    if (type === "progress" && !status) {
      if (progress?.includes("Cloning")) {
        convexStatus = "cloning";
      } else if (progress?.includes("analysis") || progress?.includes("AI")) {
        convexStatus = "analyzing";
      } else if (progress?.includes("Gathering")) {
        convexStatus = "gathering";
      } else {
        convexStatus = "running";
      }
    } else if (type === "complete") {
      convexStatus = "completed";
    } else if (type === "error") {
      convexStatus = "failed";
    }

    // Handle completion with docs persistence
    if (type === "complete" && files && Array.isArray(files)) {
      console.log(`[Job Callback Webhook] Processing ${files.length} files for completion`);
      
      // Get job to extract repositoryId
      const job = await client.query(api.jobs.getJob, { jobId: jobId as Id<"jobs"> });
      if (!job) {
        throw new Error("Job not found for docs persistence");
      }

      // Transform files to match docs schema
      const docsFiles = files.map((file) => {
        // Determine kind based on file path
        let kind: "chapter" | "tutorial" | "toc" | "yaml" = "chapter";
        if (file.path?.includes("tutorial")) {
          kind = "tutorial";
        } else if (file.type === "yaml" || file.path?.endsWith(".yaml")) {
          kind = "yaml";
        } else if (file.path?.includes("toc") || file.path?.toLowerCase().includes("table")) {
          kind = "toc";
        }

        // Extract chapter index from filename if it's a chapter
        let chapterIndex = 0;
        if (kind === "chapter") {
          const match = file.path?.match(/(\d+)/);
          if (match?.[1]) {
            chapterIndex = parseInt(match[1], 10);
          }
        }

        return {
          slug: file.path ?? `doc-${Date.now()}`,
          title: file.path?.replace(/\.(md|yaml)$/, '').replace(/.*\//, '') ?? "Document",
          chapterIndex,
          content: file.content ?? "",
          kind
        };
      });

      // Count chapters and tutorials
      const chaptersCount = docsFiles.filter(f => f.kind === "chapter").length;
      const tutorialsCount = docsFiles.filter(f => f.kind === "tutorial").length;

      // Persist docs in Convex
      await client.mutation(api.docs.upsertFromJob, {
        jobId: jobId as Id<"jobs">,
        repositoryId: job.repositoryId,
        files: docsFiles,
        summary: {
          chaptersCount,
          tutorialsCount,
          generatedAt: Date.now()
        }
      });

      console.log(`[Job Callback Webhook] Persisted ${docsFiles.length} docs (${chaptersCount} chapters, ${tutorialsCount} tutorials)`);
    }

    // Call the Convex updateStatus mutation
    await client.mutation(api.jobs.updateStatus, {
      jobId: jobId as Id<"jobs">,
      status: convexStatus as "pending" | "cloning" | "analyzing" | "gathering" | "running" | "completed" | "failed" | "canceled",
      callbackToken: callbackToken ?? "",
      ...(progress && { progress }),
      ...(step !== undefined && { currentStep: step }),
      ...(totalSteps !== undefined && { totalSteps }),
      ...(error && { error }),
    });

    console.log("[Job Callback Webhook] Updated Convex job status:", {
      jobId,
      status: convexStatus,
      progress,
      step,
      filesProcessed: type === "complete" && files ? files.length : undefined
    });
    
    return NextResponse.json({ success: true, received: body.type });
  } catch (error) {
    console.error("[Job Callback Webhook] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook error" },
      { status: 500 }
    );
  }
}
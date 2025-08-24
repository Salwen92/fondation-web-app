import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    const { repositoryFullName } = await req.json();
    
    console.log(`[Clear Stuck Jobs] Clearing jobs for repository: ${repositoryFullName}`);
    
    // Clear stuck jobs for all repositories with this fullName (simpler approach)
    const result = await convex.mutation(api.jobs.clearAllStuckJobsForRepo, {
      repositoryFullName: repositoryFullName
    });
    
    console.log(`[Clear Stuck Jobs] Cleared ${result.clearedJobsCount} stuck jobs from ${result.repositoriesProcessed} repositories`);
    
    return NextResponse.json({
      success: true,
      clearedJobsCount: result.clearedJobsCount,
      repositoriesProcessed: result.repositoriesProcessed
    });
  } catch (error) {
    console.error("[Clear Stuck Jobs] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
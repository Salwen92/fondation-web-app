import { ConvexClient } from "convex/browser";
import { api } from "./convex/_generated/api.js";

const client = new ConvexClient(process.env.CONVEX_URL || "https://basic-stoat-666.convex.cloud");

async function clearAllStuckJobs() {
  console.log("Clearing all stuck jobs for Ramadan repository...");
  
  try {
    // Clear all stuck jobs for the Ramadan repository using fullName
    const result = await client.mutation(api.jobs.clearAllStuckJobsForRepo, { 
      repositoryFullName: "Salwen92/ramadan"
    });
    
    console.log("✅ Clear result:", result);
    console.log(`   - Cleared ${result.clearedJobsCount} stuck jobs`);
    console.log(`   - Processed ${result.repositoriesProcessed} repositories`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error clearing jobs:", error);
    process.exit(1);
  }
}

clearAllStuckJobs();
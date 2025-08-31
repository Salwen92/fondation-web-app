import { ConvexClient } from "convex/browser";
import { api } from "./convex/_generated/api.js";

const client = new ConvexClient(process.env.CONVEX_URL);

async function clearStuckJobs() {
  console.log("Clearing stuck jobs...");
  
  // Clear stuck jobs for Ramadan repository by fullName
  const ramadanRepoResult = await client.mutation(api.jobs.clearAllStuckJobsForRepo, { 
    repositoryFullName: "Salwen92/ramadan"
  });
  console.log("Ramadan repo clear result:", ramadanRepoResult);
}

clearStuckJobs().catch(console.error);

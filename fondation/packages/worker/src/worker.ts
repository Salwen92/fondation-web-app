import { ConvexClient } from "convex/browser";
import { validateConfig } from "./config.js";
import { CLIExecutor } from "./cli-executor.js";
import { RepoManager } from "./repo-manager.js";
import { HealthServer } from "./health.js";
import { api, internal, type Id } from "./convex-adapter.js";

// Use local types until workspace resolution is fixed
type WorkerConfig = {
  workerId: string;
  convexUrl: string;
  pollInterval: number;
  leaseTime: number;
  heartbeatInterval: number;
  maxConcurrentJobs: number;
  tempDir: string;
  cliPath?: string;
};

type Job = {
  id: string;
  userId: string;
  repositoryId: string;
  repositoryUrl?: string;
  branch?: string;
  prompt: string;
  status: string;
  [key: string]: any;
};

type JobStatus = 
  | "pending" | "claimed" | "running" | "cloning" 
  | "analyzing" | "gathering" | "completed" 
  | "failed" | "canceled" | "dead";

type ProgressUpdate = {
  jobId: string;
  status: JobStatus;
  progress?: string;
  currentStep?: number;
  totalSteps?: number;
  error?: string;
};

export class PermanentWorker {
  private convex: ConvexClient;
  private cliExecutor: CLIExecutor;
  private repoManager: RepoManager;
  private healthServer: HealthServer;
  private isRunning = false;
  private activeJobs = new Set<string>();
  private lastJobTime: number = Date.now();
  private stats = {
    total: 0,
    succeeded: 0,
    failed: 0,
    totalTime: 0,
  };
  
  // Public getters for health monitoring
  get isHealthy(): boolean {
    const memoryUsage = process.memoryUsage();
    const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    const timeSinceLastJob = Date.now() - this.lastJobTime;
    
    // Healthy if memory usage is reasonable and we've processed a job recently
    return memoryPercent < 90 && (this.stats.total === 0 || timeSinceLastJob < 1800000); // 30 minutes
  }
  
  get workerStats() {
    return {
      total: this.stats.total,
      succeeded: this.stats.succeeded,
      failed: this.stats.failed,
      totalTime: this.stats.totalTime,
      activeJobs: this.activeJobs.size,
      lastJobTime: this.lastJobTime,
    };
  }
  
  constructor(public config: WorkerConfig, convexClient: ConvexClient) {
    validateConfig();
    this.convex = convexClient;
    this.cliExecutor = new CLIExecutor(); // No arguments needed - uses integrated CLI
    this.repoManager = new RepoManager(config.tempDir);
    this.healthServer = new HealthServer(this);
  }
  
  async start(): Promise<void> {
    this.isRunning = true;
    
    // Start health server
    this.healthServer.listen(8080);
    
    console.log("✅ Worker started and ready");
    console.log("🔍 Polling for jobs...");
    
    // Main polling loop
    while (this.isRunning) {
      try {
        await this.pollAndProcess();
        await this.sleep(this.config.pollInterval);
      } catch (error) {
        console.error("❌ Error in polling loop:", error);
        await this.sleep(this.config.pollInterval * 2); // Backoff on error
      }
    }
  }
  
  async stop(): Promise<void> {
    console.log("🛑 Stopping worker...");
    this.isRunning = false;
    
    // Wait for active jobs to complete (with timeout)
    const timeout = 30000; // 30 seconds
    const start = Date.now();
    
    while (this.activeJobs.size > 0 && Date.now() - start < timeout) {
      console.log(`⏳ Waiting for ${this.activeJobs.size} active jobs to complete...`);
      await this.sleep(1000);
    }
    
    if (this.activeJobs.size > 0) {
      console.warn(`⚠️  ${this.activeJobs.size} jobs still active after timeout`);
    }
    
    // Cleanup
    await this.repoManager.cleanupAll();
    this.healthServer.stop();
    
    console.log("✅ Worker stopped");
  }
  
  private async pollAndProcess(): Promise<void> {
    // Check if we can take more jobs
    if (this.activeJobs.size >= this.config.maxConcurrentJobs) {
      return;
    }
    
    try {
      // Claim a job from the queue
      const claimedJob = await this.convex.mutation(api.queue.claimOne, {
        workerId: this.config.workerId,
        leaseMs: this.config.leaseTime,
      });
      
      if (claimedJob) {
        const job: Job = {
          id: claimedJob.id as string,
          repositoryId: claimedJob.repositoryId as string,
          userId: claimedJob.userId as string,
          prompt: claimedJob.prompt,
          callbackToken: claimedJob.callbackToken,
          attempts: claimedJob.attempts || 0,
          status: "claimed" as JobStatus,
          maxAttempts: 3,
        };
        
        console.log(`📝 Claimed job: ${job.id}`);
        this.lastJobTime = Date.now();
        this.activeJobs.add(job.id);
        
        // Process job asynchronously
        this.processJob(job)
          .finally(() => {
            this.activeJobs.delete(job.id);
          });
      }
    } catch (error) {
      console.error("❌ Error claiming job:", error);
    }
  }
  
  private async processJob(job: Job): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Fetch repository details to get URL
      const repository = await this.convex.query(api.repositories.getByRepositoryId, {
        repositoryId: job.repositoryId as Id<"repositories">,
      });
      
      if (!repository) {
        throw new Error(`Repository ${job.repositoryId} not found`);
      }
      
      console.log(`🔧 Processing job ${job.id} for repository: ${repository.fullName}`);
      
      // Start heartbeat to maintain lease
      const heartbeatInterval = this.startHeartbeat(job.id);
      
      try {
        // Update status to running
        await this.updateJobStatus(job.id, "running", "Initializing...");
        
        // Clone repository
        await this.updateJobStatus(job.id, "cloning", "Cloning repository...");
        const repoUrl = `https://github.com/${repository.fullName}.git`;
        const repoPath = await this.repoManager.cloneRepo(
          repoUrl,
          repository.defaultBranch || "main",
          job.id
        );
        
        // Execute CLI
        await this.updateJobStatus(job.id, "analyzing", "Analyzing codebase...");
        const result = await this.cliExecutor.execute(repoPath, {
          prompt: job.prompt,
          onProgress: async (progress) => {
            await this.updateJobProgress(job.id, progress);
          },
        });
        
        // Save results
        await this.updateJobStatus(job.id, "gathering", "Saving results...");
        await this.saveResults(job, result);
        
        // Mark as completed
        const duration = Date.now() - startTime;
        await this.completeJob(job.id, result);
        
        this.stats.succeeded++;
        this.stats.totalTime += duration;
        
        console.log(`✅ Job ${job.id} completed in ${Math.round(duration / 1000)}s`);
      } finally {
        // Stop heartbeat
        clearInterval(heartbeatInterval);
        
        // Cleanup repository
        await this.repoManager.cleanup(job.id);
      }
    } catch (error) {
      console.error(`❌ Job ${job.id} failed:`, error);
      await this.failJob(job.id, error instanceof Error ? error.message : String(error));
      this.stats.failed++;
    } finally {
      this.stats.total++;
    }
  }
  
  private startHeartbeat(jobId: string): NodeJS.Timeout {
    return setInterval(async () => {
      try {
        await this.convex.mutation(api.queue.heartbeat, {
          jobId: jobId as Id<"jobs">,
          workerId: this.config.workerId,
          leaseMs: this.config.leaseTime,
        });
        console.log(`💓 Heartbeat for job ${jobId}`);
      } catch (error) {
        console.error(`❌ Heartbeat failed for job ${jobId}:`, error);
      }
    }, this.config.heartbeatInterval);
  }
  
  private async updateJobStatus(
    jobId: string,
    status: JobStatus,
    progress?: string
  ): Promise<void> {
    await this.convex.mutation(api.queue.heartbeat, {
      jobId: jobId as Id<"jobs">,
      workerId: this.config.workerId,
      status: status as "cloning" | "analyzing" | "gathering" | "running",
      progress,
    });
    console.log(`📊 Job ${jobId}: ${status} - ${progress || ""}`);
  }
  
  private async updateJobProgress(jobId: string, progress: string): Promise<void> {
    // Extract step number from progress messages like "Step 1/6: Extracting abstractions"
    const stepMatch = progress.match(/Step (\d+)\/(\d+):/);
    let currentStep = undefined;
    
    if (stepMatch) {
      currentStep = parseInt(stepMatch[1]);
      console.log(`📈 Job ${jobId}: ${progress} (Step ${currentStep})`);
    } else {
      console.log(`📈 Job ${jobId}: ${progress}`);
    }
    
    try {
      await this.convex.mutation(api.queue.heartbeat, {
        jobId: jobId as Id<"jobs">,
        workerId: this.config.workerId,
        progress,
        currentStep,
      });
    } catch (error) {
      console.error(`⚠️ Failed to update progress for job ${jobId}:`, error);
    }
  }
  
  private async completeJob(jobId: string, result: any): Promise<void> {
    // Convert complex result to simple structure for Convex schema
    const simpleResult = {
      success: result.success || false,
      message: result.success 
        ? `Generated ${result.documents?.length || 0} documents successfully` 
        : "Generation failed",
      data: result.documents?.length ? `${result.documents.length} documents` : undefined,
    };
    
    console.log(`✅ Completing job ${jobId} with:`, { 
      success: simpleResult.success,
      message: simpleResult.message,
      docsCount: result.documents?.length || 0 
    });
    
    await this.convex.mutation(api.queue.complete, {
      jobId: jobId as Id<"jobs">,
      workerId: this.config.workerId,
      result: simpleResult,
      docsCount: result.documents?.length || 0,
    });
    console.log(`✅ Job ${jobId} completed successfully`);
  }
  
  private async failJob(jobId: string, error: string): Promise<void> {
    await this.convex.mutation(api.queue.retryOrFail, {
      jobId: jobId as Id<"jobs">,
      workerId: this.config.workerId,
      error,
    });
    console.log(`❌ Job ${jobId} failed: ${error}`);
  }
  
  private async saveResults(job: Job, result: any): Promise<void> {
    console.log(`💾 Saving results for job ${job.id}`);
    
    // Check if we have documents to save
    if (!result.documents || result.documents.length === 0) {
      console.warn(`⚠️  No documents to save for job ${job.id}`);
      return;
    }
    
    console.log(`📄 Saving ${result.documents.length} documents to Convex...`);
    
    try {
      // Call the Convex mutation to upsert documents
      await this.convex.mutation(api.docs.upsertFromJob, {
        jobId: job.id as Id<"jobs">,
        repositoryId: job.repositoryId as Id<"repositories">,
        runId: `run_${Date.now()}`, // Unique run identifier
        files: result.documents.map((doc: any) => ({
          slug: doc.slug,
          title: doc.title,
          content: doc.content,
          kind: doc.kind,
          chapterIndex: doc.chapterIndex >= 0 ? doc.chapterIndex : undefined,
        })),
        summary: {
          chaptersCount: result.documents.filter((d: any) => d.kind === "chapter").length,
          tutorialsCount: result.documents.filter((d: any) => d.kind === "tutorial").length,
          generatedAt: Date.now(),
        },
      });
      
      console.log(`✅ Successfully saved ${result.documents.length} documents`);
    } catch (error) {
      console.error(`❌ Failed to save documents:`, error);
      throw error; // Re-throw to mark job as failed
    }
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  
  // Removed duplicate getters - already defined above
}
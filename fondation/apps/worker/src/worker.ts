import { ConvexClient } from "convex/browser";
import { WorkerConfig, Job, JobStatus, ProgressUpdate } from "@fondation/shared";
import { validateConfig } from "./config.js";
import { CLIExecutor } from "./cli-executor.js";
import { RepoManager } from "./repo-manager.js";
import { HealthServer } from "./health.js";

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
  
  constructor(private config: WorkerConfig) {
    validateConfig();
    this.convex = new ConvexClient(config.convexUrl);
    this.cliExecutor = new CLIExecutor(config.cliPath);
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
      // TODO: Replace with actual Convex query when schema is updated
      // const job = await this.convex.query("jobs:claimOne", {
      //   workerId: this.config.workerId,
      //   leaseMs: this.config.leaseTime,
      // });
      
      // Placeholder for now
      const job = null;
      
      if (job) {
        console.log(`📝 Claimed job: ${job.id}`);
        this.lastJobTime = Date.now();
        this.activeJobs.add(job.id);
        
        // Process job asynchronously
        this.processJob(job as Job)
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
    console.log(`🔧 Processing job ${job.id} for repository: ${job.repositoryUrl}`);
    
    try {
      // Start heartbeat to maintain lease
      const heartbeatInterval = this.startHeartbeat(job.id);
      
      try {
        // Update status to running
        await this.updateJobStatus(job.id, "running", "Initializing...");
        
        // Clone repository
        await this.updateJobStatus(job.id, "cloning", "Cloning repository...");
        const repoPath = await this.repoManager.cloneRepo(
          job.repositoryUrl,
          job.branch || "main",
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
        // TODO: Replace with actual Convex mutation
        // await this.convex.mutation("jobs:heartbeat", {
        //   jobId,
        //   workerId: this.config.workerId,
        //   leaseMs: this.config.leaseTime,
        // });
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
    // TODO: Replace with actual Convex mutation
    console.log(`📊 Job ${jobId}: ${status} - ${progress || ""}`);
  }
  
  private async updateJobProgress(jobId: string, progress: string): Promise<void> {
    // TODO: Replace with actual Convex mutation
    console.log(`📈 Job ${jobId}: ${progress}`);
  }
  
  private async completeJob(jobId: string, result: any): Promise<void> {
    // TODO: Replace with actual Convex mutation
    console.log(`✅ Job ${jobId} completed with result`);
  }
  
  private async failJob(jobId: string, error: string): Promise<void> {
    // TODO: Replace with actual Convex mutation
    console.log(`❌ Job ${jobId} failed: ${error}`);
  }
  
  private async saveResults(job: Job, result: any): Promise<void> {
    // TODO: Save documents to Convex
    console.log(`💾 Saving results for job ${job.id}`);
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  
  // Getters for health checks
  get isHealthy(): boolean {
    return this.isRunning && Date.now() - this.lastJobTime < 3600000; // 1 hour
  }
  
  get workerStats() {
    return {
      ...this.stats,
      activeJobs: this.activeJobs.size,
      averageTime: this.stats.total > 0 ? this.stats.totalTime / this.stats.total : 0,
      lastJobTime: this.lastJobTime,
    };
  }
}
import type { ConvexClient } from "convex/browser";
import { validateConfig } from "./config.js";
import { CLIExecutor } from "./cli-executor.js";
import { RepoManager } from "./repo-manager.js";
import { HealthServer } from "./health.js";
import { api } from "@convex/generated/api";
import type { Id } from "@convex/generated/dataModel";

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
    
    // Main polling loop
    while (this.isRunning) {
      try {
        await this.pollAndProcess();
        await this.sleep(this.config.pollInterval);
      } catch (_error) {
        await this.sleep(this.config.pollInterval * 2); // Backoff on error
      }
    }
  }
  
  async stop(): Promise<void> {
    this.isRunning = false;
    
    // Wait for active jobs to complete (with timeout)
    const timeout = 30000; // 30 seconds
    const start = Date.now();
    
    while (this.activeJobs.size > 0 && Date.now() - start < timeout) {
      await this.sleep(1000);
    }
    
    if (this.activeJobs.size > 0) {
    }
    
    // Cleanup
    await this.repoManager.cleanupAll();
    this.healthServer.stop();
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
        this.lastJobTime = Date.now();
        this.activeJobs.add(job.id);
        
        // Process job asynchronously
        this.processJob(job)
          .finally(() => {
            this.activeJobs.delete(job.id);
          });
      }
    } catch (_error) {
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
      } finally {
        // Stop heartbeat
        clearInterval(heartbeatInterval);
        
        // Cleanup repository
        await this.repoManager.cleanup(job.id);
      }
    } catch (error) {
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
      } catch (_error) {
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
  }
  
  private async updateJobProgress(jobId: string, progress: string): Promise<void> {
    // Extract step number from progress messages like "Step 1/6: Extracting abstractions"
    const stepMatch = progress.match(/Step (\d+)\/(\d+):/);
    let currentStep ;
    
    if (stepMatch) {
      currentStep = Number.parseInt(stepMatch[1], 10);
    } else {
    }
    
    try {
      await this.convex.mutation(api.queue.heartbeat, {
        jobId: jobId as Id<"jobs">,
        workerId: this.config.workerId,
        progress,
        currentStep,
      });
    } catch (_error) {
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
    
    await this.convex.mutation(api.queue.complete, {
      jobId: jobId as Id<"jobs">,
      workerId: this.config.workerId,
      result: simpleResult,
      docsCount: result.documents?.length || 0,
    });
  }
  
  private async failJob(jobId: string, error: string): Promise<void> {
    await this.convex.mutation(api.queue.retryOrFail, {
      jobId: jobId as Id<"jobs">,
      workerId: this.config.workerId,
      error,
    });
  }
  
  private async saveResults(job: Job, result: any): Promise<void> {
    
    // Check if we have documents to save
    if (!result.documents || result.documents.length === 0) {
      return;
    }
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
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  
  // Removed duplicate getters - already defined above
}
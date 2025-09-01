import type { ConvexClient } from "convex/browser";
// validateConfig is now passed from main
import { CLIExecutor } from "./cli-executor.js";
import { RepoManager } from "./repo-manager.js";
import { HealthServer } from "./health.js";
import { api } from "@convex/generated/api";
import { getSimpleCrypto } from "./simple-crypto";
const safeDeobfuscate = getSimpleCrypto();

// Type aliases for IDs to avoid import issues
type JobId = string;
type RepositoryId = string;

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
  executionMode: 'local' | 'docker' | 'container';
  developmentMode: boolean;
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

// Standardized job status definitions - must match Convex schema
type JobStatus = 
  | "pending" | "claimed" | "cloning" | "analyzing" 
  | "gathering" | "running" | "completed" 
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
  private startTime: number = Date.now();
  private stats = {
    total: 0,
    succeeded: 0,
    failed: 0,
    totalTime: 0,
  };
  
  // Public getters for health monitoring
  get isHealthy(): boolean {
    const memoryUsage = process.memoryUsage();
    const memoryPercent = (memoryUsage.rss / (1024 * 1024 * 1024)); // RSS in GB
    const timeSinceLastJob = Date.now() - this.lastJobTime;
    const uptime = Date.now() - this.startTime;
    
    // Healthy if:
    // 1. Memory usage is under 1GB (RSS, not heap)
    // 2. Either no jobs processed yet OR last job was within 30 minutes OR worker just started (<5 min)
    // 3. Worker is still running
    return this.isRunning && 
           memoryPercent < 1.0 && 
           (this.stats.total === 0 || timeSinceLastJob < 1800000 || uptime < 300000); // 30 minutes or 5 min startup grace
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
    // validateConfig is now called in main before creating worker
    this.convex = convexClient;
    
    // Environment-aware container validation
    this.validateExecutionEnvironment();
    
    this.cliExecutor = new CLIExecutor(config.cliPath); // Pass CLI path from config
    this.repoManager = new RepoManager(config.tempDir);
    this.healthServer = new HealthServer(this);
  }
  
  private validateExecutionEnvironment(): void {
    const { developmentMode, executionMode } = this.config;
    
    if (developmentMode) {
      
      if (executionMode === 'local') {
      } else {
      }
      
      return;
    }
    
    // Production mode - enforce strict container requirements
    const isInsideDocker = process.env.DOCKER_CONTAINER === 'true' || 
                          require('node:fs').existsSync('/.dockerenv');
    
    if (!isInsideDocker) {
      throw new Error(
        "ARCHITECTURE VIOLATION: Production worker must run inside Docker container.\n" +
        "This ensures consistent execution environment and prevents Docker-in-Docker issues.\n" +
        "Solutions:\n" +
        "  1. Use docker-compose: 'docker-compose -f docker-compose.worker.yml up'\n" +
        "  2. Set environment variable: DOCKER_CONTAINER=true\n" +
        "  3. Run in Docker container with proper mounts\n\n" +
        "For development mode, set NODE_ENV=development to bypass this check."
      );
    }
  }
  
  async start(): Promise<void> {
    this.isRunning = true;
    
    // Start health server
    this.healthServer.listen(8081); // Health check endpoint
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
      } else {
      }
    } catch (_error) {
    }
  }
  
  private async processJob(job: Job): Promise<void> {
    const startTime = Date.now();
    
    try {
      const repository = await this.convex.query(api.repositories.getByRepositoryId, {
        repositoryId: job.repositoryId as any,
      });
      
      if (!repository) {
        throw new Error(`Repository ${job.repositoryId} not found`);
      }
      
      // Start heartbeat to maintain lease
      const heartbeatInterval = this.startHeartbeat(job.id);
      
      try {
        // Update status to running
        await this.updateJobStatus(job.id, "running", "Initializing...");
        const user = await this.convex.query(api.users.getUserById, {
          userId: repository.userId as any,
        });
        
        if (!user?.githubId) {
          throw new Error(`User not found or missing GitHub ID for repository ${repository.fullName}`);
        }
        let userGithubToken = await this.convex.query(api.users.getGitHubToken, {
          githubId: user.githubId,
        });

        // Deobfuscate the token if found
        if (userGithubToken) {
          userGithubToken = safeDeobfuscate(userGithubToken);
        }

        // Fallback to environment token if user token not found
        if (!userGithubToken) {
          userGithubToken = process.env.GITHUB_TOKEN ?? null;
          if (!userGithubToken) {
            throw new Error(
              `No GitHub token available for user ${user.githubId}. ` +
              `Ensure user has connected GitHub or GITHUB_TOKEN environment variable is set.`
            );
          }
        }
        try {
          await this.updateJobStatus(job.id, "cloning", "Cloning repository...");
        } catch (_error) {
          // Continue anyway - the job may still work
        }
        const repoUrl = `https://github.com/${repository.fullName}.git`;
        const repoPath = await this.repoManager.cloneRepo(
          repoUrl,
          repository.defaultBranch || "main",
          job.id,
          userGithubToken || undefined
        );
        try {
          await this.updateJobStatus(job.id, "analyzing", "Analyzing codebase...");
        } catch (_error) {
          // Continue anyway
        }
        const result = await this.cliExecutor.execute(repoPath, {
          prompt: job.prompt,
          onProgress: async (progress) => {
            await this.updateJobProgress(job.id, progress);
          },
        });
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
          jobId: jobId as any,
          workerId: this.config.workerId,
          leaseMs: this.config.leaseTime,
        });
      } catch (_error) {
        // Continue - heartbeat failures are not critical if job completes successfully
      }
    }, this.config.heartbeatInterval);
  }
  
  private async updateJobStatus(
    jobId: string,
    status: JobStatus,
    progress?: string
  ): Promise<void> {
    await this.convex.mutation(api.queue.heartbeat, {
      jobId: jobId as any,
      workerId: this.config.workerId,
      status: status as "cloning" | "analyzing" | "gathering" | "running",
      progress,
    });
  }
  
  private async updateJobProgress(jobId: string, progress: string): Promise<void> {
    // Extract step number from progress messages like "Étape 1/6: Extraction des abstractions"
    let currentStep = 0; // Default to 0 if extraction fails
    
    // Try primary pattern: "Étape X/6:"
    const stepMatch = progress.match(/Étape (\d+)\/(\d+):/);
    if (stepMatch) {
      currentStep = Number.parseInt(stepMatch[1], 10);
    } else {
      // Fallback patterns for different message formats
      const fallbackPatterns = [
        /Step (\d+)\/(\d+):/, // English fallback
        /(\d+)\/(\d+):/, // Generic X/Y pattern
        /étape (\d+)/i, // Case-insensitive French
      ];
      
      for (const pattern of fallbackPatterns) {
        const match = progress.match(pattern);
        if (match) {
          currentStep = Number.parseInt(match[1], 10);
          break;
        }
      }
      
      // If all extractions fail, log for debugging but continue
      if (currentStep === 0) {
      }
    }
    
    try {
      await this.convex.mutation(api.queue.heartbeat, {
        jobId: jobId as any,
        workerId: this.config.workerId,
        progress,
        currentStep,
        totalSteps: 6, // Set the correct total steps for the UI
      });
    } catch (_error) {
      // Continue - progress updates are not critical for job completion
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
      jobId: jobId as any,
      workerId: this.config.workerId,
      result: simpleResult,
      docsCount: result.documents?.length || 0,
    });
  }
  
  private async failJob(jobId: string, error: string): Promise<void> {
    await this.convex.mutation(api.queue.retryOrFail, {
      jobId: jobId as any,
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
        jobId: job.id as any,
        repositoryId: job.repositoryId as any,
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
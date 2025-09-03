import type { ConvexClient } from "convex/browser";
// validateConfig is now passed from main
import { CLIExecutor } from "./cli-executor.js";
import { RepoManager } from "./repo-manager.js";
import { HealthServer } from "./health.js";
import { api } from "@convex/generated/api";
import { safeDecrypt, maskSensitiveData } from "./encryption";
import { WorkerLogger } from "./worker-logger.js";

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
  private logger: WorkerLogger;
  private isRunning = false;
  private activeJobs = new Set<string>();
  private lastJobTime: number = Date.now();
  private startTime: number = Date.now();
  
  // Adaptive polling state
  private consecutiveEmptyPolls: number = 0;
  private readonly maxBackoffMs: number = 60000; // 1 minute max backoff
  private readonly backoffMultiplier: number = 1.5;
  
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
    
    // Initialize logger with worker ID
    this.logger = new WorkerLogger(config.workerId);
    
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
      let jobWasFound = false;
      
      const success = await this.logger.safeExecute(
        'poll-and-process',
        async () => {
          jobWasFound = await this.pollAndProcess();
          return true;
        }
      );
      
      // Calculate adaptive delay based on whether job was found or error occurred
      const delay = this.calculatePollingDelay(jobWasFound, !success);
      
      if (this.config.developmentMode && delay > this.config.pollInterval * 2) {
        this.logger.logInfo(
          `Adaptive polling: backing off for ${Math.round(delay / 1000)}s after ${this.consecutiveEmptyPolls} empty polls`
        );
      }
      
      await this.sleep(delay);
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
  
  private async pollAndProcess(): Promise<boolean> {
    // Check if we can take more jobs
    if (this.activeJobs.size >= this.config.maxConcurrentJobs) {
      // Capacity limit reached
      return false; // No job processed due to capacity limit
    }
    
    // Attempt to claim a job
    
    const claimedJob = await this.logger.safeExecute(
      'claim-job',
      async () => {
        const result = await this.convex.mutation(api.queue.claimOne, {
          workerId: this.config.workerId,
          leaseMs: this.config.leaseTime,
        });
        if (result) {
          this.logger.logInfo(`[Worker] Claimed job: ${result.id}`);
        } else {
          // No jobs available
        }
        return result;
      }
    );
    
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
      
      return true; // Job was found and claimed
    }
    
    return false; // No job was available
  }
  
  /**
   * Fast pre-validation checks before expensive operations
   * Returns validation data if successful, null if validation failed
   */
  private async preValidateJob(job: Job): Promise<{
    repository: any;
    user: any; 
    token: string;
  } | null> {
    this.logger.logInfo(`[PreValidate] Starting validation for job ${job.id}`);
    
    // 1. Validate repository exists
    this.logger.logInfo(`[PreValidate] Fetching repository ${job.repositoryId}`);
    const repository = await this.convex.query(api.repositories.getByRepositoryId, {
      repositoryId: job.repositoryId as any,
    });
    
    if (!repository) {
      this.logger.logError('Repository not found', new Error(`Repository ${job.repositoryId} not found`), { jobId: job.id });
      await this.failJob(job.id, `Repository ${job.repositoryId} not found`);
      return null;
    }
    this.logger.logInfo(`[PreValidate] Repository found: ${repository.fullName}`)
    
    // 2. Validate user exists and has GitHub access
    this.logger.logInfo(`[PreValidate] Fetching user ${repository.userId}`);
    const user = await this.convex.query(api.users.getUserById, {
      userId: repository.userId as any,
    });
    
    if (!user?.githubId) {
      this.logger.logError('User validation failed', new Error(`User not found or missing GitHub ID`), { jobId: job.id });
      await this.failJob(job.id, `User not found or missing GitHub ID for repository ${repository.fullName}`);
      return null;
    }
    this.logger.logInfo(`[PreValidate] User found with GitHub ID: ${user.githubId}`)
    
    // 3. Validate GitHub token exists
    this.logger.logInfo(`[PreValidate] Getting GitHub token for user ${user.githubId}`);
    let userGithubToken = await this.convex.query(api.users.getGitHubToken, {
      githubId: user.githubId,
    });
    this.logger.logInfo(`[PreValidate] GitHub token result: ${userGithubToken ? 'Found' : 'Not found'}`);
    
    if (!userGithubToken) {
      this.logger.logError('GitHub token not found', new Error(`No token for user ${user.githubId}`), { jobId: job.id });
      await this.failJob(job.id, "GitHub access token not found. Please reconnect your GitHub account.");
      return null;
    }
    this.logger.logInfo(`[PreValidate] GitHub token retrieved, length: ${userGithubToken.length}`)
    
    // 4. Decrypt and validate token format
    this.logger.logInfo(`[PreValidate] Starting decryption of token: ${userGithubToken.substring(0, 20)}...`);
    this.logger.logInfo(`[PreValidate] ENCRYPTION_KEY available: ${process.env.ENCRYPTION_KEY ? 'YES' : 'NO'}`);
    let token: string;
    try {
      token = safeDecrypt(userGithubToken);
      if (!token || token.length < 10) {
        this.logger.logInfo(`[PreValidate] Decrypted token too short: ${token?.length || 0} chars`);
        throw new Error("Invalid token format");
      }
      this.logger.logInfo(`[PreValidate] ✅ Token decrypted successfully! Length: ${token.length}, starts: ${token.substring(0, 4)}...`);
    } catch (error) {
      this.logger.logError('Token decryption failed', error as Error, { jobId: job.id });
      this.logger.logInfo(`[PreValidate] ❌ Failed to decrypt token: ${error instanceof Error ? error.message : String(error)}`);
      await this.failJob(job.id, "Invalid GitHub token format. Please reconnect your GitHub account.");
      return null;
    }
    
    // 5. Basic repository validation
    if (!repository.fullName) {
      // Repository missing full name
      await this.failJob(job.id, "Repository missing full name");
      return null;
    }
    
    // 6. Check job parameters
    if (!job.prompt || job.prompt.trim().length === 0) {
      // Job prompt is empty
      await this.failJob(job.id, "Job prompt is empty");
      return null;
    }
    
    // All validations passed
    return { repository, user, token };
  }

  private async processJob(job: Job): Promise<void> {
    const startTime = Date.now();
    const jobLogger = this.logger.forJob(job.id, job.repositoryId, job.userId);
    
    this.logger.logInfo(`[ProcessJob] ========== Starting job processing for ${job.id} ==========`);
    
    try {
      // Phase 1: Fast pre-validation checks (fail before expensive operations)
      this.logger.logInfo(`[ProcessJob] Phase 1: Starting pre-validation`);
      const validationResult = await jobLogger.safeExecute(
        'pre-validate-job',
        async () => {
          return await this.preValidateJob(job);
        }
      );
      
      if (!validationResult) {
        this.logger.logError('pre-validate-job', new Error(`Pre-validation failed for job ${job.id}`), { jobId: job.id });
        return;
      }
      
      this.logger.logInfo(`[ProcessJob] ✅ Pre-validation successful`);
      const { repository, user, token } = validationResult;
      
      // Start heartbeat to maintain lease
      this.logger.logInfo(`[ProcessJob] Phase 2: Starting heartbeat for job ${job.id}`);
      const heartbeatInterval = this.startHeartbeat(job.id);
      this.logger.logInfo(`[ProcessJob] ✅ Heartbeat started`);
      
      try {
        // Update status to running (validation already passed)
        this.logger.logInfo(`[ProcessJob] Phase 3: Updating status to 'running'`);
        await this.updateJobStatus(job.id, "running", "Initializing...");
        this.logger.logInfo(`[ProcessJob] ✅ Status updated to running`);
        
        // Use pre-validated token (fallback to environment token if needed)
        this.logger.logInfo(`[ProcessJob] Phase 4: Preparing GitHub token`);
        let userGithubToken: string = token;
        if (!userGithubToken) {
          this.logger.logInfo(`[ProcessJob] No user token, checking environment token`);
          const envToken = process.env.GITHUB_TOKEN;
          if (!envToken) {
            this.logger.logError('github-token-fetch', new Error('No GitHub token available anywhere'), { jobId: job.id });
            throw new Error(
              `No GitHub token available for user ${user.githubId}. ` +
              `Ensure user has connected GitHub or GITHUB_TOKEN environment variable is set.`
            );
          }
          userGithubToken = envToken;
          this.logger.logInfo(`[ProcessJob] Using environment token as fallback`);
        }
        this.logger.logInfo(`[ProcessJob] ✅ GitHub token prepared (length: ${userGithubToken.length})`);
        // Phase 5: Clone repository
        this.logger.logInfo(`[ProcessJob] Phase 5: Starting repository cloning`);
        await jobLogger.safeExecute(
          'update-job-status-cloning',
          async () => {
            await this.updateJobStatus(job.id, "cloning", "Clonage du dépôt...");
          }
        );
        this.logger.logInfo(`[ProcessJob] ✅ Status updated to cloning`);
        
        const repoUrl = `https://github.com/${repository.fullName}.git`;
        this.logger.logInfo(`[ProcessJob] Cloning repo: ${repoUrl} (branch: ${repository.defaultBranch || "main"})`);
        
        const repoPath = await this.repoManager.cloneRepo(
          repoUrl,
          repository.defaultBranch || "main",
          job.id,
          userGithubToken || undefined
        );
        this.logger.logInfo(`[ProcessJob] ✅ Repository cloned to: ${repoPath}`);
        
        // Phase 6: Update to analyzing
        this.logger.logInfo(`[ProcessJob] Phase 6: Starting analysis phase`);
        await jobLogger.safeExecute(
          'update-job-status-analyzing',
          async () => {
            await this.updateJobStatus(job.id, "analyzing", "Analyse du code...");
          }
        );
        this.logger.logInfo(`[ProcessJob] ✅ Status updated to analyzing`);
        
        // Phase 7: Execute CLI
        this.logger.logInfo(`[ProcessJob] Phase 7: Starting CLI execution`);
        this.logger.logInfo(`[ProcessJob] CLI execution params: repoPath=${repoPath}, prompt length=${job.prompt.length}`);
        
        const result = await this.cliExecutor.execute(repoPath, {
          prompt: job.prompt,
          onProgress: async (progress) => {
            this.logger.logInfo(`[ProcessJob] CLI Progress: ${progress}`);
            await this.updateJobProgress(job.id, progress);
          },
        });
        this.logger.logInfo(`[ProcessJob] ✅ CLI execution completed. Result success: ${result?.success}, documents: ${result?.documents?.length || 0}`);
        
        // Phase 8: Save results
        this.logger.logInfo(`[ProcessJob] Phase 8: Saving results`);
        await this.updateJobStatus(job.id, "gathering", "Sauvegarde des résultats...");
        await this.saveResults(job, result);
        this.logger.logInfo(`[ProcessJob] ✅ Results saved`);
        
        // Phase 9: Complete job
        this.logger.logInfo(`[ProcessJob] Phase 9: Completing job`);
        const duration = Date.now() - startTime;
        await this.completeJob(job.id, result);
        this.logger.logInfo(`[ProcessJob] ✅ Job completed successfully in ${duration}ms`);
        
        this.stats.succeeded++;
        this.stats.totalTime += duration;
      } finally {
        // Phase 10: Cleanup
        this.logger.logInfo(`[ProcessJob] Phase 10: Starting cleanup`);
        clearInterval(heartbeatInterval);
        this.logger.logInfo(`[ProcessJob] ✅ Heartbeat stopped`);
        
        await this.repoManager.cleanup(job.id);
        this.logger.logInfo(`[ProcessJob] ✅ Repository cleanup completed`);
      }
    } catch (error) {
      this.logger.logError(`[ProcessJob] ❌ Job failed with error: ${error instanceof Error ? error.message : String(error)}`, error as Error, { jobId: job.id });
      // Mask any sensitive data in error messages
      const safeError = maskSensitiveData(error instanceof Error ? error.message : String(error));
      await this.failJob(job.id, safeError);
      this.stats.failed++;
    } finally {
      this.stats.total++;
      this.logger.logInfo(`[ProcessJob] ========== Job processing completed for ${job.id} ==========`);
    }
  }
  
  private startHeartbeat(jobId: string): NodeJS.Timeout {
    return setInterval(async () => {
      await this.logger.safeExecute(
        'job-heartbeat',
        async () => {
          await this.convex.mutation(api.queue.heartbeat, {
            jobId: jobId as any,
            workerId: this.config.workerId,
            leaseMs: this.config.leaseTime,
          });
        },
        { jobId }
      );
    }, this.config.heartbeatInterval);
  }
  
  private async updateJobStatus(
    jobId: string,
    status: JobStatus,
    progress?: string
  ): Promise<void> {
    // Don't set step numbers for status updates - let the CLI control step progression
    // Only send the status and progress message
    await this.convex.mutation(api.queue.heartbeat, {
      jobId: jobId as any,
      workerId: this.config.workerId,
      status: status as "cloning" | "analyzing" | "gathering" | "running",
      progress,
      // Don't set currentStep here to avoid conflicts with CLI steps
    });
  }
  
  private async updateJobProgress(jobId: string, progress: string): Promise<void> {
    // Use unified ProgressHandler for all progress processing
    const { ProgressHandler } = await import('./progress-handler.js');
    const progressInfo = ProgressHandler.processProgress(progress);
    
    if (!progressInfo) {
      // If we can't parse the progress, just send the raw message
      await this.logger.safeExecute(
        'update-job-progress',
        async () => {
          await this.convex.mutation(api.queue.heartbeat, {
            jobId: jobId as any,
            workerId: this.config.workerId,
            progress: progress.trim(),
            currentStep: 0,
            totalSteps: 6,
          });
        },
        { jobId, currentStep: 0, progress }
      );
      return;
    }
    
    // Format the message for UI display
    const uiMessage = ProgressHandler.formatForUI(progressInfo);
    
    await this.logger.safeExecute(
      'update-job-progress',
      async () => {
        await this.convex.mutation(api.queue.heartbeat, {
          jobId: jobId as any,
          workerId: this.config.workerId,
          progress: uiMessage,
          currentStep: progressInfo.step,
          totalSteps: progressInfo.totalSteps,
        });
      },
      { jobId, currentStep: progressInfo.step, progress: uiMessage }
    );
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
  
  /**
   * Calculate adaptive polling delay with exponential backoff and jitter
   */
  private calculatePollingDelay(jobWasFound: boolean, wasError: boolean): number {
    if (jobWasFound) {
      // Job was found - reset backoff and use minimum interval
      this.consecutiveEmptyPolls = 0;
      return this.config.pollInterval;
    }
    
    if (wasError) {
      // Error occurred - use double interval as before
      return this.config.pollInterval * 2;
    }
    
    // No job found - increment empty poll count and calculate backoff
    this.consecutiveEmptyPolls++;
    
    // Calculate exponential backoff: base * (multiplier ^ empty_polls)
    let backoffDelay = this.config.pollInterval * Math.pow(this.backoffMultiplier, this.consecutiveEmptyPolls);
    
    // Cap at maximum backoff
    backoffDelay = Math.min(backoffDelay, this.maxBackoffMs);
    
    // Add jitter (10-20% random variation) to prevent thundering herd
    const jitterFactor = 0.1 + (Math.random() * 0.1); // 10-20% jitter
    backoffDelay *= (1 + jitterFactor);
    
    return Math.floor(backoffDelay);
  }
  
  // Removed duplicate getters - already defined above
}
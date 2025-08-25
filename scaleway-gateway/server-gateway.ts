/**
 * Scaleway API Gateway
 * 
 * This lightweight Express server acts as an API Gateway for the Scaleway hybrid architecture.
 * It receives HTTP requests and triggers Scaleway Serverless Jobs for long-running tasks.
 * 
 * In production: Uses Scaleway SDK to trigger Serverless Jobs
 * In development: Directly spawns the worker.js script for local testing
 */

import express, { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

// Type definitions
interface JobParams {
  jobId: string;
  repositoryUrl: string;
  branch: string;
  callbackUrl: string;
  callbackToken: string;
  githubToken?: string;
}

interface AnalyzeRequest {
  jobId: string;
  repositoryUrl: string;
  branch?: string;
  callbackUrl: string;
  callbackToken: string;
  githubToken?: string;
}

interface JobResult {
  pid?: number | undefined;
  status: string;
  scwJobId?: string | undefined;
}

interface ActiveJob {
  jobId: string;
  pid?: number | undefined;
  running: boolean;
}

const app = express();
const PORT = process.env.PORT ?? 8081; // Using 8081 to avoid conflict with cloud-run on 8080

// Track active local processes (for development mode)
const activeLocalProcesses = new Map<string, ChildProcess>();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    service: 'scaleway-api-gateway',
    version: '1.0.0',
    mode: process.env.NODE_ENV === 'development' ? 'local-development' : 'production',
    environment: {
      nodeEnv: process.env.NODE_ENV,
      scalewayConfigured: !!(process.env.SCW_ACCESS_KEY && process.env.SCW_SECRET_KEY)
    }
  });
});

/**
 * Trigger a Scaleway Job in production
 * Uses Scaleway Serverless Jobs API to run long-running tasks
 */
async function triggerScalewayJob(jobParams: JobParams): Promise<JobResult> {
  const { jobId, repositoryUrl, branch, callbackUrl, callbackToken, githubToken } = jobParams;
  
  // Scaleway configuration from environment
  const SCALEWAY_API_URL = process.env.SCALEWAY_API_URL || 'https://api.scaleway.com';
  const SCALEWAY_PROJECT_ID = process.env.SCALEWAY_PROJECT_ID;
  const SCALEWAY_SECRET_KEY = process.env.SCALEWAY_SECRET_KEY;
  const SCALEWAY_REGION = process.env.SCALEWAY_REGION || 'fr-par';
  const SCALEWAY_JOB_DEFINITION_ID = process.env.SCALEWAY_JOB_DEFINITION_ID;
  
  if (!SCALEWAY_PROJECT_ID || !SCALEWAY_SECRET_KEY || !SCALEWAY_JOB_DEFINITION_ID) {
    throw new Error('Missing Scaleway configuration. Please set SCALEWAY_PROJECT_ID, SCALEWAY_SECRET_KEY, and SCALEWAY_JOB_DEFINITION_ID');
  }
  
  try {
    // Create job run via Scaleway API
    const response = await fetch(
      `${SCALEWAY_API_URL}/jobs/v1alpha1/regions/${SCALEWAY_REGION}/job-runs`,
      {
        method: 'POST',
        headers: {
          'X-Auth-Token': SCALEWAY_SECRET_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_definition_id: SCALEWAY_JOB_DEFINITION_ID,
          project_id: SCALEWAY_PROJECT_ID,
          name: `fondation-job-${jobId}`,
          environment_variables: {
            JOB_ID: jobId,
            REPOSITORY_URL: repositoryUrl,
            BRANCH: branch,
            CALLBACK_URL: callbackUrl,
            CALLBACK_TOKEN: callbackToken,
            ...(githubToken && { GITHUB_TOKEN: githubToken }),
            ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
            RUNNING_IN_DOCKER: 'true',
            FONDATION_PATH: '/fondation',
          },
          cpu_limit: 2000, // 2 vCPUs
          memory_limit: 4096, // 4GB RAM
          max_duration_seconds: 3600, // 1 hour timeout
          timeout_seconds: 3600,
        }),
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Scaleway API error: ${response.status} - ${error}`);
    }
    
    const jobRun = await response.json() as {
      id: string;
      state: string;
      created_at: string;
    };
    
    console.log(`[Production] Scaleway job run created: ${jobRun.id} for job ${jobId}`);
    
    return {
      success: true,
      jobId,
      scalewayjobRunId: jobRun.id,
      message: 'Job successfully triggered on Scaleway',
    };
  } catch (error) {
    console.error('Failed to trigger Scaleway job:', error);
    throw error;
  }
}

/**
 * Trigger a local worker process for development
 */
async function triggerLocalWorker(jobParams: JobParams): Promise<JobResult> {
  const { jobId, repositoryUrl, branch, callbackUrl, callbackToken, githubToken } = jobParams;
  
  console.log(`[Development Mode] Starting local worker for job ${jobId}`);
  
  // Path to the worker script
  const workerPath = path.join(__dirname, '..', '..', 'scaleway-worker', 'worker.js');
  
  // Set up environment variables for the worker
  const workerEnv: NodeJS.ProcessEnv = {
    ...process.env,
    JOB_ID: jobId,
    REPOSITORY_URL: repositoryUrl,
    BRANCH: branch,
    CALLBACK_URL: callbackUrl,
    CALLBACK_TOKEN: callbackToken,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
  };
  
  if (githubToken) {
    workerEnv.GITHUB_TOKEN = githubToken;
  }
  
  // Spawn the worker process
  const workerProcess = spawn('node', [workerPath], {
    env: workerEnv,
    detached: false, // Keep attached in dev mode for easier debugging
    stdio: ['ignore', 'pipe', 'pipe'] // Capture stdout and stderr
  });
  
  // Track the process
  activeLocalProcesses.set(jobId, workerProcess);
  
  // Log worker output
  workerProcess.stdout?.on('data', (data: Buffer) => {
    console.log(`[Worker ${jobId}] stdout:`, data.toString());
  });
  
  workerProcess.stderr?.on('data', (data: Buffer) => {
    console.error(`[Worker ${jobId}] stderr:`, data.toString());
  });
  
  // Handle worker exit
  workerProcess.on('exit', (code: number | null, signal: NodeJS.Signals | null) => {
    console.log(`[Worker ${jobId}] exited with code ${code ?? 'null'}, signal ${signal ?? 'null'}`);
    activeLocalProcesses.delete(jobId);
  });
  
  workerProcess.on('error', (error: Error) => {
    console.error(`[Worker ${jobId}] error:`, error);
    activeLocalProcesses.delete(jobId);
  });
  
  return {
    pid: workerProcess.pid,
    status: 'started'
  };
}

/**
 * Main analyze endpoint
 * Receives job requests and triggers either Scaleway Jobs (production) or local workers (development)
 */
app.post('/analyze', async (req: Request<unknown, unknown, AnalyzeRequest>, res: Response) => {
  const { 
    jobId, 
    repositoryUrl, 
    branch = 'main',
    callbackUrl, 
    callbackToken,
    githubToken 
  } = req.body;

  // Validate required fields
  if (!jobId || !repositoryUrl || !callbackUrl || !callbackToken) {
    res.status(400).json({
      error: 'Missing required fields',
      required: ['jobId', 'repositoryUrl', 'callbackUrl', 'callbackToken']
    });
    return;
  }

  try {
    let result: JobResult;
    
    if (process.env.NODE_ENV === 'development') {
      // Development mode: spawn local worker
      result = await triggerLocalWorker({
        jobId,
        repositoryUrl,
        branch,
        callbackUrl,
        callbackToken,
        ...(githubToken && { githubToken })
      });
      
      console.log(`[Development] Local worker started with PID ${result.pid ?? 'unknown'}`);
    } else {
      // Production mode: trigger Scaleway Job
      result = await triggerScalewayJob({
        jobId,
        repositoryUrl,
        branch,
        callbackUrl,
        callbackToken,
        ...(githubToken && { githubToken })
      });
    }
    
    // Send immediate response
    res.json({ 
      status: 'accepted', 
      jobId,
      message: 'Job started successfully',
      estimatedMinutes: 45,
      mode: process.env.NODE_ENV === 'development' ? 'local-worker' : 'scaleway-job',
      workerStatus: result.status,
      ...(result.pid !== undefined && { pid: result.pid }),
      ...(result.scwJobId !== undefined && { scwJobId: result.scwJobId })
    });
    
  } catch (error) {
    console.error(`Failed to start job ${jobId}:`, error);
    res.status(500).json({
      error: 'Failed to start job',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Cancel endpoint (development mode only)
 * In production, cancellation would be handled via Scaleway API
 */
app.post('/cancel/:jobId', async (req: Request<{ jobId: string }>, res: Response) => {
  const { jobId } = req.params;
  
  if (process.env.NODE_ENV !== 'development') {
    res.status(501).json({
      error: 'Cancellation not implemented for production mode'
    });
    return;
  }
  
  console.log(`[Cancel Request] Received for job ${jobId}`);
  
  const workerProcess = activeLocalProcesses.get(jobId);
  if (!workerProcess) {
    res.status(404).json({ 
      error: 'Job not found or already completed',
      jobId 
    });
    return;
  }
  
  try {
    workerProcess.kill('SIGTERM');
    activeLocalProcesses.delete(jobId);
    
    console.log(`[Cancel] Successfully cancelled job ${jobId}`);
    
    res.json({ 
      status: 'cancelled',
      jobId,
      message: 'Job cancelled successfully' 
    });
  } catch (error) {
    console.error(`[Cancel] Failed to cancel job ${jobId}:`, error);
    res.status(500).json({ 
      error: 'Failed to cancel job',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Status endpoint (development mode)
 * Shows currently running local workers
 */
app.get('/status', (_req: Request, res: Response) => {
  if (process.env.NODE_ENV !== 'development') {
    res.status(404).json({ error: 'Status endpoint only available in development mode' });
    return;
  }
  
  const activeJobs: ActiveJob[] = Array.from(activeLocalProcesses.entries()).map(([jobId, process]) => ({
    jobId,
    pid: process.pid,
    running: !process.killed
  }));
  
  res.json({
    mode: 'development',
    activeJobs,
    totalActive: activeJobs.length
  });
});

// Error handling middleware
const errorHandler: ErrorRequestHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Scaleway API Gateway listening on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV ?? 'development'}`);
  console.log(`Mode: ${process.env.NODE_ENV === 'development' ? 'Local Development (spawning worker.js)' : 'Production (Scaleway Jobs)'}`);
  
  if (process.env.NODE_ENV === 'development') {
    console.log('Development endpoints available:');
    console.log(`  POST http://localhost:${PORT}/analyze - Start a job`);
    console.log(`  POST http://localhost:${PORT}/cancel/:jobId - Cancel a job`);
    console.log(`  GET  http://localhost:${PORT}/status - View active jobs`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  
  // Kill all active local processes in development mode
  if (process.env.NODE_ENV === 'development') {
    activeLocalProcesses.forEach((process, jobId) => {
      console.log(`Killing local worker ${jobId}`);
      process.kill('SIGTERM');
    });
  }
  
  process.exit(0);
});
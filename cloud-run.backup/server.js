const express = require('express');
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PORT || 8080;

// Track active processes for cancellation
const activeProcesses = new Map();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'fondation-analyze-runner',
    version: '2.0.0',
    mode: 'analyze-command'
  });
});

// Cancel endpoint
app.post('/cancel/:jobId', async (req, res) => {
  const { jobId } = req.params;
  
  console.log(`[Cancel Request] Received for job ${jobId}`);
  
  const process = activeProcesses.get(jobId);
  if (!process) {
    return res.status(404).json({ 
      error: 'Job not found or already completed',
      jobId 
    });
  }
  
  try {
    // Kill the process tree (including all child processes)
    if (process.pid) {
      // Use pkill to kill the entire process tree
      await execAsync(`pkill -TERM -P ${process.pid}`).catch(() => {});
      process.kill('SIGTERM');
    }
    
    // Remove from active processes
    activeProcesses.delete(jobId);
    
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
      details: error.message 
    });
  }
});

// Main analyze endpoint
app.post('/analyze', async (req, res) => {
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
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['jobId', 'repositoryUrl', 'callbackUrl', 'callbackToken']
    });
  }

  // Send immediate response with realistic timing
  res.json({ 
    status: 'accepted', 
    jobId,
    message: 'Course generation started',
    estimatedMinutes: 45
  });

  // Process job asynchronously
  processAnalyzeJob({
    jobId,
    repositoryUrl,
    branch,
    callbackUrl,
    callbackToken,
    githubToken
  }).catch(error => {
    console.error(`Job ${jobId} failed:`, error);
    sendCallback(callbackUrl, callbackToken, {
      jobId,
      type: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  });
});

// Job processing function for analyze command
async function processAnalyzeJob({ jobId, repositoryUrl, branch, callbackUrl, callbackToken, githubToken }) {
  console.log(`Starting analyze job ${jobId} for repository ${repositoryUrl}`);
  
  const repoPath = `/tmp/repos/${jobId}`;
  const outputDir = `/tmp/outputs/${jobId}`;
  
  try {
    // Step 1: Clone repository
    await sendCallback(callbackUrl, callbackToken, {
      jobId,
      type: 'progress',
      status: 'cloning',
      message: 'Cloning repository...',
      step: 0,
      totalSteps: 7,
      timestamp: new Date().toISOString()
    });

    // Create directories
    await execAsync(`mkdir -p ${repoPath} ${outputDir}`);
    
    // Clone with authentication if token provided
    let cloneUrl = repositoryUrl;
    if (githubToken && repositoryUrl.includes('github.com')) {
      const match = repositoryUrl.match(/github\.com[/:]([\w-]+)\/([\w-]+)/);
      if (match) {
        cloneUrl = `https://${githubToken}@github.com/${match[1]}/${match[2]}.git`;
      }
    }
    
    console.log(`Cloning repository to ${repoPath}`);
    await execAsync(`git clone --depth 1 --branch ${branch} ${cloneUrl} ${repoPath}`, {
      timeout: 120000 // 2 minute timeout for clone
    });

    await sendCallback(callbackUrl, callbackToken, {
      jobId,
      type: 'progress',
      status: 'analyzing',
      message: 'Repository cloned. Starting AI analysis...',
      step: 1,
      totalSteps: 7,
      timestamp: new Date().toISOString()
    });

    // Step 2: Run analyze command
    const startTime = Date.now();
    // Use Docker path when running in container, host path otherwise
    const fondationPath = process.env.RUNNING_IN_DOCKER === 'true' ? '/fondation' : '/Users/salwen/Documents/Cyberscaling/fondation';
    
    // Prefer bundled CLI when present, fallback to Bun
    const cliBundled = path.join(fondationPath, 'cli.bundled.cjs');
    let analyzeCommand;
    try {
      await fs.access(cliBundled);
      analyzeCommand = `cd ${fondationPath} && node cli.bundled.cjs analyze ${repoPath}`;
      console.log('Using bundled CLI for analyze command');
    } catch {
      analyzeCommand = `cd ${fondationPath} && bun run src/analyze-all.ts ${repoPath}`;
      console.log('Using Bun fallback for analyze command');
    }
    
    console.log(`Running analyze command: ${analyzeCommand}`);
    
    // Start the analyze process with extended timeout
    const analyzeProcess = exec(analyzeCommand, {
      timeout: 3600000, // 60 minutes timeout
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        CLAUDE_OUTPUT_DIR: outputDir
      }
    });
    
    // Track this process for potential cancellation
    activeProcesses.set(jobId, analyzeProcess);

    // Step 3: Monitor progress via file detection and check for cancellation
    const progressMonitor = setInterval(async () => {
      try {
        // Check if job was cancelled
        const checkCancelUrl = `${callbackUrl.replace('/webhook/job-callback', '')}/api/jobs/${jobId}/status`;
        try {
          const cancelCheckResponse = await fetch(checkCancelUrl);
          if (cancelCheckResponse.ok) {
            const jobStatus = await cancelCheckResponse.json();
            if (jobStatus.cancelRequested) {
              console.log(`Job ${jobId} cancellation requested, killing process`);
              analyzeProcess.kill('SIGTERM');
              clearInterval(progressMonitor);
              return;
            }
          }
        } catch (e) {
          // Ignore cancel check errors
        }
        
        const progress = await checkProgress(outputDir);
        if (progress) {
          await sendCallback(callbackUrl, callbackToken, {
            jobId,
            type: 'progress',
            ...progress,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Progress check error:', error);
      }
    }, 10000); // Check every 10 seconds

    // Wait for completion
    const { stdout, stderr } = await new Promise((resolve, reject) => {
      let output = { stdout: '', stderr: '' };
      
      analyzeProcess.stdout?.on('data', (data) => {
        output.stdout += data.toString();
        console.log(`[${jobId}] stdout:`, data.toString());
      });
      
      analyzeProcess.stderr?.on('data', (data) => {
        output.stderr += data.toString();
        console.error(`[${jobId}] stderr:`, data.toString());
      });
      
      analyzeProcess.on('exit', (code, signal) => {
        clearInterval(progressMonitor);
        activeProcesses.delete(jobId); // Clean up tracking
        
        if (signal === 'SIGTERM' || signal === 'SIGKILL') {
          // Process was cancelled
          reject(new Error('Job was cancelled by user'));
        } else if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Process exited with code ${code}\n${output.stderr}`));
        }
      });
      
      analyzeProcess.on('error', (error) => {
        clearInterval(progressMonitor);
        activeProcesses.delete(jobId); // Clean up tracking
        reject(error);
      });
    });

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`Analyze completed in ${duration} seconds`);

    // Step 4: Gather output files
    await sendCallback(callbackUrl, callbackToken, {
      jobId,
      type: 'progress',
      status: 'gathering',
      message: 'Analysis complete. Gathering output files...',
      step: 7,
      totalSteps: 7,
      timestamp: new Date().toISOString()
    });

    const files = await gatherOutputFiles(outputDir);
    
    // Send completion with files
    await sendCallback(callbackUrl, callbackToken, {
      jobId,
      type: 'complete',
      status: 'success',
      duration,
      filesCount: files.length,
      files,
      timestamp: new Date().toISOString()
    });

    console.log(`Job ${jobId} completed successfully with ${files.length} files`);

  } catch (error) {
    console.error(`Job ${jobId} failed:`, error);
    
    await sendCallback(callbackUrl, callbackToken, {
      jobId,
      type: 'error',
      status: 'failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    throw error;
  } finally {
    // Cleanup
    try {
      await execAsync(`rm -rf ${repoPath} ${outputDir}`);
      console.log(`Cleaned up job ${jobId}`);
    } catch (cleanupError) {
      console.error(`Cleanup failed for job ${jobId}:`, cleanupError);
    }
  }
}

// Check progress based on file creation
async function checkProgress(outputDir) {
  const progressSteps = [
    { file: 'step1_abstractions.yaml', message: 'Extracting core abstractions', step: 2 },
    { file: 'step2_relationships.yaml', message: 'Analyzing component relationships', step: 3 },
    { file: 'step3_order.yaml', message: 'Determining chapter order', step: 4 },
    { file: 'chapters', message: 'Generating chapter content', step: 5 },
    { file: 'reviewed-chapters', message: 'Reviewing and enhancing chapters', step: 6 },
    { file: 'tutorials', message: 'Creating interactive tutorials', step: 7 }
  ];

  for (let i = progressSteps.length - 1; i >= 0; i--) {
    const step = progressSteps[i];
    const filePath = path.join(outputDir, step.file);
    
    try {
      await fs.access(filePath);
      return {
        status: 'analyzing',
        message: step.message,
        step: step.step,
        totalSteps: 7
      };
    } catch {
      // File doesn't exist yet, check previous step
    }
  }

  return null;
}

// Gather all output files
async function gatherOutputFiles(outputDir) {
  const files = [];
  
  try {
    // Check if output directory exists
    await fs.access(outputDir);
    
    // Gather YAML configuration files
    const yamlFiles = ['step1_abstractions.yaml', 'step2_relationships.yaml', 'step3_order.yaml'];
    for (const yamlFile of yamlFiles) {
      try {
        const filePath = path.join(outputDir, yamlFile);
        const content = await fs.readFile(filePath, 'utf-8');
        files.push({
          path: yamlFile,
          content,
          type: 'yaml',
          size: Buffer.byteLength(content, 'utf-8')
        });
      } catch (error) {
        console.log(`YAML file ${yamlFile} not found`);
      }
    }
    
    // Gather markdown files from directories
    const directories = ['chapters', 'reviewed-chapters', 'tutorials'];
    for (const dir of directories) {
      try {
        const dirPath = path.join(outputDir, dir);
        const dirFiles = await fs.readdir(dirPath);
        
        for (const file of dirFiles) {
          if (file.endsWith('.md')) {
            const filePath = path.join(dirPath, file);
            const content = await fs.readFile(filePath, 'utf-8');
            files.push({
              path: `${dir}/${file}`,
              content,
              type: 'markdown',
              size: Buffer.byteLength(content, 'utf-8')
            });
          }
        }
      } catch (error) {
        console.log(`Directory ${dir} not found or empty`);
      }
    }
  } catch (error) {
    console.error('Error gathering output files:', error);
  }
  
  return files;
}

// Send callback to Convex
async function sendCallback(url, token, data) {
  try {
    // For local development in Docker, replace localhost with host.docker.internal
    // Only do this if we're actually running inside a Docker container
    let callbackUrl = url;
    if (process.env.NODE_ENV !== 'production' && 
        process.env.RUNNING_IN_DOCKER === 'true' && 
        url.includes('localhost')) {
      callbackUrl = url.replace('localhost', 'host.docker.internal');
      console.log(`Rewriting callback URL from ${url} to ${callbackUrl}`);
    }
    
    const response = await fetch(callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Job-Token': token
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Callback failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    console.log(`Callback sent for job ${data.jobId}: ${data.type} - ${data.message || ''}`);
  } catch (error) {
    console.error('Failed to send callback:', error);
    // Don't throw - callback failures shouldn't stop the process
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Fondation Analyze Runner listening on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Mode: Full analyze command (30-60 minutes per job)`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});
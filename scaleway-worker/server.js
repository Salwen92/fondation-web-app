const express = require('express');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'scaleway-worker-server',
    version: '1.0.0',
    mode: 'docker-container',
    claudeAuthenticated: !!process.env.CLAUDECODE
  });
});

// Main execution endpoint
app.post('/execute', async (req, res) => {
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

  console.log(`[Server] Received job ${jobId} for ${repositoryUrl}`);

  // Send immediate response
  res.json({ 
    status: 'accepted', 
    jobId,
    message: 'Job processing started'
  });

  // Execute worker.js as a child process
  const workerPath = path.join(__dirname, 'worker.js');
  
  // Replace localhost with host.docker.internal for Docker networking
  const dockerCallbackUrl = callbackUrl.replace('http://localhost', 'http://host.docker.internal')
                                       .replace('https://localhost', 'https://host.docker.internal');
  
  console.log(`[Server] Original callback URL: ${callbackUrl}`);
  console.log(`[Server] Docker callback URL: ${dockerCallbackUrl}`);
  
  const workerEnv = {
    ...process.env,
    JOB_ID: jobId,
    REPOSITORY_URL: repositoryUrl,
    BRANCH: branch,
    CALLBACK_URL: dockerCallbackUrl,
    CALLBACK_TOKEN: callbackToken,
    // Preserve Claude authentication
    CLAUDECODE: process.env.CLAUDECODE,
    CLAUDE_CODE_SSE_PORT: process.env.CLAUDE_CODE_SSE_PORT,
    CLAUDE_CODE_ENTRYPOINT: process.env.CLAUDE_CODE_ENTRYPOINT
  };

  if (githubToken) {
    workerEnv.GITHUB_TOKEN = githubToken;
  }

  const worker = spawn('node', [workerPath], {
    env: workerEnv,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  // Log worker output
  worker.stdout.on('data', (data) => {
    console.log(`[Worker ${jobId}] stdout:`, data.toString());
  });

  worker.stderr.on('data', (data) => {
    console.error(`[Worker ${jobId}] stderr:`, data.toString());
  });

  worker.on('exit', (code, signal) => {
    console.log(`[Worker ${jobId}] exited with code ${code}, signal ${signal}`);
  });

  worker.on('error', (error) => {
    console.error(`[Worker ${jobId}] error:`, error);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Scaleway Worker Server listening on port ${PORT}`);
  console.log(`Claude authenticated: ${!!process.env.CLAUDECODE}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});
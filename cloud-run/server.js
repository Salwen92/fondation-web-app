const express = require('express');
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'fondation-cli-runner',
    version: '1.0.0'
  });
});

// Main execution endpoint
app.post('/execute', async (req, res) => {
  const { 
    jobId, 
    repositoryUrl, 
    branch = 'main',
    prompt = 'general',
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

  // Send immediate response
  res.json({ 
    status: 'accepted', 
    jobId,
    message: 'Job processing started'
  });

  // Process job asynchronously
  processJob({
    jobId,
    repositoryUrl,
    branch,
    prompt,
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

// Job processing function
async function processJob({ jobId, repositoryUrl, branch, prompt, callbackUrl, callbackToken, githubToken }) {
  console.log(`Starting job ${jobId} for repository ${repositoryUrl}`);
  
  const workDir = `/tmp/fondation-${jobId}`;
  const outputDir = `${workDir}/output`;
  
  try {
    // Send progress update
    await sendCallback(callbackUrl, callbackToken, {
      jobId,
      type: 'progress',
      status: 'cloning',
      message: 'Cloning repository...',
      timestamp: new Date().toISOString()
    });

    // Create working directory
    await execAsync(`mkdir -p ${workDir} ${outputDir}`);
    
    // Clone repository with authentication if token provided
    console.log(`Cloning ${repositoryUrl} to ${workDir}/repo`);
    let cloneUrl = repositoryUrl;
    
    // If GitHub token provided, use it for authentication
    if (githubToken && repositoryUrl.includes('github.com')) {
      // Extract owner/repo from URL
      const match = repositoryUrl.match(/github\.com[/:]([\w-]+)\/([\w-]+)/);
      if (match) {
        cloneUrl = `https://${githubToken}@github.com/${match[1]}/${match[2]}.git`;
      }
    }
    
    await execAsync(`git clone --depth 1 --branch ${branch} ${cloneUrl} ${workDir}/repo`, {
      timeout: 60000 // 1 minute timeout
    });

    // Send progress update
    await sendCallback(callbackUrl, callbackToken, {
      jobId,
      type: 'progress',
      status: 'analyzing',
      message: 'Analyzing codebase...',
      timestamp: new Date().toISOString()
    });

    // Run documentation generation
    const repoPath = `${workDir}/repo`;
    console.log(`Running documentation generation for job ${jobId}`);
    
    let command;
    let commandEnv = { ...process.env };
    
    // Always use Fondation CLI for consistency
    const fondationCliPath = path.resolve(__dirname, '../../../fondation/dist/cli.bundled.cjs');
    
    // Check if we have local Fondation CLI available
    const fs = require('fs');
    const useLocalFondation = fs.existsSync(fondationCliPath) && process.env.NODE_ENV === 'development';
    
    // Documentation generation prompt
    const docPrompt = `Generate comprehensive documentation for this codebase. Include:
    1. Project Overview (purpose, features, target audience)
    2. Architecture (system design, components, data flow)
    3. Installation Guide (prerequisites, setup steps)
    4. Usage Guide (getting started, examples, best practices)
    5. API Documentation (all functions/endpoints with parameters and examples)
    6. Configuration (environment variables, settings)
    7. Testing (how to run tests, test coverage)
    8. Contributing Guidelines
    
    Output everything in well-structured markdown format with clear sections and code examples.`;
    
    if (useLocalFondation) {
      // Use local Fondation CLI
      console.log('Using local Fondation CLI');
      command = `cd ${repoPath} && node ${fondationCliPath} run -p "${docPrompt}" --quiet`;
    } else {
      // Use bundled Fondation CLI with API key
      const cliPath = path.join(__dirname, 'cli.bundled.cjs');
      const anthropicKey = process.env.ANTHROPIC_API_KEY;
      
      if (!anthropicKey) {
        throw new Error('ANTHROPIC_API_KEY not configured');
      }
      
      command = `cd ${repoPath} && node ${cliPath} run -p "${docPrompt}" --profile production --quiet`;
      commandEnv.ANTHROPIC_API_KEY = anthropicKey;
    }
    
    const { stdout, stderr } = await execAsync(command, {
      timeout: 120000, // 2 minutes timeout (reasonable for most projects)
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      env: commandEnv
    });

    // The run command outputs to stdout, so we capture that as the documentation
    const documentation = {
      'README.md': stdout || 'No documentation generated'
    };

    // Send success callback
    await sendCallback(callbackUrl, callbackToken, {
      jobId,
      type: 'complete',
      status: 'success',
      documentation,
      stdout: stdout.substring(0, 5000), // Limit output size
      timestamp: new Date().toISOString()
    });

    console.log(`Job ${jobId} completed successfully`);

  } catch (error) {
    console.error(`Job ${jobId} failed:`, error);
    
    // Send error callback
    await sendCallback(callbackUrl, callbackToken, {
      jobId,
      type: 'error',
      status: 'failed',
      error: error.message,
      stderr: error.stderr?.substring(0, 5000),
      timestamp: new Date().toISOString()
    });
    
    throw error;
  } finally {
    // Cleanup
    try {
      await execAsync(`rm -rf ${workDir}`);
      console.log(`Cleaned up working directory for job ${jobId}`);
    } catch (cleanupError) {
      console.error(`Failed to cleanup job ${jobId}:`, cleanupError);
    }
  }
}

// Send callback to Convex
async function sendCallback(url, token, data) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Job-Token': token
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Callback failed: ${response.status} ${response.statusText}`);
    }

    console.log(`Callback sent for job ${data.jobId}: ${data.type}`);
  } catch (error) {
    console.error('Failed to send callback:', error);
    // Don't throw - callback failures shouldn't stop the process
  }
}

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Fondation CLI Runner listening on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});
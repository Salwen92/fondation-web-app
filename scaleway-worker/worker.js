#!/usr/bin/env node
/**
 * Scaleway Worker - Long-running job executor
 * This script runs as a Scaleway Serverless Job (up to 24 hours timeout)
 * It receives job parameters via environment variables and executes the Fondation CLI
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;

const execAsync = promisify(exec);

// Get job parameters from environment variables (set by Scaleway Job)
// Note: We don't use ANTHROPIC_API_KEY because the system is pre-authenticated with Claude
// The Docker environment is already authenticated and doesn't require API keys
const {
  JOB_ID,
  REPOSITORY_URL,
  BRANCH = 'main',
  CALLBACK_URL,
  CALLBACK_TOKEN,
  GITHUB_TOKEN
} = process.env;

// Validate required environment variables
function validateEnvironment() {
  const required = ['JOB_ID', 'REPOSITORY_URL', 'CALLBACK_URL', 'CALLBACK_TOKEN'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Send callback to Convex
async function sendCallback(data) {
  try {
    const response = await fetch(CALLBACK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Job-Token': CALLBACK_TOKEN
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Callback failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    console.log(`Callback sent: ${data.type} - ${data.message || ''}`);
  } catch (error) {
    console.error('Failed to send callback:', error);
    // Don't throw - callback failures shouldn't stop the process
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

// Main job processing function
async function processAnalyzeJob() {
  console.log(`Starting analyze job ${JOB_ID} for repository ${REPOSITORY_URL}`);
  let hasError = false;
  
  const repoPath = `/tmp/repos/${JOB_ID}`;
  const outputDir = `/tmp/outputs/${JOB_ID}`;
  
  try {
    // Step 1: Clone repository
    await sendCallback({
      jobId: JOB_ID,
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
    let cloneUrl = REPOSITORY_URL;
    if (GITHUB_TOKEN && REPOSITORY_URL.includes('github.com')) {
      const match = REPOSITORY_URL.match(/github\.com[/:]([\w-]+)\/([\w-]+)/);
      if (match) {
        cloneUrl = `https://${GITHUB_TOKEN}@github.com/${match[1]}/${match[2]}.git`;
      }
    }
    
    console.log(`Cloning repository to ${repoPath}`);
    await execAsync(`git clone --depth 1 --branch ${BRANCH} ${cloneUrl} ${repoPath}`, {
      timeout: 120000 // 2 minute timeout for clone
    });

    await sendCallback({
      jobId: JOB_ID,
      type: 'progress',
      status: 'analyzing',
      message: 'Repository cloned. Starting AI analysis...',
      step: 1,
      totalSteps: 7,
      timestamp: new Date().toISOString()
    });

    // Step 2: Run analyze command
    const startTime = Date.now();
    
    // In production Scaleway Job, Fondation will be at /fondation
    // In local dev, it will be at the host path
    const fondationPath = process.env.RUNNING_IN_DOCKER === 'true' 
      ? '/fondation' 
      : '/Users/salwen/Documents/Cyberscaling/fondation';
    
    // Prefer bundled CLI when present (Cloud Run legacy location)
    const cliBundled = path.join(fondationPath, 'cloud-run', 'cli.bundled.cjs');
    let analyzeCommand;
    try {
      await fs.access(cliBundled);
      analyzeCommand = `cd ${fondationPath} && node cloud-run/cli.bundled.cjs analyze ${repoPath}`;
      console.log('Using bundled CLI for analyze command');
    } catch {
      analyzeCommand = `cd ${fondationPath} && bun run src/analyze-all.ts ${repoPath}`;
      console.log('Using Bun fallback for analyze command');
    }
    
    console.log(`Running analyze command: ${analyzeCommand}`);
    
    // Start the analyze process with extended timeout
    // Ensure Claude Code authentication environment is preserved
    const cliEnv = {
      ...process.env,
      CLAUDE_OUTPUT_DIR: outputDir,
      // Explicitly preserve Claude Code authentication variables
      CLAUDECODE: process.env.CLAUDECODE,
      CLAUDE_CODE_SSE_PORT: process.env.CLAUDE_CODE_SSE_PORT,
      CLAUDE_CODE_ENTRYPOINT: process.env.CLAUDE_CODE_ENTRYPOINT,
    };
    
    console.log('CLI Environment check:', {
      CLAUDECODE: cliEnv.CLAUDECODE,
      CLAUDE_CODE_SSE_PORT: cliEnv.CLAUDE_CODE_SSE_PORT,
      cwd: fondationPath
    });
    
    const analyzeProcess = exec(analyzeCommand, {
      timeout: 3600000, // 60 minutes timeout
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
      env: cliEnv,
      cwd: fondationPath // Ensure CLI runs from fondation project directory
    });

    // Monitor progress via file detection
    const progressMonitor = setInterval(async () => {
      try {
        const progress = await checkProgress(outputDir);
        if (progress) {
          await sendCallback({
            jobId: JOB_ID,
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
        console.log(`stdout:`, data.toString());
      });
      
      analyzeProcess.stderr?.on('data', (data) => {
        output.stderr += data.toString();
        console.error(`stderr:`, data.toString());
      });
      
      analyzeProcess.on('exit', (code, signal) => {
        clearInterval(progressMonitor);
        
        if (signal === 'SIGTERM' || signal === 'SIGKILL') {
          reject(new Error('Job was terminated'));
        } else if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Process exited with code ${code}\n${output.stderr}`));
        }
      });
      
      analyzeProcess.on('error', (error) => {
        clearInterval(progressMonitor);
        reject(error);
      });
    });

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`Analyze completed in ${duration} seconds`);

    // Step 3: Gather output files
    await sendCallback({
      jobId: JOB_ID,
      type: 'progress',
      status: 'gathering',
      message: 'Analysis complete. Gathering output files...',
      step: 7,
      totalSteps: 7,
      timestamp: new Date().toISOString()
    });

    const files = await gatherOutputFiles(outputDir);
    
    // Send completion with files
    await sendCallback({
      jobId: JOB_ID,
      type: 'complete',
      status: 'success',
      duration,
      filesCount: files.length,
      files,
      timestamp: new Date().toISOString()
    });

    console.log(`Job ${JOB_ID} completed successfully with ${files.length} files`);

  } catch (error) {
    console.error(`Job ${JOB_ID} failed:`, error);
    hasError = true;
    
    await sendCallback({
      jobId: JOB_ID,
      type: 'error',
      status: 'failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    // Cleanup temporary directories
    try {
      await execAsync(`rm -rf ${repoPath} ${outputDir}`);
      console.log(`Cleaned up temporary directories for job ${JOB_ID}`);
    } catch (cleanupError) {
      console.error(`Cleanup failed for job ${JOB_ID}:`, cleanupError);
    }
    
    // Exit with appropriate code
    process.exit(hasError ? 1 : 0);
  }
}

// Main execution
async function main() {
  try {
    validateEnvironment();
    await processAnalyzeJob();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Start the job
main();
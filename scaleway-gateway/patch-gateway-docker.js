#!/usr/bin/env node
/**
 * Patch script to update the gateway to use Docker containers in development
 * This modifies the compiled JavaScript to use Docker instead of spawning worker.js directly
 */

const fs = require('fs');
const path = require('path');

const gatewayFile = path.join(__dirname, 'dist', 'server-gateway.js');

// Read the current gateway file
let content = fs.readFileSync(gatewayFile, 'utf8');

// Find and replace the triggerLocalWorker function
const oldFunction = `async function triggerLocalWorker(jobParams) {
    const { jobId, repositoryUrl, branch, callbackUrl, callbackToken, githubToken } = jobParams;
    console.log(\`[Development Mode] Starting local worker for job \${jobId}\`);
    // Path to the worker script
    const workerPath = path_1.default.join(__dirname, '..', '..', 'scaleway-worker', 'worker.js');
    // Set up environment variables for the worker
    const workerEnv = {
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
    const workerProcess = (0, child_process_1.spawn)('node', [workerPath], {
        env: workerEnv,
        detached: false, // Keep attached in dev mode for easier debugging
        stdio: ['ignore', 'pipe', 'pipe'] // Capture stdout and stderr
    });`;

const newFunction = `async function triggerLocalWorker(jobParams) {
    const { jobId, repositoryUrl, branch, callbackUrl, callbackToken, githubToken } = jobParams;
    console.log(\`[Development Mode] Starting Docker container for job \${jobId}\`);
    
    // Build Docker run command with environment variables
    const dockerArgs = [
        'run',
        '--rm', // Remove container after exit
        '-e', \`JOB_ID=\${jobId}\`,
        '-e', \`REPOSITORY_URL=\${repositoryUrl}\`,
        '-e', \`BRANCH=\${branch || 'main'}\`,
        '-e', \`CALLBACK_URL=\${callbackUrl}\`,
        '-e', \`CALLBACK_TOKEN=\${callbackToken}\`,
    ];
    
    // Add GitHub token if provided
    if (githubToken) {
        dockerArgs.push('-e', \`GITHUB_TOKEN=\${githubToken}\`);
    }
    
    // Use the authenticated image
    dockerArgs.push('scaleway-worker:authenticated');
    
    console.log('[Docker] Running with authenticated image');
    
    // Spawn Docker process
    const workerProcess = (0, child_process_1.spawn)('docker', dockerArgs, {
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe']
    });`;

// Replace the function
if (content.includes('async function triggerLocalWorker')) {
    // Find the complete function and replace it
    const startIndex = content.indexOf('async function triggerLocalWorker');
    const functionStart = content.substring(startIndex);
    
    // Find where the spawn call ends (look for the closing });)
    const spawnEndPattern = /spawn\([^)]+\),\s*{[^}]+}\s*\);/;
    const match = functionStart.match(spawnEndPattern);
    
    if (match) {
        const endOfSpawn = functionStart.indexOf(match[0]) + match[0].length;
        const beforeFunction = content.substring(0, startIndex);
        const afterSpawn = functionStart.substring(endOfSpawn);
        
        // Construct the new content
        content = beforeFunction + newFunction + afterSpawn;
        
        // Write the updated file
        fs.writeFileSync(gatewayFile, content);
        console.log('✅ Gateway patched to use Docker containers!');
        console.log('   Using image: scaleway-worker:authenticated');
    } else {
        console.error('❌ Could not find spawn pattern to replace');
    }
} else {
    console.error('❌ Could not find triggerLocalWorker function');
}
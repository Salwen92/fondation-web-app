/**
 * Docker Development Mode for Scaleway Gateway
 * This module handles running workers in Docker containers for local development
 */

const { spawn } = require('child_process');

/**
 * Run a job using Docker container (similar to production Scaleway)
 */
async function runDockerWorker(jobParams) {
    const { jobId, repositoryUrl, branch, callbackUrl, callbackToken, githubToken } = jobParams;
    
    console.log(`[Docker Dev Mode] Starting containerized worker for job ${jobId}`);
    
    // Build Docker run command with environment variables
    const dockerArgs = [
        'run',
        '--rm', // Remove container after exit
        '--network', 'host', // Use host network for callback access
        '-e', `JOB_ID=${jobId}`,
        '-e', `REPOSITORY_URL=${repositoryUrl}`,
        '-e', `BRANCH=${branch || 'main'}`,
        '-e', `CALLBACK_URL=${callbackUrl}`,
        '-e', `CALLBACK_TOKEN=${callbackToken}`,
    ];
    
    // Add GitHub token if provided
    if (githubToken) {
        dockerArgs.push('-e', `GITHUB_TOKEN=${githubToken}`);
    }
    
    // Add the image name
    dockerArgs.push('scaleway-worker-dev:latest');
    
    // Spawn Docker process
    const dockerProcess = spawn('docker', dockerArgs, {
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe']
    });
    
    // Log Docker output
    dockerProcess.stdout?.on('data', (data) => {
        console.log(`[Docker Worker ${jobId}]`, data.toString());
    });
    
    dockerProcess.stderr?.on('data', (data) => {
        console.error(`[Docker Worker ${jobId}] Error:`, data.toString());
    });
    
    // Handle Docker exit
    dockerProcess.on('exit', (code, signal) => {
        console.log(`[Docker Worker ${jobId}] Container exited with code ${code}, signal ${signal}`);
    });
    
    dockerProcess.on('error', (error) => {
        console.error(`[Docker Worker ${jobId}] Failed to start:`, error);
    });
    
    return {
        containerId: dockerProcess.pid, // Actually PID of docker process
        status: 'started'
    };
}

module.exports = { runDockerWorker };
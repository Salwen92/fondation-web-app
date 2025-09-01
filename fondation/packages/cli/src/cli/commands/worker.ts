#!/usr/bin/env node

import { Command } from 'commander';
import type { Logger } from 'pino';

export const workerCommand = new Command('worker')
  .description('Start the Fondation worker to process analysis jobs from Convex')
  .option('--convex-url <url>', 'Convex deployment URL (required)')
  .option('--github-token <token>', 'GitHub personal access token for private repos')
  .option('--claude-token <token>', 'Claude OAuth token for API access')
  .option('--poll-interval <ms>', 'Polling interval in milliseconds', '5000')
  .action(async (options: any) => {
    const logger = options._logger as Logger | undefined;

    logger?.info('🚀 Starting Fondation Worker');

    // Validate required environment variables
    const convexUrl = options.convexUrl || process.env.CONVEX_URL;
    const githubToken = options.githubToken || process.env.GITHUB_TOKEN;
    const claudeToken = options.claudeToken || process.env.CLAUDE_CODE_OAUTH_TOKEN;

    if (!convexUrl) {
      logger?.error('❌ CONVEX_URL is required. Set via --convex-url or environment variable.');
      process.exit(1);
    }

    // Set environment variables for the worker
    process.env.CONVEX_URL = convexUrl;
    if (githubToken) { process.env.GITHUB_TOKEN = githubToken; }
    if (claudeToken) { process.env.CLAUDE_CODE_OAUTH_TOKEN = claudeToken; }
    if (options.pollInterval) { process.env.POLL_INTERVAL = options.pollInterval; }

    // Log configuration (without sensitive tokens)
    logger?.info('Worker configuration:');
    logger?.info(`  Convex URL: ${convexUrl}`);
    logger?.info(`  GitHub Token: ${githubToken ? '✓ Set' : '✗ Not set'}`);
    logger?.info(`  Claude Token: ${claudeToken ? '✓ Set' : '✗ Not set'}`);
    logger?.info(`  Poll Interval: ${options.pollInterval || '5000'}ms`);

    // In Docker, the worker is bundled separately
    // We'll use execSync to run it as a subprocess
    const { execSync } = await import('node:child_process');
    
    try {
      // Check if we're in Docker environment by checking for the worker bundle
      const fs = require('node:fs');
      const isDocker = fs.existsSync('/app/worker/dist/worker.bundled.mjs');
      
      if (isDocker) {
        logger?.info('Running worker in Docker environment...');
        // Run the bundled worker with Bun
        execSync('bun /app/worker/dist/worker.bundled.mjs', {
          stdio: 'inherit',
          env: process.env
        });
      } else {
        logger?.info('Running worker in development environment...');
        // In development, run the worker directly
        execSync('cd packages/worker && bun run start', {
          stdio: 'inherit',
          env: process.env,
          cwd: process.cwd()
        });
      }
    } catch (error) {
      logger?.error('❌ Worker exited with error:', error);
      process.exit(1);
    }
  });
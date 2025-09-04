/**
 * Secure Git Operations Module
 *
 * Handles Git operations without exposing tokens in URLs or process lists.
 * Uses Git credential helpers and environment variables for secure authentication.
 *
 * @module git-operations
 */

import { exec } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { maskSensitiveData } from './encryption';

const execAsync = promisify(exec);

export interface GitCloneOptions {
  url: string;
  branch?: string;
  depth?: number;
  targetDir: string;
  token?: string;
}

export interface GitCloneResult {
  success: boolean;
  path: string;
  error?: string;
}

/**
 * Clone a repository securely without exposing token in URL
 *
 * @param options - Clone options including URL and optional token
 * @returns Result with cloned repository path
 */
export async function cloneRepositorySecurely(options: GitCloneOptions): Promise<GitCloneResult> {
  const { url, branch = 'main', depth = 1, targetDir, token } = options;

  // Ensure target directory exists
  await mkdir(targetDir, { recursive: true }).catch(() => {});

  // Clean URL of any embedded tokens
  const cleanUrl = url.replace(/https:\/\/[^@]+@/, 'https://');

  let credentialHelper: string | undefined;
  const env = { ...process.env };

  try {
    if (token) {
      // Create a temporary credential helper script
      const helperId = randomBytes(8).toString('hex');
      credentialHelper = join('/tmp', `git-cred-${helperId}.sh`);

      // Write credential helper script
      const script = `#!/bin/sh
case "$1" in
  get)
    echo "protocol=https"
    echo "host=github.com"
    echo "username=x-access-token"
    echo "password=${token}"
    ;;
esac`;

      await writeFile(credentialHelper, script, { mode: 0o700 });

      // Set up environment to use credential helper
      env.GIT_ASKPASS = credentialHelper;
      env.GIT_TERMINAL_PROMPT = '0';
    } else {
      // No token provided, disable prompts
      env.GIT_TERMINAL_PROMPT = '0';
    }

    // Build clone command
    const cloneCommand = [
      'git clone',
      `--depth ${depth}`,
      `--branch ${branch}`,
      cleanUrl,
      targetDir,
    ].join(' ');

    // Execute clone (token never appears in command)
    const { stderr } = await execAsync(cloneCommand, {
      env,
      timeout: 60000, // 60 second timeout
    });

    // Check for errors in stderr (git writes progress there)
    if (stderr && !stderr.includes('Cloning into')) {
      console.warn('Git clone warning:', maskSensitiveData(stderr));
    }

    return {
      success: true,
      path: targetDir,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Mask any sensitive data in error messages
    const safeError = maskSensitiveData(errorMessage);

    return {
      success: false,
      path: targetDir,
      error: `Repository clone failed: ${safeError}`,
    };
  } finally {
    // Always clean up credential helper
    if (credentialHelper) {
      await unlink(credentialHelper).catch(() => {});
    }
  }
}

/**
 * Alternative: Use Git config for authentication (for persistent operations)
 * This approach sets up Git config temporarily
 */
export async function cloneWithGitConfig(options: GitCloneOptions): Promise<GitCloneResult> {
  const { url, branch = 'main', depth = 1, targetDir, token } = options;

  // Clean URL
  const cleanUrl = url.replace(/https:\/\/[^@]+@/, 'https://');

  // Extract host from URL
  const urlMatch = cleanUrl.match(/https:\/\/([^/]+)/);
  const host = urlMatch ? urlMatch[1] : 'github.com';

  const gitConfigCommands: string[] = [];

  try {
    if (token) {
      // Store credentials in Git config temporarily
      gitConfigCommands.push(
        `git config --global credential.helper store`,
        `git config --global credential.https://${host}.username x-access-token`,
        `git config --global credential.https://${host}.password ${token}`,
      );

      // Apply config
      for (const cmd of gitConfigCommands) {
        await execAsync(cmd, { env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
      }
    }

    // Clone repository
    const cloneCommand = `git clone --depth ${depth} --branch ${branch} ${cleanUrl} ${targetDir}`;

    await execAsync(cloneCommand, {
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      timeout: 60000,
    });

    return {
      success: true,
      path: targetDir,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      success: false,
      path: targetDir,
      error: maskSensitiveData(errorMessage),
    };
  } finally {
    // Clean up Git config
    if (token) {
      const cleanupCommands = [
        `git config --global --unset credential.https://${host}.username`,
        `git config --global --unset credential.https://${host}.password`,
      ];

      for (const cmd of cleanupCommands) {
        await execAsync(cmd).catch(() => {});
      }
    }
  }
}

/**
 * Fetch updates for an existing repository
 */
export async function fetchRepository(repoPath: string, token?: string): Promise<boolean> {
  let credentialHelper: string | undefined;
  const env = { ...process.env };

  try {
    if (token) {
      // Create temporary credential helper
      const helperId = randomBytes(8).toString('hex');
      credentialHelper = join('/tmp', `git-cred-${helperId}.sh`);

      const script = `#!/bin/sh
case "$1" in
  get)
    echo "protocol=https"
    echo "host=github.com"  
    echo "username=x-access-token"
    echo "password=${token}"
    ;;
esac`;

      await writeFile(credentialHelper, script, { mode: 0o700 });
      env.GIT_ASKPASS = credentialHelper;
    }

    env.GIT_TERMINAL_PROMPT = '0';

    await execAsync('git fetch --all', {
      cwd: repoPath,
      env,
      timeout: 30000,
    });

    return true;
  } catch (error) {
    console.error('Git fetch failed:', maskSensitiveData(String(error)));
    return false;
  } finally {
    if (credentialHelper) {
      await unlink(credentialHelper).catch(() => {});
    }
  }
}

/**
 * Clean sensitive data from Git config in a repository
 */
export async function cleanGitConfig(repoPath: string): Promise<void> {
  try {
    // Remove any stored credentials from repo config
    const commands = [
      'git config --local --unset credential.helper',
      'git config --local --unset-all remote.origin.url',
    ];

    for (const cmd of commands) {
      await execAsync(cmd, { cwd: repoPath }).catch(() => {});
    }

    // Set a clean origin URL without any tokens
    const { stdout } = await execAsync('git config --local remote.origin.url', { cwd: repoPath });

    if (stdout) {
      const cleanUrl = stdout.trim().replace(/https:\/\/[^@]+@/, 'https://');
      await execAsync(`git config --local remote.origin.url ${cleanUrl}`, { cwd: repoPath });
    }
  } catch {
    // Ignore errors - best effort cleanup
  }
}

/**
 * Verify Git is installed and available
 */
export async function verifyGitInstalled(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('git --version');
    return stdout.includes('git version');
  } catch {
    return false;
  }
}

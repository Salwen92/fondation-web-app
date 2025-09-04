import { access, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { maskSensitiveData } from './encryption';
import { cleanGitConfig, cloneRepositorySecurely } from './git-operations';
import { DebugLogger } from './utils/environment.js';

export class RepoManager {
  private repos = new Map<string, string>();
  private logger: DebugLogger;

  constructor(private tempDir: string) {
    this.logger = new DebugLogger('RepoManager');
  }

  async cloneRepo(
    url: string,
    branch: string,
    jobId: string,
    githubToken?: string,
  ): Promise<string> {
    this.logger.log(`========== Starting repository clone ==========`);
    const repoPath = join(this.tempDir, `job-${jobId}`);
    this.logger.log(`Target path: ${repoPath}`);
    this.logger.log(`URL: ${url}`);
    this.logger.log(`Branch: ${branch}`);
    this.logger.log(`Has GitHub token: ${!!githubToken}`);
    this.logger.debug(`Token length: ${githubToken?.length || 0}`);

    try {
      // Ensure temp directory exists
      this.logger.log(`Creating temp directory: ${this.tempDir}`);
      await mkdir(this.tempDir, { recursive: true });
      this.logger.log(`✅ Temp directory created`);

      // Clean up any existing directory for this job
      this.logger.log(`Cleaning up existing directory for job ${jobId}`);
      await this.cleanup(jobId);
      this.logger.log(`✅ Cleanup completed`);

      // Clone repository securely without exposing token in URL
      this.logger.log(`Starting secure git clone`);
      const result = await cloneRepositorySecurely({
        url,
        branch,
        targetDir: repoPath,
        token: githubToken,
        depth: 1,
      });
      this.logger.log(`Clone result: success=${result.success}, error=${result.error || 'none'}`);

      if (!result.success) {
        this.logger.error(`Clone failed: ${result.error}`);
        throw new Error(result.error || 'Clone failed');
      }
      this.logger.log(`✅ Repository cloned successfully`);

      // Verify clone was successful
      this.logger.log(`Verifying clone at: ${repoPath}`);
      await access(repoPath);
      this.logger.log(`✅ Clone verified`);

      // Clean any sensitive data from git config
      this.logger.log(`Cleaning git config`);
      await cleanGitConfig(repoPath);
      this.logger.log(`✅ Git config cleaned`);

      // Store path for cleanup
      this.logger.log(`Storing repo path for cleanup`);
      this.repos.set(jobId, repoPath);
      this.logger.log(`✅ Path stored. Total tracked repos: ${this.repos.size}`);
      this.logger.log(`========== Repository clone completed ==========`);

      return repoPath;
    } catch (error) {
      this.logger.error(
        `Clone failed with error: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Mask any sensitive data in error messages
      const safeError = maskSensitiveData(error instanceof Error ? error.message : String(error));
      throw new Error(`Repository clone failed: ${safeError}`);
    }
  }

  async cleanup(jobId: string): Promise<void> {
    const repoPath = this.repos.get(jobId);

    if (!repoPath) {
      // Also try to clean up by convention
      const conventionalPath = join(this.tempDir, `job-${jobId}`);
      try {
        await access(conventionalPath);
        await rm(conventionalPath, { recursive: true, force: true });
      } catch {
        // Directory doesn't exist, nothing to clean
      }
      return;
    }

    try {
      await rm(repoPath, { recursive: true, force: true });
      this.repos.delete(jobId);
    } catch (_error) {
      // Continue - cleanup failures are not critical
    }
  }

  async cleanupAll(): Promise<void> {
    const cleanupPromises = Array.from(this.repos.keys()).map((jobId) => this.cleanup(jobId));

    await Promise.all(cleanupPromises);

    // Also try to clean the entire temp directory
    try {
      await rm(this.tempDir, { recursive: true, force: true });
    } catch (_error) {
      // Continue - temp directory cleanup failure is not critical
    }
  }
}

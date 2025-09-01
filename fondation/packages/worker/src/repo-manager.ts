import { rm, mkdir, access } from "node:fs/promises";
import { join } from "node:path";
import { cloneRepositorySecurely, cleanGitConfig } from "./git-operations";
import { maskSensitiveData } from "./encryption";

export class RepoManager {
  private repos = new Map<string, string>();
  
  constructor(private tempDir: string) {}
  
  async cloneRepo(url: string, branch: string, jobId: string, githubToken?: string): Promise<string> {
    const repoPath = join(this.tempDir, `job-${jobId}`);
    
    try {
      // Ensure temp directory exists
      await mkdir(this.tempDir, { recursive: true });
      
      // Clean up any existing directory for this job
      await this.cleanup(jobId);
      
      // Clone repository securely without exposing token in URL
      const result = await cloneRepositorySecurely({
        url,
        branch,
        targetDir: repoPath,
        token: githubToken,
        depth: 1,
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Clone failed');
      }
      
      // Verify clone was successful
      await access(repoPath);
      
      // Clean any sensitive data from git config
      await cleanGitConfig(repoPath);
      
      // Store path for cleanup
      this.repos.set(jobId, repoPath);
      return repoPath;
    } catch (error) {
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
    
    const cleanupPromises = Array.from(this.repos.keys()).map((jobId) =>
      this.cleanup(jobId)
    );
    
    await Promise.all(cleanupPromises);
    
    // Also try to clean the entire temp directory
    try {
      await rm(this.tempDir, { recursive: true, force: true });
    } catch (_error) {
      // Continue - temp directory cleanup failure is not critical
    }
  }
}
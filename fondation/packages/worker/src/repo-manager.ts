import { exec } from "node:child_process";
import { promisify } from "node:util";
import { rm, mkdir, access } from "node:fs/promises";
import { join } from "node:path";

const execAsync = promisify(exec);

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
      
      // Prepare clone URL with authentication if token is provided
      let cloneUrl = url;
      if (githubToken && url.includes('github.com')) {
        // Convert https://github.com/owner/repo.git to https://token@github.com/owner/repo.git
        cloneUrl = url.replace('https://github.com', `https://${githubToken}@github.com`);
      }
      
      // Clone the repository
      const cloneCommand = `git clone --depth 1 --branch ${branch} ${cloneUrl} ${repoPath}`;
      const { stdout, stderr } = await execAsync(cloneCommand, {
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: "0", // Disable git credential prompts
        },
      });
      
      if (stderr && !stderr.includes("Cloning into")) {
      }
      
      // Verify clone was successful
      await access(repoPath);
      
      // Store path for cleanup
      this.repos.set(jobId, repoPath);
      return repoPath;
    } catch (error) {
      throw new Error(`Repository clone failed: ${error instanceof Error ? error.message : String(error)}`);
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
import { exec } from "child_process";
import { promisify } from "util";
import { rm, mkdir, access } from "fs/promises";
import { join } from "path";

const execAsync = promisify(exec);

export class RepoManager {
  private repos = new Map<string, string>();
  
  constructor(private tempDir: string) {}
  
  async cloneRepo(url: string, branch: string, jobId: string): Promise<string> {
    const repoPath = join(this.tempDir, `job-${jobId}`);
    
    try {
      // Ensure temp directory exists
      await mkdir(this.tempDir, { recursive: true });
      
      // Clean up any existing directory for this job
      await this.cleanup(jobId);
      
      console.log(`📥 Cloning ${url} (branch: ${branch}) to ${repoPath}`);
      
      // Clone the repository
      const cloneCommand = `git clone --depth 1 --branch ${branch} ${url} ${repoPath}`;
      const { stdout, stderr } = await execAsync(cloneCommand, {
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: "0", // Disable git credential prompts
        },
      });
      
      if (stderr && !stderr.includes("Cloning into")) {
        console.warn(`⚠️  Git stderr: ${stderr}`);
      }
      
      // Verify clone was successful
      await access(repoPath);
      
      // Store path for cleanup
      this.repos.set(jobId, repoPath);
      
      console.log(`✅ Repository cloned successfully to ${repoPath}`);
      return repoPath;
    } catch (error) {
      console.error(`❌ Failed to clone repository:`, error);
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
        console.log(`🧹 Cleaned up job directory: ${conventionalPath}`);
      } catch {
        // Directory doesn't exist, nothing to clean
      }
      return;
    }
    
    try {
      await rm(repoPath, { recursive: true, force: true });
      this.repos.delete(jobId);
      console.log(`🧹 Cleaned up repository: ${repoPath}`);
    } catch (error) {
      console.error(`⚠️  Failed to cleanup repository ${repoPath}:`, error);
    }
  }
  
  async cleanupAll(): Promise<void> {
    console.log(`🧹 Cleaning up all ${this.repos.size} repositories...`);
    
    const cleanupPromises = Array.from(this.repos.keys()).map((jobId) =>
      this.cleanup(jobId)
    );
    
    await Promise.all(cleanupPromises);
    
    // Also try to clean the entire temp directory
    try {
      await rm(this.tempDir, { recursive: true, force: true });
      console.log(`🧹 Cleaned up temp directory: ${this.tempDir}`);
    } catch (error) {
      console.warn(`⚠️  Could not clean temp directory:`, error);
    }
  }
}
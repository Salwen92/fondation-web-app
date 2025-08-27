import { exec } from "child_process";
import { promisify } from "util";
import { resolve } from "path";
import { existsSync } from "fs";
import { CLIResult } from "@fondation/shared";

const execAsync = promisify(exec);

export class CLIExecutor {
  private cliPath: string;
  
  constructor() {
    // Path to our integrated Fondation CLI
    this.cliPath = resolve(__dirname, "../../cli");
  }
  
  async execute(
    repoPath: string,
    options: {
      prompt: string;
      onProgress?: (step: string) => Promise<void>;
    }
  ): Promise<CLIResult> {
    return new Promise(async (resolve, reject) => {
      console.log(`🚀 Executing Fondation CLI for: ${repoPath}`);
      console.log(`📦 CLI Path: ${this.cliPath}`);
      
      try {
        // Check if we have bundled CLI, otherwise use source files (like main branch)
        let analyzeCommand: string;
        const bundledCli = `${this.cliPath}/dist/cli.bundled.cjs`;
        
        if (existsSync(bundledCli)) {
          // Use bundled CLI (production)
          analyzeCommand = `cd ${this.cliPath} && node dist/cli.bundled.cjs analyze ${repoPath}`;
          console.log('🎯 Using bundled CLI for analyze command');
        } else {
          // Fallback to source files (development)
          analyzeCommand = `cd ${this.cliPath} && bun run src/analyze-all.ts ${repoPath}`;
          console.log('🛠️ Using Bun fallback for analyze command');
        }
        
        console.log(`⚙️  Command: ${analyzeCommand}`);
        
        const child = exec(analyzeCommand, {
          timeout: 3600000, // 60 minutes timeout
          maxBuffer: 50 * 1024 * 1024, // 50MB buffer
          env: {
            ...process.env,
            // Claude SDK uses its own authentication system
            CLAUDE_OUTPUT_DIR: `/tmp/outputs/${Date.now()}`,
          },
        });
        
        let stdout = "";
        let stderr = "";
        
        child.stdout?.on("data", (data) => {
          const text = data.toString();
          stdout += text;
          console.log(`[Fondation CLI] ${text.trim()}`);
          
          // Parse progress messages if they exist
          const lines = text.split("\n");
          for (const line of lines) {
            if (line.includes("[PROGRESS]") || line.includes("Step")) {
              const progress = line.replace("[PROGRESS]", "").trim();
              options.onProgress?.(progress).catch(console.error);
            }
          }
        });
        
        child.stderr?.on("data", (data) => {
          stderr += data.toString();
          console.error(`⚠️  Fondation CLI stderr: ${data.toString()}`);
        });
        
        child.on("error", (error) => {
          console.error(`❌ CLI spawn error:`, error);
          reject(new Error(`Failed to spawn Fondation CLI: ${error.message}`));
        });
        
        child.on("close", (code) => {
          if (code === 0) {
            console.log(`✅ Fondation CLI execution successful`);
            
            // Fondation CLI generates files rather than JSON output
            // We need to parse the generated files from the output directory
            resolve({
              success: true,
              documents: [], // Will be populated by parsing output files
              metadata: { 
                rawOutput: stdout,
                cliPath: this.cliPath,
                command: analyzeCommand
              },
            });
          } else {
            const errorMsg = `Fondation CLI exited with code ${code}: ${stderr || stdout}`;
            console.error(`❌ ${errorMsg}`);
            reject(new Error(errorMsg));
          }
        });
        
      } catch (error) {
        console.error(`❌ Failed to setup Fondation CLI execution:`, error);
        reject(error);
      }
    });
  }
}
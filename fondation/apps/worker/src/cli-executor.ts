import { spawn } from "child_process";
import { CLIResult } from "@fondation/shared";

export class CLIExecutor {
  constructor(private cliPath: string = "claude") {}
  
  async execute(
    repoPath: string,
    options: {
      prompt: string;
      onProgress?: (step: string) => Promise<void>;
    }
  ): Promise<CLIResult> {
    return new Promise((resolve, reject) => {
      console.log(`🚀 Executing CLI for: ${repoPath}`);
      console.log(`📝 Prompt: ${options.prompt.substring(0, 100)}...`);
      
      // Build Claude Code CLI command arguments
      // Uses --print for non-interactive output and --output-format json
      const args = [
        "--print",
        "--output-format", "json", 
        options.prompt + ` (working directory: ${repoPath})`
      ];
      
      console.log(`⚙️  Command: ${this.cliPath} ${args.join(" ")}`);
      
      const child = spawn(this.cliPath, args, {
        stdio: ["pipe", "pipe", "pipe"],
        cwd: repoPath,
        env: {
          ...process.env,
          // Claude CLI uses its own authentication system
        },
      });
      
      let stdout = "";
      let stderr = "";
      
      child.stdout.on("data", (data) => {
        const text = data.toString();
        stdout += text;
        
        // Parse progress messages if they exist
        const lines = text.split("\n");
        for (const line of lines) {
          if (line.includes("[PROGRESS]")) {
            const progress = line.replace("[PROGRESS]", "").trim();
            options.onProgress?.(progress);
          }
        }
      });
      
      child.stderr.on("data", (data) => {
        stderr += data.toString();
        console.error(`⚠️  CLI stderr: ${data.toString()}`);
      });
      
      child.on("error", (error) => {
        console.error(`❌ CLI spawn error:`, error);
        reject(new Error(`Failed to spawn CLI: ${error.message}`));
      });
      
      child.on("close", (code) => {
        if (code === 0) {
          try {
            // Parse JSON output
            const result = JSON.parse(stdout) as CLIResult;
            console.log(`✅ CLI execution successful`);
            resolve(result);
          } catch (error) {
            // If not JSON, return as-is
            console.log(`📄 CLI returned non-JSON output`);
            resolve({
              success: true,
              documents: [],
              metadata: { rawOutput: stdout },
            });
          }
        } else {
          const errorMsg = `CLI exited with code ${code}: ${stderr || stdout}`;
          console.error(`❌ ${errorMsg}`);
          reject(new Error(errorMsg));
        }
      });
    });
  }
}
/**
 * Development CLI Execution Strategy
 * 
 * Handles local CLI execution for development mode:
 * - Uses source TypeScript files with tsx/bun execution
 * - Leverages host Claude authentication (no environment variable required)
 * - Provides development-friendly error messages and debugging
 */

import { exec, spawn } from "node:child_process";
import { join, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import { CLIExecutionStrategy, CLIResult } from "./base-strategy.js";
import { dev } from "@fondation/shared/environment";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class DevelopmentCLIStrategy implements CLIExecutionStrategy {
  private cliPath: string;
  
  constructor(cliPath: string) {
    this.cliPath = cliPath;
  }
  
  getName(): string {
    return "Development CLI Strategy";
  }
  
  async validate(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    // Check if CLI source exists
    if (!this.cliPath) {
      errors.push("CLI path not configured");
      return { valid: false, errors };
    }
    
    // Check if source file exists (for TypeScript execution)
    if (this.cliPath.includes('src/cli.ts') && !existsSync(this.cliPath)) {
      errors.push(`CLI source file not found: ${this.cliPath}`);
    }
    
    // Check if bundled file exists (fallback)
    if (this.cliPath.includes('dist/cli.bundled.mjs') && !existsSync(this.cliPath)) {
      errors.push(`CLI bundled file not found: ${this.cliPath}`);
    }
    
    // Check for Claude authentication - in development, we prefer host auth
    try {
      // First check if Claude is authenticated on host
      const { stdout } = await execAsync('bunx claude --help');
      console.log('✅ Claude CLI available on host');
    } catch (error) {
      // Check for environment variable as fallback
      if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) {
        errors.push(
          "Claude authentication not found. Either authenticate with 'bunx claude auth' or set CLAUDE_CODE_OAUTH_TOKEN"
        );
      }
    }
    
    // Check for required tools
    try {
      await execAsync('bun --version');
    } catch (error) {
      errors.push("Bun runtime not available for development execution");
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  async execute(
    repoPath: string,
    options: {
      prompt: string;
      onProgress?: (step: string) => Promise<void>;
    }
  ): Promise<CLIResult> {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('🔧 Development Mode: Executing CLI locally');
        console.log('📁 Repository path:', repoPath);
        console.log('🚀 CLI path:', this.cliPath);
        
        // Determine execution command based on CLI path
        const cliPackageDir = resolvePath(join(__dirname, '../../../../cli'));
        let command: string;
        if (this.cliPath.includes('src/cli.ts')) {
          // Execute TypeScript source directly with Bun
          command = `cd "${cliPackageDir}" && bun src/cli.ts analyze "${repoPath}" --profile development`;
          console.log('💻 Using TypeScript source execution');
        } else {
          // Execute bundled version with Bun
          command = `cd "${cliPackageDir}" && bun dist/cli.bundled.mjs analyze "${repoPath}" --profile development`;
          console.log('📦 Using bundled execution');
        }
        
        console.log('🔨 Command:', command);
        
        // Track the 6-step analysis workflow (French UI)
        const workflowSteps = [
          "Extraction des abstractions",
          "Analyse des relations", 
          "Ordonnancement des chapitres",
          "Génération des chapitres",
          "Révision des chapitres",
          "Création des tutoriels"
        ];
        
        const child = spawn('sh', ['-c', command], {
          env: {
            ...process.env,
            // In development, let CLI use host authentication or environment variables
            NODE_ENV: 'development',
            FONDATION_MODE: 'development'
          },
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        // Set development-friendly timeout (longer for debugging)
        const timeout = setTimeout(() => {
          console.log('⏰ Development execution timeout - killing process');
          child.kill('SIGTERM');
        }, 7200000); // 2 hours for development debugging
        
        let stdout = "";
        let stderr = "";
        let hasFinished = false;
        
        child.stdout?.on("data", (data) => {
          const text = data.toString();
          stdout += text;
          
          // Development-friendly progress parsing
          const lines = text.split("\n");
          for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Parse JSON logs with development context
            if (trimmedLine.startsWith("{") && trimmedLine.includes('"msg"')) {
              try {
                const logData = JSON.parse(trimmedLine);
                const msg = logData.msg || "";
                
                // Map log messages to progress steps (French UI)
                if (msg.includes("Starting codebase analysis")) {
                  options.onProgress?.("Étape 1/6: Initialisation de l'analyse").catch(console.error);
                } else if (msg.includes("Extracting core abstractions")) {
                  options.onProgress?.("Étape 1/6: Extraction des abstractions").catch(console.error);
                } else if (msg.includes("Analyzing relationships")) {
                  options.onProgress?.("Étape 2/6: Analyse des relations").catch(console.error);
                } else if (msg.includes("Determining optimal chapter order")) {
                  options.onProgress?.("Étape 3/6: Ordonnancement des chapitres").catch(console.error);
                } else if (msg.includes("Generating chapter content")) {
                  options.onProgress?.("Étape 4/6: Génération des chapitres").catch(console.error);
                } else if (msg.includes("Reviewing and enhancing")) {
                  options.onProgress?.("Étape 5/6: Révision des chapitres").catch(console.error);
                } else if (msg.includes("Analysis complete")) {
                  options.onProgress?.("Étape 6/6: Finalisation de l'analyse").catch(console.error);
                }
              } catch (err) {
                // Development: Log parsing errors for debugging
                if (dev.allows('debug_logging')) {
                  console.debug('🐛 Non-JSON log line (dev):', trimmedLine);
                }
              }
            }
            
            // Development-specific progress patterns
            if (trimmedLine.includes("[DEV-PROGRESS]") || trimmedLine.includes("[PROGRESS]")) {
              const progress = trimmedLine.replace(/\[(DEV-)?PROGRESS\]/, "").trim();
              options.onProgress?.(progress).catch(console.error);
            }
            
            // Log interesting lines in development mode
            if (dev.allows('debug_logging') && (
              trimmedLine.includes("Generating") || 
              trimmedLine.includes("Analyzing") || 
              trimmedLine.includes("Processing")
            )) {
              console.log('📋 Dev CLI Output:', trimmedLine);
            }
          }
        });
        
        child.stderr?.on("data", (data) => {
          const text = data.toString();
          stderr += text;
          
          // In development, log stderr immediately for debugging
          if (dev.allows('debug_logging')) {
            console.error('🔍 Dev CLI Stderr:', text);
          }
        });
        
        child.on("error", (error) => {
          if (!hasFinished) {
            hasFinished = true;
            clearTimeout(timeout);
            reject(new Error(`Development CLI execution failed: ${error.message}`));
          }
        });
        
        child.on("exit", (code, signal) => {
          if (!hasFinished && (code !== 0 || signal)) {
            hasFinished = true;
            clearTimeout(timeout);
            
            let errorMsg = `Development CLI execution failed with exit code ${code}`;
            if (signal) {
              errorMsg = `Development CLI process killed with signal ${signal}`;
            }
            
            // Add development-specific debugging information
            errorMsg += `\n\n🔍 Development Debug Info:`;
            errorMsg += `\n- CLI Path: ${this.cliPath}`;
            errorMsg += `\n- Command: ${command}`;
            errorMsg += `\n- Working Directory: ${process.cwd()}`;
            errorMsg += `\n- Environment: development`;
            errorMsg += `\n\n📋 Stdout: ${stdout || 'None'}`;
            errorMsg += `\n\n🚨 Stderr: ${stderr || 'None'}`;
            
            // Add specific troubleshooting for development
            if (stderr.includes('auth') || stdout.includes('auth')) {
              errorMsg += `\n\n🔑 Authentication Issue: Try running 'bunx claude auth' to authenticate Claude CLI`;
            }
            
            if (stderr.includes('ENOENT') || stderr.includes('command not found')) {
              errorMsg += `\n\n📁 Path Issue: Check if CLI files exist and bun is available in PATH`;
            }
            
            reject(new Error(errorMsg));
          }
        });
        
        child.on("close", async (code) => {
          if (!hasFinished) {
            hasFinished = true;
            clearTimeout(timeout);
            
            if (code === 0) {
              console.log('✅ Development CLI execution completed successfully');
              
              // Parse output files (reuse parsing logic from original CLI executor)
              const documents = await this.parseOutputFiles(repoPath);
              
              resolve({
                success: true,
                documents,
                metadata: { 
                  strategy: 'development',
                  rawOutput: stdout,
                  cliPath: this.cliPath,
                  command,
                  documentsCount: documents?.length || 0
                },
              });
            } else {
              const errorMsg = `Development CLI completed with error code ${code}: ${stderr || stdout || 'No output captured'}`;
              reject(new Error(errorMsg));
            }
          }
        });
        
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Parse generated files from .claude-tutorial-output directory
   */
  private async parseOutputFiles(repoPath: string): Promise<CLIResult['documents']> {
    const { OutputParser } = await import('./output-parser.js');
    return OutputParser.parseOutputFiles(repoPath);
  }
}
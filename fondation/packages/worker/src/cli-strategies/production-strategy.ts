/**
 * Production CLI Execution Strategy
 * 
 * Handles containerized CLI execution for production mode:
 * - Enforces Docker container environment requirements
 * - Uses environment variable-based authentication
 * - Executes bundled CLI with strict validation
 * - Maintains current production behavior exactly
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { CLIExecutionStrategy, CLIResult } from "./base-strategy.js";

export class ProductionCLIStrategy implements CLIExecutionStrategy {
  private cliPath: string;
  
  constructor(cliPath: string) {
    this.cliPath = cliPath;
  }
  
  getName(): string {
    return "Production CLI Strategy";
  }
  
  async validate(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    // ENFORCE CONTAINER ARCHITECTURE: Worker MUST run inside Docker container
    const isInsideDocker = process.env.DOCKER_CONTAINER === 'true' || 
                          existsSync('/.dockerenv');
    
    if (!isInsideDocker) {
      errors.push(
        "ARCHITECTURE VIOLATION: Worker must run inside Docker container. " +
        "Set DOCKER_CONTAINER=true or run worker using docker-compose. " +
        "External Docker spawning is not supported to maintain consistent architecture."
      );
    }
    
    // Validate required environment variables for Claude integration
    if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) {
      errors.push(
        "CLAUDE_CODE_OAUTH_TOKEN environment variable is required for CLI analysis. " +
        "Ensure the Docker container is started with proper authentication tokens."
      );
    }
    
    // Validate CLI bundle exists
    if (!this.cliPath || !this.cliPath.includes('/app/packages/cli/dist/')) {
      errors.push("Production mode requires bundled CLI path at /app/packages/cli/dist/");
    }
    
    if (!existsSync(this.cliPath)) {
      errors.push(`Production CLI bundle not found: ${this.cliPath}`);
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
        console.log('🐳 Production Mode: Executing CLI in Docker container');
        console.log('📁 Repository path:', repoPath);
        console.log('🚀 CLI path:', this.cliPath);
        
        // Use production Docker command - exactly as in original implementation
        const analyzeCommand = `cd /app/cli && HOME=/home/worker NODE_PATH=/app/node_modules stdbuf -o0 -e0 timeout 3600 bun dist/cli.bundled.mjs analyze "${repoPath}" --profile production`;
        
        console.log('🔨 Production command:', analyzeCommand);
        
        // Track the 6-step analysis workflow (French UI)
        const workflowSteps = [
          "Extraction des abstractions",
          "Analyse des relations", 
          "Ordonnancement des chapitres",
          "Génération des chapitres",
          "Révision des chapitres",
          "Création des tutoriels"
        ];
        let _currentStepIndex = 0;
        
        const child = spawn('sh', ['-c', analyzeCommand], {
          env: {
            ...process.env,
            HOME: '/home/worker',
            NODE_PATH: '/app/node_modules',
            // Let CLI use default .claude-tutorial-output directory in repo
          },
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        // Production timeout (1 hour)
        const timeout = setTimeout(() => {
          child.kill('SIGTERM');
        }, 3600000);
        
        let stdout = "";
        let stderr = "";
        let hasFinished = false;
        
        child.stdout?.on("data", (data) => {
          const text = data.toString();
          stdout += text;
          
          // Parse progress messages from CLI output - same as original
          const lines = text.split("\n");
          for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Try to parse JSON logs from Docker container
            if (trimmedLine.startsWith("{") && trimmedLine.includes('"msg"')) {
              try {
                const logData = JSON.parse(trimmedLine);
                const msg = logData.msg || "";
                
                // Map Docker log messages to progress steps (French UI)
                if (msg.includes("Starting codebase analysis")) {
                  options.onProgress?.("Étape 0/6: Initialisation de l'analyse").catch(console.error);
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
                // Not valid JSON, fall through to other parsing patterns
                if (process.env.DEBUG) {
                  console.debug('Non-JSON log line:', trimmedLine);
                }
              }
            }
            
            // Production progress patterns - same as original
            if (trimmedLine.includes("[PROGRESS]")) {
              const progress = trimmedLine.replace("[PROGRESS]", "").trim();
              options.onProgress?.(progress).catch(console.error);
            } else if (trimmedLine.match(/^Step \d+:/i)) {
              const stepMatch = trimmedLine.match(/^Step (\d+):/i);
              if (stepMatch) {
                const stepNum = Number.parseInt(stepMatch[1], 10) - 1;
                if (stepNum >= 0 && stepNum < workflowSteps.length) {
                  _currentStepIndex = stepNum;
                  const progressMsg = `Étape ${stepNum + 1}/6: ${workflowSteps[stepNum]}`;
                  options.onProgress?.(progressMsg).catch(console.error);
                }
              }
            } else if (trimmedLine.includes("Generating") || 
                      trimmedLine.includes("Analyzing") || 
                      trimmedLine.includes("Processing") ||
                      trimmedLine.includes("Creating") ||
                      trimmedLine.includes("Reviewing") ||
                      trimmedLine.includes("Extracting")) {
              // Detect action words and map to workflow steps
              for (let i = 0; i < workflowSteps.length; i++) {
                if (trimmedLine.toLowerCase().includes(workflowSteps[i].toLowerCase().split(" ")[0])) {
                  _currentStepIndex = i;
                  const progressMsg = `Étape ${i + 1}/6: ${workflowSteps[i]}`;
                  options.onProgress?.(progressMsg).catch(console.error);
                  break;
                }
              }
            } else if (trimmedLine.match(/^\d+\/\d+/)) {
              // Progress indicators like "3/6 completed"
              options.onProgress?.(trimmedLine).catch(console.error);
            }
          }
        });
        
        child.stderr?.on("data", (data) => {
          const text = data.toString();
          stderr += text;
        });
        
        child.on("error", (error) => {
          if (!hasFinished) {
            hasFinished = true;
            clearTimeout(timeout);
            reject(new Error(`Failed to spawn Fondation CLI: ${error.message}`));
          }
        });
        
        // Handle unexpected exits - same as original
        child.on("exit", (code, signal) => {
          if (!hasFinished && (code !== 0 || signal)) {
            hasFinished = true;
            clearTimeout(timeout);
            
            let errorMsg = '';
            if (signal) {
              if (signal === 'SIGTERM') {
                errorMsg = `CLI process timed out after 1 hour and was terminated. This may indicate authentication issues or complex repository analysis.`;
              } else {
                errorMsg = `CLI process killed with signal ${signal}.`;
              }
            } else if (code === 124) {
              errorMsg = `CLI process timed out after 1 hour. This may indicate authentication hanging or very complex repository analysis.`;
            } else {
              errorMsg = `CLI process exited with code ${code}.`;
            }
            
            // Add output for debugging
            errorMsg += `\nStderr: ${stderr || 'None'}\nStdout: ${stdout || 'None'}`;
            
            // Add specific troubleshooting for common issues
            if (stderr.includes('auth') || stdout.includes('auth')) {
              errorMsg += `\n\nAuthentication Issue Detected: Ensure CLAUDE_CODE_OAUTH_TOKEN is properly set and valid.`;
            }
            
            reject(new Error(errorMsg));
          }
        });
        
        child.on("close", async (code) => {
          if (!hasFinished) {
            hasFinished = true;
            clearTimeout(timeout);
            
            if (code === 0) {
              console.log('✅ Production CLI execution completed successfully');
              
              // Parse the generated files from the output directory with timeout
              let documents: CLIResult['documents'] = [];
              try {
                const parsePromise = this.parseOutputFiles(repoPath);
                const timeoutPromise = new Promise<CLIResult['documents']>((_, reject) => {
                  setTimeout(() => reject(new Error('parseOutputFiles timeout after 30s')), 30000);
                });
                
                documents = await Promise.race([parsePromise, timeoutPromise]);
              } catch (parseError) {
                console.warn('Failed to parse output files (continuing with empty results):', 
                  parseError instanceof Error ? parseError.message : parseError);
                // Continue with empty documents array - CLI execution succeeded but parsing failed
              }
              
              resolve({
                success: true,
                documents,
                metadata: { 
                  strategy: 'production',
                  rawOutput: stdout,
                  cliPath: this.cliPath,
                  command: analyzeCommand,
                  documentsCount: documents?.length || 0
                },
              });
            } else {
              const errorMsg = `Fondation CLI exited with code ${code}: ${stderr || stdout || 'No output captured'}`;
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
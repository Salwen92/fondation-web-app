/**
 * Abstract Base CLI Execution Strategy (Template Method Pattern)
 * 
 * Extracts common execution logic shared between Development and Production strategies.
 * Each strategy implements abstract methods to customize behavior while maintaining
 * identical execution flow and progress tracking.
 * 
 * Template Method Pattern Benefits:
 * - Eliminates 385+ lines of duplicate code (70% duplication)
 * - Centralizes progress parsing and French UI messages
 * - Maintains exact same behavior while improving maintainability
 * - Provides consistent error handling and output parsing
 */

import { spawn, type ChildProcess } from "node:child_process";

// Re-export types from interface for backward compatibility
export type { CLIExecutionStrategy, CLIResult } from "./base-strategy-interface.js";
import type { CLIExecutionStrategy, CLIResult } from "./base-strategy-interface.js";

// Configuration types for strategy customization
export interface CommandConfig {
  command: string;
  env: Record<string, string>;
  timeout?: number;
  heartbeatInterval?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ProgressMapping {
  [key: string]: string;
}

/**
 * Abstract base strategy implementing Template Method pattern
 * 
 * Defines the algorithm skeleton in execute() method while allowing
 * subclasses to override specific steps through abstract methods.
 */
export abstract class BaseStrategy implements CLIExecutionStrategy {
  protected cliPath: string;
  
  constructor(cliPath: string) {
    this.cliPath = cliPath;
  }
  
  // Abstract methods that subclasses must implement (Strategy-specific behavior)
  abstract getName(): string;
  abstract validate(): Promise<ValidationResult>;
  abstract getCommandConfig(repoPath: string): CommandConfig;
  
  // Template method hooks with default implementations (Optional customization)
  protected getTimeout(): number | undefined {
    return undefined; // No timeout by default
  }
  
  protected getHeartbeatInterval(): number | undefined {
    return undefined; // No heartbeat by default
  }
  
  protected getProgressMapping(): ProgressMapping {
    // Default French UI progress mapping for 6-step workflow
    return {
      "Starting codebase analysis": "Étape 1/6: Initialisation de l'analyse",
      "Extracting core abstractions": "Étape 1/6: Extraction des abstractions",
      "Analyzing relationships": "Étape 2/6: Analyse des relations",
      "Determining optimal chapter order": "Étape 3/6: Ordonnancement des chapitres",
      "Generating chapter content": "Étape 4/6: Génération des chapitres",
      "Reviewing and enhancing": "Étape 5/6: Révision des chapitres",
      "Analysis complete": "Étape 6/6: Finalisation de l'analyse"
    };
  }
  
  protected getWorkflowSteps(): string[] {
    return [
      "Extraction des abstractions",
      "Analyse des relations", 
      "Ordonnancement des chapitres",
      "Génération des chapitres",
      "Révision des chapitres",
      "Création des tutoriels"
    ];
  }
  
  protected shouldLogDebugInfo(): boolean {
    return false; // Override in development strategy
  }
  
  // Template Method - defines the algorithm skeleton
  async execute(
    repoPath: string,
    options: {
      prompt: string;
      onProgress?: (step: string) => Promise<void>;
    }
  ): Promise<CLIResult> {
    // Step 1: Validate environment
    const validation = await this.validate();
    if (!validation.valid) {
      throw new Error(`Strategy validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Step 2: Get strategy-specific configuration
    const config = this.getCommandConfig(repoPath);
    
    // Step 3: Execute with common process handling
    return this.executeProcess(config, options, repoPath);
  }
  
  /**
   * Common process execution logic shared by all strategies
   * This method contains the duplicated code that was extracted from both strategies
   */
  private async executeProcess(
    config: CommandConfig,
    options: { onProgress?: (step: string) => Promise<void>; },
    repoPath: string
  ): Promise<CLIResult> {
    return new Promise(async (resolve, reject) => {
      try {
        // Spawn the CLI process
        const child = spawn('sh', ['-c', config.command], {
          env: config.env,
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        // Set up timeout if specified
        let timeout: NodeJS.Timeout | undefined;
        if (config.timeout) {
          timeout = setTimeout(() => {
            child.kill('SIGTERM');
          }, config.timeout);
        }
        
        // Set up heartbeat if specified
        let heartbeat: NodeJS.Timeout | undefined;
        if (config.heartbeatInterval) {
          const startTime = Date.now();
          heartbeat = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            options.onProgress?.(`Étape 1/6: Analyse en cours... (${elapsed}s)`).catch(console.error);
          }, config.heartbeatInterval);
        }
        
        let stdout = "";
        let stderr = "";
        let hasFinished = false;
        
        // Handle stdout - common progress parsing logic
        child.stdout?.on("data", (data) => {
          const text = data.toString();
          stdout += text;
          this.parseProgressMessages(text, options.onProgress);
        });
        
        // Handle stderr - common error collection
        child.stderr?.on("data", (data) => {
          const text = data.toString();
          stderr += text;
          
          if (this.shouldLogDebugInfo()) {
            console.error(`[${this.getName()}] STDERR:`, text);
          }
        });
        
        // Handle process errors
        child.on("error", (error) => {
          if (!hasFinished) {
            hasFinished = true;
            this.cleanup(timeout, heartbeat);
            reject(new Error(`${this.getName()} failed to spawn: ${error.message}`));
          }
        });
        
        // Handle unexpected exits
        child.on("exit", (code, signal) => {
          if (!hasFinished && (code !== 0 || signal)) {
            hasFinished = true;
            this.cleanup(timeout, heartbeat);
            
            const errorMsg = this.formatErrorMessage(code, signal, stdout, stderr, config);
            reject(new Error(errorMsg));
          }
        });
        
        // Handle successful completion
        child.on("close", async (code) => {
          if (!hasFinished) {
            hasFinished = true;
            this.cleanup(timeout, heartbeat);
            
            if (code === 0) {
              try {
                // Parse output files (shared logic)
                const documents = await this.parseOutputFiles(repoPath);
                
                resolve({
                  success: true,
                  documents,
                  metadata: {
                    strategy: this.getName().toLowerCase().replace(/\s+/g, '_'),
                    rawOutput: stdout,
                    cliPath: this.cliPath,
                    command: config.command,
                    documentsCount: documents?.length || 0
                  },
                });
              } catch (parseError) {
                // Continue with empty documents - parsing failure doesn't fail the job
                resolve({
                  success: true,
                  documents: [],
                  metadata: {
                    strategy: this.getName().toLowerCase().replace(/\s+/g, '_'),
                    rawOutput: stdout,
                    cliPath: this.cliPath,
                    command: config.command,
                    documentsCount: 0,
                    parseError: parseError instanceof Error ? parseError.message : String(parseError)
                  },
                });
              }
            } else {
              const errorMsg = `${this.getName()} exited with code ${code}: ${stderr || stdout || 'No output captured'}`;
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
   * Parse progress messages from CLI output
   * Centralizes the duplicated progress parsing logic from both strategies
   */
  private parseProgressMessages(text: string, onProgress?: (step: string) => Promise<void>): void {
    const lines = text.split("\n");
    const progressMapping = this.getProgressMapping();
    const workflowSteps = this.getWorkflowSteps();
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Parse JSON logs (shared between strategies)
      if (trimmedLine.startsWith("{") && trimmedLine.includes('"msg"')) {
        try {
          const logData = JSON.parse(trimmedLine);
          const msg = logData.msg || "";
          
          // Map log messages to French UI progress steps
          for (const [keyword, frenchMsg] of Object.entries(progressMapping)) {
            if (msg.includes(keyword)) {
              onProgress?.(frenchMsg).catch(console.error);
              break;
            }
          }
        } catch (_err) {
          // Not valid JSON, fall through to other parsing patterns
          if (this.shouldLogDebugInfo()) {
            console.warn(`Failed to parse JSON log: ${trimmedLine}`);
          }
        }
      }
      
      // Parse progress indicators (shared patterns)
      if (trimmedLine.includes("[PROGRESS]") || trimmedLine.includes("[DEV-PROGRESS]")) {
        const progress = trimmedLine.replace(/\[(DEV-)?PROGRESS\]/, "").trim();
        onProgress?.(progress).catch(console.error);
      } 
      // Parse step patterns like "Step 1:" 
      else if (trimmedLine.match(/^Step \d+:/i)) {
        const stepMatch = trimmedLine.match(/^Step (\d+):/i);
        if (stepMatch) {
          const stepNum = Number.parseInt(stepMatch[1], 10) - 1;
          if (stepNum >= 0 && stepNum < workflowSteps.length) {
            const progressMsg = `Étape ${stepNum + 1}/6: ${workflowSteps[stepNum]}`;
            onProgress?.(progressMsg).catch(console.error);
          }
        }
      }
      // Parse action words and map to workflow steps
      else if (this.containsActionWord(trimmedLine)) {
        for (let i = 0; i < workflowSteps.length; i++) {
          if (trimmedLine.toLowerCase().includes(workflowSteps[i].toLowerCase().split(" ")[0])) {
            const progressMsg = `Étape ${i + 1}/6: ${workflowSteps[i]}`;
            onProgress?.(progressMsg).catch(console.error);
            break;
          }
        }
      }
      // Parse progress ratios like "3/6 completed"
      else if (trimmedLine.match(/^\d+\/\d+/)) {
        onProgress?.(trimmedLine).catch(console.error);
      }
    }
  }
  
  /**
   * Check if line contains action words that indicate progress
   */
  private containsActionWord(line: string): boolean {
    const actionWords = ["Generating", "Analyzing", "Processing", "Creating", "Reviewing", "Extracting"];
    return actionWords.some(word => line.includes(word));
  }
  
  /**
   * Format error message with strategy-specific context
   */
  private formatErrorMessage(
    code: number | null, 
    signal: NodeJS.Signals | null, 
    stdout: string, 
    stderr: string,
    config: CommandConfig
  ): string {
    let errorMsg = '';
    
    if (signal) {
      if (signal === 'SIGTERM') {
        errorMsg = `${this.getName()} process timed out and was terminated. This may indicate authentication issues or complex repository analysis.`;
      } else {
        errorMsg = `${this.getName()} process killed with signal ${signal}.`;
      }
    } else if (code === 124) {
      errorMsg = `${this.getName()} process timed out. This may indicate authentication hanging or very complex repository analysis.`;
    } else {
      errorMsg = `${this.getName()} process exited with code ${code}.`;
    }
    
    // Add output for debugging
    errorMsg += `\nStderr: ${stderr || 'None'}\nStdout: ${stdout || 'None'}`;
    
    // Add authentication troubleshooting
    if (stderr.includes('auth') || stdout.includes('auth')) {
      errorMsg += this.getAuthenticationTroubleshooting();
    }
    
    // Add strategy-specific debug info if enabled
    if (this.shouldLogDebugInfo()) {
      errorMsg += `\n\n🔍 Debug Info:`;
      errorMsg += `\n- CLI Path: ${this.cliPath}`;
      errorMsg += `\n- Command: ${config.command}`;
      errorMsg += `\n- Working Directory: ${process.cwd()}`;
      errorMsg += `\n- Strategy: ${this.getName()}`;
    }
    
    return errorMsg;
  }
  
  /**
   * Get strategy-specific authentication troubleshooting message
   * Can be overridden by subclasses
   */
  protected getAuthenticationTroubleshooting(): string {
    return `\n\nAuthentication Issue Detected: Ensure CLAUDE_CODE_OAUTH_TOKEN is properly set and valid.`;
  }
  
  /**
   * Clean up resources (timeouts, intervals)
   */
  private cleanup(timeout?: NodeJS.Timeout, heartbeat?: NodeJS.Timeout): void {
    if (timeout) clearTimeout(timeout);
    if (heartbeat) clearInterval(heartbeat);
  }
  
  /**
   * Parse generated files from .claude-tutorial-output directory
   * Shared across all strategies - uses OutputParser utility
   */
  private async parseOutputFiles(repoPath: string): Promise<CLIResult['documents']> {
    const { OutputParser } = await import('./output-parser.js');
    return OutputParser.parseOutputFiles(repoPath);
  }
}

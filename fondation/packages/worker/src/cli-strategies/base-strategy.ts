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

import { spawn } from 'node:child_process';
import { DebugLogger, isDevelopment } from '../utils/environment.js';

// Re-export types from interface for backward compatibility
export type { CLIExecutionStrategy, CLIResult } from './base-strategy-interface';

import type { CLIExecutionStrategy, CLIResult } from './base-strategy-interface';

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
  warnings?: string[];
}

/**
 * Abstract base strategy implementing Template Method pattern
 *
 * Defines the algorithm skeleton in execute() method while allowing
 * subclasses to override specific steps through abstract methods.
 */
export abstract class BaseStrategy implements CLIExecutionStrategy {
  protected cliPath: string;
  private stdoutBuffer: string = ''; // Buffer for incomplete JSON lines
  protected logger: DebugLogger;

  constructor(cliPath: string) {
    this.cliPath = cliPath;
    this.logger = new DebugLogger('BaseStrategy');
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

  protected shouldLogDebugInfo(): boolean {
    return false; // Override in development strategy
  }

  // Template Method - defines the algorithm skeleton
  async execute(
    repoPath: string,
    options: {
      prompt: string;
      onProgress?: (step: string) => Promise<void>;
    },
  ): Promise<CLIResult> {
    // Reset buffer for each execution to prevent cross-job contamination
    this.stdoutBuffer = '';

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
    options: { onProgress?: (step: string) => Promise<void> },
    repoPath: string,
  ): Promise<CLIResult> {
    this.logger.log(`========== Starting process execution ==========`);
    this.logger.log(`Strategy: ${this.getName()}`);
    this.logger.log(`Command: ${config.command}`);
    this.logger.log(`Repo path: ${repoPath}`);
    this.logger.log(`Timeout: ${config.timeout || 'none'}`);
    this.logger.log(`Heartbeat interval: ${config.heartbeatInterval || 'none'}`);
    this.logger.log(`Environment variables count: ${Object.keys(config.env).length}`);

    return new Promise(async (resolve, reject) => {
      try {
        this.logger.log(`Spawning CLI process`);
        // Spawn the CLI process
        // In development, run from repository directory for proper path resolution
        // In production, use default working directory (container's workdir)
        const spawnOptions: any = {
          env: config.env,
          stdio: ['pipe', 'pipe', 'pipe'],
        };

        if (isDevelopment()) {
          spawnOptions.cwd = repoPath; // Only set cwd in development
        }

        const child = spawn('sh', ['-c', config.command], spawnOptions);
        this.logger.log(`✅ CLI process spawned with PID: ${child.pid}`);

        // Set up timeout if specified
        let timeout: NodeJS.Timeout | undefined;
        if (config.timeout) {
          this.logger.log(`Setting up timeout: ${config.timeout}ms`);
          timeout = setTimeout(() => {
            this.logger.log(`⏰ Timeout reached, terminating process`);
            child.kill('SIGTERM');
          }, config.timeout);
        }

        // Set up heartbeat if specified (tracking only, no progress interference)
        let heartbeat: NodeJS.Timeout | undefined;
        let lastProgressMessage = '';
        let lastProgressTime = 0;
        let hasReceivedCliProgress = false; // Track if we've received any real CLI progress
        if (config.heartbeatInterval) {
          this.logger.log(`Setting up heartbeat: ${config.heartbeatInterval}ms`);
          const startTime = Date.now();
          heartbeat = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            this.logger.debug(`♥ Heartbeat: ${elapsed}s elapsed`);

            // Only send heartbeat progress if:
            // 1. We haven't received any real CLI progress yet (initial state)
            // 2. AND it's been more than 30 seconds since last activity
            const timeSinceLastProgress = Date.now() - lastProgressTime;
            if (!hasReceivedCliProgress && timeSinceLastProgress > 30000) {
              // 30 seconds of silence
              options
                .onProgress?.(`Étape 1/6: Analyse en cours... (${elapsed}s)`)
                .catch(console.error);
            }
          }, config.heartbeatInterval);
        }

        let stdout = '';
        let stderr = '';
        let hasFinished = false;

        // Handle stdout - common progress parsing logic
        child.stdout?.on('data', (data) => {
          const text = data.toString();
          if (isDevelopment()) {
            const timestamp = new Date().toISOString();
            this.logger.debug(
              `[${timestamp}] STDOUT chunk: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`,
            );

            // Log specific patterns we care about
            if (text.includes('Prompt completed')) {
              this.logger.debug(`[${timestamp}] 🎯 PROMPT COMPLETED DETECTED`);
            }
            if (text.includes('Claude Code SDK Message')) {
              this.logger.debug(`[${timestamp}] 📨 SDK Message received`);
            }
            if (text.includes('Analysis complete')) {
              this.logger.debug(`[${timestamp}] ✅ ANALYSIS COMPLETE DETECTED`);
            }
            if (text.includes('error') || text.includes('Error')) {
              this.logger.debug(
                `[${timestamp}] ⚠️  ERROR DETECTED in stdout: ${text.substring(0, 200)}`,
              );
            }
          }

          stdout += text;

          // Buffer stdout to prevent JSON message splitting across chunks
          this.stdoutBuffer += text;
          const lines = this.stdoutBuffer.split('\n');

          // Keep the last potentially incomplete line in buffer
          this.stdoutBuffer = lines.pop() || '';

          // Wrap onProgress to track when real progress messages are received
          const progressCallback = options.onProgress
            ? async (message: string) => {
                // Prevent duplicate progress messages
                if (message !== lastProgressMessage) {
                  lastProgressMessage = message;
                  lastProgressTime = Date.now();
                  hasReceivedCliProgress = true; // Mark that we've received real CLI progress
                  await options.onProgress!(message);
                }
              }
            : undefined;

          // Process complete lines only to prevent malformed JSON parsing
          for (const line of lines) {
            if (line.trim()) {
              // Import and use ProgressHandler directly here
              import('../progress-handler.js')
                .then(({ ProgressHandler }) => {
                  const progressInfo = ProgressHandler.processProgress(line);
                  if (progressInfo && progressCallback) {
                    const uiMessage = ProgressHandler.formatForUI(progressInfo);
                    progressCallback(uiMessage);
                  }
                })
                .catch(console.error);
            }
          }
        });

        // Handle stderr - common error collection
        child.stderr?.on('data', (data) => {
          const text = data.toString();
          this.logger.debug(
            `STDERR chunk: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`,
          );
          stderr += text;

          if (this.shouldLogDebugInfo()) {
            console.error(`[${this.getName()}] STDERR:`, text);
          }
        });

        // Handle process errors
        child.on('error', (error) => {
          this.logger.error(`Process error: ${error.message}`);
          if (!hasFinished) {
            hasFinished = true;
            this.cleanup(timeout, heartbeat);
            reject(new Error(`${this.getName()} failed to spawn: ${error.message}`));
          }
        });

        // Handle unexpected exits
        child.on('exit', (code, signal) => {
          this.logger.log(`Process exit: code=${code}, signal=${signal}`);
          if (!hasFinished && (code !== 0 || signal)) {
            hasFinished = true;
            this.cleanup(timeout, heartbeat);
            this.logger.error(`Process exited unexpectedly`);

            const errorMsg = this.formatErrorMessage(code, signal, stdout, stderr, config);
            reject(new Error(errorMsg));
          }
        });

        // Handle successful completion
        child.on('close', async (code) => {
          const timestamp = new Date().toISOString();
          this.logger.log(`[${timestamp}] Process close: code=${code}`);
          if (!hasFinished) {
            hasFinished = true;
            this.cleanup(timeout, heartbeat);

            if (code === 0) {
              this.logger.log(`[${timestamp}] ✅ Process completed successfully`);
              this.logger.debug(`[${timestamp}] Final stdout length: ${stdout.length}`);
              this.logger.debug(`[${timestamp}] Final stderr length: ${stderr.length}`);
              try {
                this.logger.debug(`[${timestamp}] Parsing output files from: ${repoPath}`);
                // Parse output files (shared logic)
                const documents = await this.parseOutputFiles(repoPath);
                this.logger.log(`[${timestamp}] ✅ Parsed ${documents?.length || 0} documents`);

                this.logger.log(`========== Process execution completed successfully ==========`);
                resolve({
                  success: true,
                  documents,
                  metadata: {
                    strategy: this.getName().toLowerCase().replace(/\s+/g, '_'),
                    rawOutput: stdout,
                    cliPath: this.cliPath,
                    command: config.command,
                    documentsCount: documents?.length || 0,
                  },
                });
              } catch (parseError) {
                this.logger.debug(
                  `⚠️ Parse error: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
                );
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
                    parseError:
                      parseError instanceof Error ? parseError.message : String(parseError),
                  },
                });
              }
            } else {
              this.logger.error(`Process failed with exit code ${code}`);
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
   * Format error message with strategy-specific context
   */
  private formatErrorMessage(
    code: number | null,
    signal: NodeJS.Signals | null,
    stdout: string,
    stderr: string,
    config: CommandConfig,
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

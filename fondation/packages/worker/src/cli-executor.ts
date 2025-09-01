import { exec, spawn } from "node:child_process";
import { promisify } from "node:util";
import { resolve, join } from "node:path";
import { existsSync, readFileSync, readdirSync, } from "node:fs";
import * as yaml from "js-yaml";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

// Local type definitions to avoid shared package dependency
type CLIResult = {
  success: boolean;
  message?: string;
  documents?: Array<{
    slug: string;
    title: string;
    content: string;
    kind: "chapter" | "tutorial" | "toc" | "yaml";
    chapterIndex: number;
  }>;
  error?: string;
  metadata?: Record<string, any>;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const _execAsync = promisify(exec);

export class CLIExecutor {
  private cliPath: string;
  
  constructor() {
    // Path to our bundled Fondation CLI - use environment variable if available (Docker), otherwise local path
    this.cliPath = process.env.CLI_PATH || resolve(__dirname, "../../cli/dist/cli.bundled.mjs");
  }

  /**
   * Parse generated files from .claude-tutorial-output directory
   */
  private async parseOutputFiles(repoPath: string): Promise<CLIResult['documents']> {
    const documents: NonNullable<CLIResult['documents']> = [];
    const outputDir = join(repoPath, ".claude-tutorial-output");
    
    if (!existsSync(outputDir)) {
      return documents;
    }

    try {
      // 1. Parse YAML files
      const yamlFiles = [
        { path: "step1_abstractions.yaml", kind: "yaml" as const, title: "Abstractions" },
        { path: "step2_relationships.yaml", kind: "yaml" as const, title: "Relationships" },
        { path: "step3_order.yaml", kind: "yaml" as const, title: "Chapter Order" }
      ];

      for (const yamlFile of yamlFiles) {
        const filePath = join(outputDir, yamlFile.path);
        if (existsSync(filePath)) {
          try {
            const content = readFileSync(filePath, "utf-8");
            const parsed = yaml.load(content);
            documents.push({
              slug: yamlFile.path,
              title: yamlFile.title,
              content: JSON.stringify(parsed, null, 2),
              kind: yamlFile.kind,
              chapterIndex: -1 // YAML files don't have chapter index
            });
          } catch (err) {
            console.warn(`Failed to parse YAML file ${yamlFile.path}:`, err instanceof Error ? err.message : err);
            // Continue processing other files
          }
        }
      }

      // 2. Parse chapters directory
      const chaptersDir = join(outputDir, "chapters");
      if (existsSync(chaptersDir)) {
        const chapterFiles = readdirSync(chaptersDir)
          .filter(f => f.endsWith(".md"))
          .sort();
        
        for (let i = 0; i < chapterFiles.length; i++) {
          const fileName = chapterFiles[i];
          const filePath = join(chaptersDir, fileName);
          const content = readFileSync(filePath, "utf-8");
          
          // Extract title from first H1 heading or filename
          const titleMatch = content.match(/^#\s+(.+)$/m);
          const title = titleMatch ? titleMatch[1] : fileName.replace(/\.md$/, "").replace(/_/g, " ");
          
          documents.push({
            slug: `chapters/${fileName}`,
            title,
            content,
            kind: "chapter",
            chapterIndex: i
          });
        }
      }

      // 3. Parse reviewed chapters directory
      const reviewedDir = join(outputDir, "reviewed-chapters");
      if (existsSync(reviewedDir)) {
        const reviewedFiles = readdirSync(reviewedDir)
          .filter(f => f.endsWith(".md"))
          .sort();
        
        for (let i = 0; i < reviewedFiles.length; i++) {
          const fileName = reviewedFiles[i];
          const filePath = join(reviewedDir, fileName);
          const content = readFileSync(filePath, "utf-8");
          
          const titleMatch = content.match(/^#\s+(.+)$/m);
          const title = titleMatch ? titleMatch[1] : fileName.replace(/\.md$/, "").replace(/_/g, " ");
          
          documents.push({
            slug: `reviewed-chapters/${fileName}`,
            title: `Reviewed: ${title}`,
            content,
            kind: "chapter",
            chapterIndex: i
          });
        }
      }

      // 4. Parse tutorials directory
      const tutorialsDir = join(outputDir, "tutorials");
      if (existsSync(tutorialsDir)) {
        const tutorialFiles = readdirSync(tutorialsDir)
          .filter(f => f.endsWith(".md"))
          .sort();
        
        for (let i = 0; i < tutorialFiles.length; i++) {
          const fileName = tutorialFiles[i];
          const filePath = join(tutorialsDir, fileName);
          const content = readFileSync(filePath, "utf-8");
          
          const titleMatch = content.match(/^#\s+(.+)$/m);
          const title = titleMatch ? titleMatch[1] : fileName.replace(/\.md$/, "").replace(/_/g, " ");
          
          documents.push({
            slug: `tutorials/${fileName}`,
            title: `Tutorial: ${title}`,
            content,
            kind: "tutorial",
            chapterIndex: i
          });
        }
      }
      return documents;

    } catch (error) {
      console.error('Error parsing output files:', error instanceof Error ? error.message : error);
      return documents; // Return partial results
    }
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
        // ENFORCE CONTAINER ARCHITECTURE: Worker MUST run inside Docker container
        const isInsideDocker = process.env.DOCKER_CONTAINER === 'true' || 
                              existsSync('/.dockerenv');
        
        if (!isInsideDocker) {
          throw new Error(
            "ARCHITECTURE VIOLATION: Worker must run inside Docker container. " +
            "Set DOCKER_CONTAINER=true or run worker using docker-compose. " +
            "External Docker spawning is not supported to maintain consistent architecture."
          );
        }
        
        // Validate required environment variables for Claude integration
        if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) {
          throw new Error(
            "CLAUDE_CODE_OAUTH_TOKEN environment variable is required for CLI analysis. " +
            "Ensure the Docker container is started with proper authentication tokens."
          );
        }
        
        // We're inside Docker - run bundled CLI directly with Bun
        // Use stdbuf to unbuffer output so we see progress messages immediately
        const analyzeCommand = `cd /app/cli && HOME=/home/worker NODE_PATH=/app/node_modules stdbuf -o0 -e0 timeout 3600 bun dist/cli.bundled.mjs analyze "${repoPath}" --profile production`;
        
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
        
        // Set timeout manually since spawn doesn't have timeout option
        const timeout = setTimeout(() => {
          child.kill('SIGTERM');
        }, 3600000);
        
        let stdout = "";
        let stderr = "";
        
        child.stdout?.on("data", (data) => {
          const text = data.toString();
          stdout += text;
          
          // Parse progress messages from CLI output
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
                // This is expected for non-JSON log lines, so only log in debug mode
                if (process.env.DEBUG) {
                  console.debug('Non-JSON log line:', trimmedLine);
                }
              }
            }
            
            // Detect various progress patterns (fallback for non-JSON)
            if (trimmedLine.includes("[PROGRESS]")) {
              const progress = trimmedLine.replace("[PROGRESS]", "").trim();
              options.onProgress?.(progress).catch(console.error);
            } else if (trimmedLine.match(/^Step \d+:/i)) {
              // Step 1: Extract abstractions
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
        
        // Track if we've already resolved/rejected to avoid double handling
        let hasFinished = false;
        
        child.on("error", (error) => {
          if (!hasFinished) {
            hasFinished = true;
            clearTimeout(timeout);
            reject(new Error(`Failed to spawn Fondation CLI: ${error.message}`));
          }
        });
        
        // Handle unexpected exits (process dying, etc.)
        child.on("exit", (code, signal) => {
          // Only handle error cases in exit, let close handle success
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
              
              // Parse the generated files from the output directory with timeout
              let documents: CLIResult['documents'] = [];
              try {
                // Add a timeout for parsing to prevent hanging
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
}
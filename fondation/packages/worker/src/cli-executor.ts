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
          } catch (_err) {
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

    } catch (_error) {
      return documents;
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
        // Check if we're already inside Docker container
        const isInsideDocker = process.env.DOCKER_CONTAINER === 'true' || 
                              existsSync('/.dockerenv');
        
        let analyzeCommand: string;
        
        if (isInsideDocker) {
          // We're already inside Docker - run bundled CLI directly
          // Use stdbuf to unbuffer output so we see progress messages immediately
          const runCmd = `cd /app/packages/cli && HOME=/home/worker NODE_PATH=/app/node_modules stdbuf -o0 -e0 node dist/cli.bundled.mjs analyze "${repoPath}" --profile production`;
          analyzeCommand = runCmd;
        } else {
          // External Docker runtime - use authenticated CLI image
          const image = process.env.FONDATION_WORKER_IMAGE ?? "fondation/cli:authenticated";
          const repoMount = repoPath;
          const runCmd = `cd /app/cli && node dist/cli.bundled.mjs analyze /tmp/repo --profile production`;
          
          const dockerCmd =
            `docker run --rm -v "${repoMount}:/tmp/repo" -v "${repoMount}/.claude-tutorial-output:/output" ` +
            `-e CLAUDE_OUTPUT_DIR=/output ${image} sh -c '${runCmd}'`;
          
          analyzeCommand = dockerCmd;
        }
        
        // Track the 6-step analysis workflow
        const workflowSteps = [
          "Extracting abstractions",
          "Analyzing relationships", 
          "Ordering chapters",
          "Generating chapters",
          "Reviewing chapters",
          "Creating tutorials"
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
                
                // Map Docker log messages to progress steps
                if (msg.includes("Starting codebase analysis")) {
                  options.onProgress?.("Step 0/6: Initializing analysis").catch(console.error);
                } else if (msg.includes("Extracting core abstractions")) {
                  options.onProgress?.("Step 1/6: Extracting abstractions").catch(console.error);
                } else if (msg.includes("Analyzing relationships")) {
                  options.onProgress?.("Step 2/6: Analyzing relationships").catch(console.error);
                } else if (msg.includes("Determining optimal chapter order")) {
                  options.onProgress?.("Step 3/6: Ordering chapters").catch(console.error);
                } else if (msg.includes("Generating chapter content")) {
                  options.onProgress?.("Step 4/6: Generating content").catch(console.error);
                } else if (msg.includes("Reviewing and enhancing")) {
                  options.onProgress?.("Step 5/6: Reviewing content").catch(console.error);
                } else if (msg.includes("Analysis complete")) {
                  options.onProgress?.("Step 6/6: Completing analysis").catch(console.error);
                }
              } catch (_err) {
                // Not JSON, fall through to other patterns
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
                  const progressMsg = `Step ${stepNum + 1}/6: ${workflowSteps[stepNum]}`;
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
                  const progressMsg = `Step ${i + 1}/6: ${workflowSteps[i]}`;
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
        
        // Handle unexpected exits (Docker container dying, etc.)
        child.on("exit", (code, signal) => {
          // Only handle error cases in exit, let close handle success
          if (!hasFinished && (code !== 0 || signal)) {
            hasFinished = true;
            clearTimeout(timeout);
            const errorMsg = signal 
              ? `Docker process killed with signal ${signal}. Last output: ${stderr || stdout || 'No output captured'}`
              : `Docker process exited with code ${code}. Error: ${stderr || 'No stderr'}\nOutput: ${stdout || 'No stdout'}`;
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
              } catch (_parseError) {
                // Continue with empty documents array - files were still generated
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
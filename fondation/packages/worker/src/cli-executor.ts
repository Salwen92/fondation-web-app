import { exec } from "child_process";
import { promisify } from "util";
import { resolve, join } from "path";
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import * as yaml from "js-yaml";
import { fileURLToPath } from "url";
import { dirname } from "path";

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

const execAsync = promisify(exec);

export class CLIExecutor {
  private cliPath: string;
  
  constructor() {
    // Path to our bundled Fondation CLI
    this.cliPath = resolve(__dirname, "../../cli/dist/cli.bundled.cjs");
  }

  /**
   * Parse generated files from .claude-tutorial-output directory
   */
  private async parseOutputFiles(repoPath: string): Promise<CLIResult['documents']> {
    const documents: NonNullable<CLIResult['documents']> = [];
    const outputDir = join(repoPath, ".claude-tutorial-output");
    
    if (!existsSync(outputDir)) {
      console.warn(`⚠️  Output directory not found: ${outputDir}`);
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
            console.log(`✅ Parsed ${yamlFile.path}`);
          } catch (err) {
            console.error(`❌ Failed to parse ${yamlFile.path}:`, err);
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
          console.log(`✅ Parsed chapter: ${fileName}`);
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
          console.log(`✅ Parsed reviewed chapter: ${fileName}`);
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
          console.log(`✅ Parsed tutorial: ${fileName}`);
        }
      }

      console.log(`📚 Total documents parsed: ${documents.length}`);
      return documents;

    } catch (error) {
      console.error(`❌ Error parsing output files:`, error);
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
      console.log(`🚀 Executing Fondation CLI for: ${repoPath}`);
      console.log(`📦 CLI Path: ${this.cliPath}`);
      
      try {
        // Check if we're already inside Docker container
        const isInsideDocker = process.env.DOCKER_CONTAINER === 'true' || 
                              existsSync('/.dockerenv');
        
        let analyzeCommand: string;
        
        if (isInsideDocker) {
          // We're already inside Docker - run bundled CLI directly
          // Use stdbuf to unbuffer output so we see progress messages immediately
          const runCmd = `cd /app/packages/cli && HOME=/home/worker NODE_PATH=/app/node_modules stdbuf -o0 -e0 node dist/cli.bundled.cjs analyze "${repoPath}" --profile production`;
          analyzeCommand = runCmd;
          console.log('🎯 Running bundled CLI directly inside Docker container');
        } else {
          // External Docker runtime - use authenticated CLI image
          const image = process.env.FONDATION_WORKER_IMAGE ?? "fondation-cli:auth-cli";
          const repoMount = repoPath;
          const runCmd = `node /app/cli.bundled.cjs analyze /tmp/repo --profile production`;
          
          const dockerCmd =
            `docker run --rm -v "${repoMount}:/tmp/repo" -v "${repoMount}/.claude-tutorial-output:/output" ` +
            `-e CLAUDE_OUTPUT_DIR=/output ${image} sh -c '${runCmd}'`;
          
          analyzeCommand = dockerCmd;
          console.log('🎯 Using external Docker runtime with authenticated CLI image');
        }
        
        console.log(`⚙️  Command: ${analyzeCommand}`);
        
        // Track the 6-step analysis workflow
        const workflowSteps = [
          "Extracting abstractions",
          "Analyzing relationships", 
          "Ordering chapters",
          "Generating chapters",
          "Reviewing chapters",
          "Creating tutorials"
        ];
        let currentStepIndex = 0;
        
        const child = exec(analyzeCommand, {
          timeout: 3600000, // 60 minutes timeout
          maxBuffer: 50 * 1024 * 1024, // 50MB buffer
          env: {
            ...process.env,
            HOME: '/home/worker',
            NODE_PATH: '/app/node_modules',
            // Let CLI use default .claude-tutorial-output directory in repo
          },
        });
        
        let stdout = "";
        let stderr = "";
        
        child.stdout?.on("data", (data) => {
          const text = data.toString();
          stdout += text;
          console.log(`[Fondation CLI] ${text.trim()}`);
          
          // Parse progress messages from CLI output
          const lines = text.split("\n");
          for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Detect various progress patterns
            if (trimmedLine.includes("[PROGRESS]")) {
              const progress = trimmedLine.replace("[PROGRESS]", "").trim();
              options.onProgress?.(progress).catch(console.error);
            } else if (trimmedLine.match(/^Step \d+:/i)) {
              // Step 1: Extract abstractions
              const stepMatch = trimmedLine.match(/^Step (\d+):/i);
              if (stepMatch) {
                const stepNum = parseInt(stepMatch[1]) - 1;
                if (stepNum >= 0 && stepNum < workflowSteps.length) {
                  currentStepIndex = stepNum;
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
                  currentStepIndex = i;
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
          stderr += data.toString();
          console.error(`⚠️  Fondation CLI stderr: ${data.toString()}`);
        });
        
        child.on("error", (error) => {
          console.error(`❌ CLI spawn error:`, error);
          reject(new Error(`Failed to spawn Fondation CLI: ${error.message}`));
        });
        
        child.on("close", async (code) => {
          if (code === 0) {
            console.log(`✅ Fondation CLI execution successful`);
            
            // Parse the generated files from the output directory
            const documents = await this.parseOutputFiles(repoPath);
            
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
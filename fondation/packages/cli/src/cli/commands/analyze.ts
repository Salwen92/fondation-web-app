import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { isatty } from 'node:tty';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import type { Logger } from 'pino';
import { generateChaptersFromYaml } from '../../chapter-generator';
import { reviewChaptersFromDirectory } from '../../chapter-reviewer';
import { generateTutorialsFromDirectory } from '../../tutorial-generator';
import { modelOption, outputDirOption } from '../options/common';
import type { CLIConfig } from '../utils/config';

type AnalyzeStep =
  | 'extract'
  | 'analyze'
  | 'order'
  | 'generate-chapters'
  | 'review-chapters'
  | 'generate-tutorials';

const ALL_STEPS: AnalyzeStep[] = [
  'extract',
  'analyze',
  'order',
  'generate-chapters',
  'review-chapters',
  'generate-tutorials',
];

export const analyzeCommand = new Command('analyze')
  .description('Analyze a codebase and generate comprehensive documentation')
  .argument('<path>', 'path to the codebase to analyze')
  .addOption(outputDirOption)
  .addOption(modelOption)
  .option('--skip-existing', 'skip files that already exist')
  .option('--overwrite', 'overwrite existing files')
  .option(
    '-p, --parallel <n>',
    'number of parallel operations',
    (value) => Number.parseInt(value, 10),
    5,
  )
  .option('-s, --steps <steps>', 'run specific steps only (comma-separated)')
  .addHelpText(
    'after',
    `
Global Options (available with all commands):
  -v, --verbose                 enable verbose output for debugging
  -q, --quiet                   suppress all logs and tool output (minimal output)
  --json                        output structured JSON format
  --profile <profile>           use configuration profile (clean, dev, debug, production, test)
  --config <path>               path to custom config file
  --log-file <path>             write logs to specified file

Examples:
  $ fondation analyze ./src
  $ fondation analyze ./src --profile production
  $ fondation analyze ./src --output-dir ./analysis --verbose
  $ fondation analyze ./src --steps extract,analyze
  
Use "fondation --help" for more information about global options.`,
  )
  .action(async (codebasePath: string, options) => {
    const config: CLIConfig = options._config;
    const logger: Logger = options._logger;
    const timer = options._timer;

    // Environment-aware path resolution
    // In development, use absolute path resolution
    // In production/containers, use relative to process.cwd()
    const isDevelopment =
      process.env.NODE_ENV === 'development' || process.env.FONDATION_MODE === 'development';
    const projectDir = isDevelopment ? resolve(codebasePath) : resolve(process.cwd(), codebasePath);
    const outputDir = resolve(
      projectDir,
      options.outputDir || config.outputDir || '.claude-tutorial-output',
    );
    const isTTY = isatty(process.stdout.fd || 0);

    // Parse steps
    const steps = options.steps
      ? (options.steps.split(',').map((s: string) => s.trim()) as AnalyzeStep[])
      : ALL_STEPS;

    // Validate project directory
    if (!existsSync(projectDir)) {
      logger.error(`Project directory does not exist: ${projectDir}`);
      process.exit(1);
    }

    logger.info('Starting codebase analysis', {
      project: projectDir,
      output: outputDir,
      steps: steps.join(', '),
      model: options.model || config.model,
    });

    try {
      // Ensure output directory exists
      if (!existsSync(outputDir)) {
        await mkdir(outputDir, { recursive: true });
        logger.debug('Created output directory', { path: outputDir });
      }

      const totalSteps = steps.length;
      let currentStep = 0;

      // Helper to show progress with unique identifiers
      const showProgress = (step: string, message: string) => {
        currentStep++;
        if (isTTY) {
          logger.info(`[${currentStep}/${totalSteps}] ${step}: ${message}`);
        } else {
          // Add unique FONDATION_STEP prefix to distinguish from debug messages
          logger.info(`[FONDATION_STEP_${currentStep}/${totalSteps}] ${message}`, {
            step: `${currentStep}/${totalSteps}`,
            phase: step,
          });
        }
      };

      // File paths for intermediate outputs
      const abstractionsOutput = join(outputDir, 'step1_abstractions.yaml');
      const relationshipsOutput = join(outputDir, 'step2_relationships.yaml');
      const chapterOrderOutput = join(outputDir, 'step3_order.yaml');
      const chaptersDir = join(outputDir, 'chapters');
      const reviewedChaptersDir = join(outputDir, 'reviewed-chapters');
      const tutorialsDir = join(outputDir, 'tutorials');

      // Step 1: Extract core abstractions
      if (steps.includes('extract')) {
        showProgress('Extract', 'Extracting core abstractions from codebase');

        await runPromptStep(
          'prompts/1-abstractions.md',
          projectDir,
          { OUTPUT_PATH: abstractionsOutput },
          options.model || config.model,
          logger,
        );

        if (!existsSync(abstractionsOutput)) {
          throw new Error('Failed to create abstractions file');
        }
      }

      // Step 2: Analyze relationships
      if (steps.includes('analyze')) {
        showProgress('Analyze', 'Analyzing relationships between components');

        await runPromptStep(
          'prompts/2-analyze-relationshipt.md',
          projectDir,
          {
            OUTPUT_PATH: relationshipsOutput,
            ABSTRACTIONS_PATH: abstractionsOutput,
          },
          options.model || config.model,
          logger,
        );

        if (!existsSync(relationshipsOutput)) {
          throw new Error('Failed to create relationships file');
        }
      }

      // Step 3: Order chapters
      if (steps.includes('order')) {
        showProgress('Order', 'Determining optimal chapter order');

        await runPromptStep(
          'prompts/3-order-chapters.md',
          projectDir,
          {
            OUTPUT_PATH: chapterOrderOutput,
            ABSTRACTIONS_PATH: abstractionsOutput,
            RELATIONSHIPS_PATH: relationshipsOutput,
          },
          options.model || config.model,
          logger,
        );

        if (!existsSync(chapterOrderOutput)) {
          throw new Error('Failed to create chapter order file');
        }
      }

      // Step 4: Generate chapters
      if (steps.includes('generate-chapters')) {
        showProgress('Generate', 'Generating chapter content');

        const promptTemplatePath = resolvePromptPath('prompts/4-write-chapters.md');

        await generateChaptersFromYaml(
          abstractionsOutput,
          relationshipsOutput,
          chapterOrderOutput,
          chaptersDir,
          promptTemplatePath,
          projectDir,
          options.overwrite || false,
        );
      }

      // Step 5: Review chapters
      if (steps.includes('review-chapters')) {
        showProgress('Review', 'Reviewing and enhancing chapters');

        const reviewPromptPath = resolvePromptPath('prompts/5-review-chapters.md');

        await reviewChaptersFromDirectory(
          chaptersDir,
          abstractionsOutput,
          chapterOrderOutput,
          reviewedChaptersDir,
          reviewPromptPath,
          projectDir,
          options.overwrite || false,
        );
      }

      // Step 6: Generate tutorials
      if (steps.includes('generate-tutorials')) {
        showProgress('Tutorials', 'Generating interactive tutorials');

        const tutorialPromptPath = resolvePromptPath('prompts/6-tutorials.md');

        await generateTutorialsFromDirectory(
          reviewedChaptersDir,
          abstractionsOutput,
          chapterOrderOutput,
          tutorialsDir,
          tutorialPromptPath,
          projectDir,
          options.overwrite || false,
        );
      }

      // Summary
      const duration = timer.elapsed();
      logger.info('Analysis complete!', { duration: `${duration}ms` });

      logger.info('Output summary:');
      logger.info(`  Core abstractions: ${abstractionsOutput}`);
      logger.info(`  Relationships: ${relationshipsOutput}`);
      logger.info(`  Chapter order: ${chapterOrderOutput}`);
      logger.info(`  Generated chapters: ${chaptersDir}/`);
      logger.info(`  Reviewed chapters: ${reviewedChaptersDir}/`);
      logger.info(`  Interactive tutorials: ${tutorialsDir}/`);
    } catch (error) {
      // Log error with multiple approaches to ensure it's visible
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      logger.error('Analysis failed', {
        error: errorMessage,
        stack: errorStack,
        fullError: JSON.stringify(error, null, 2),
      });

      // Stack trace is already included in logger.error above
      logger.debug('Full error details', { error });
      process.exit(1);
    }
  });

// Helper function to resolve prompt path correctly for both bundled and source
function resolvePromptPath(promptPath: string): string {
  // Check if we're in a bundled environment
  const isBundled = typeof __filename !== 'undefined' && __filename.includes('cli.bundled.mjs');

  // Try multiple locations for prompts
  const possiblePaths = [];

  if (isBundled) {
    // For bundled CLI, prompts are in dist/prompts
    const distDir = dirname(__filename);
    possiblePaths.push(resolve(distDir, promptPath));
    possiblePaths.push(resolve(distDir, '..', promptPath)); // One level up from dist
  } else {
    // For source execution, relative to file location
    try {
      possiblePaths.push(
        resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', promptPath),
      );
    } catch {
      // Fallback if import.meta.url is not available
    }
  }

  // Always try current working directory as fallback
  possiblePaths.push(resolve(process.cwd(), promptPath));

  // Docker-specific path (CLI runs from /app but prompts are in /app/cli/dist/prompts)
  possiblePaths.push(resolve('/app/cli/dist', promptPath));
  possiblePaths.push(resolve('/app/cli', promptPath));

  // Try direct path if absolute
  if (promptPath.startsWith('/')) {
    possiblePaths.push(promptPath);
  }

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  // Fallback to original behavior
  return resolve(process.cwd(), promptPath);
}

// Helper function to run individual prompt steps
async function runPromptStep(
  promptPath: string,
  workingDirectory: string,
  variables: Record<string, string>,
  model: string,
  logger: Logger,
): Promise<void> {
  // Import the SDK directly for this specific use case
  const { query } = await import('@anthropic-ai/claude-code');

  const resolvedPromptPath = resolvePromptPath(promptPath);
  let promptContent = await readFile(resolvedPromptPath, 'utf-8');

  // Conditional debug logging - only in development
  const isDevelopment =
    process.env.NODE_ENV === 'development' || process.env.FONDATION_MODE === 'development';
  if (isDevelopment) {
    logger.info('[DEBUG] RunPromptStep - Path Analysis');
    logger.info(`[DEBUG] Prompt Path: ${promptPath}`);
    logger.info(`[DEBUG] Resolved Prompt Path: ${resolvedPromptPath}`);
    logger.info(`[DEBUG] Working Directory: ${workingDirectory}`);
    logger.info(`[DEBUG] Process CWD: ${process.cwd()}`);
    logger.info(`[DEBUG] Variables: ${JSON.stringify(variables, null, 2)}`);
    logger.info(`[DEBUG] Model: ${model}`);
  }

  // Replace variables in the prompt
  for (const [key, value] of Object.entries(variables)) {
    logger.debug('Template replacement', { key, value, workingDirectory });
    promptContent = promptContent.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }

  logger.debug('Running prompt', { prompt: promptPath, variables: Object.keys(variables) });

  // Use the SDK directly to match existing analyze-all.ts behavior
  const messages = [];

  // Find the Claude Code executable path
  // In Docker/bundled environments, force the known path
  let claudeCodePath: string | undefined;

  // Development environment - use absolute path resolution first
  try {
    const { createRequire } = await import('node:module');
    const require = createRequire(import.meta.url);
    claudeCodePath = require.resolve('@anthropic-ai/claude-code/cli.js');
    logger.debug('Found Claude Code executable via require.resolve', { path: claudeCodePath });
  } catch {
    // Fallback to checking multiple possible locations for the Claude CLI
    const possiblePaths = [
      '/app/cli/node_modules/@anthropic-ai/claude-code/cli.js', // Bun Docker environment
      '/app/node_modules/@anthropic-ai/claude-code/cli.js', // Legacy Docker environment
      './node_modules/@anthropic-ai/claude-code/cli.js', // Relative path (last resort)
    ];

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        claudeCodePath = path;
        logger.debug('Found Claude Code executable at fallback path', { path });
        break;
      }
    }

    if (!claudeCodePath) {
      // Let the SDK use its default path resolution
      logger.debug('Claude Code executable path not found, using SDK default resolution');
    }
  }

  const sdkOptions = {
    customSystemPrompt: promptContent,
    allowedTools: ['Write', 'Read', 'LS', 'Glob', 'Grep', 'Edit', 'Bash'],
    // Use the working directory (repository path) not the CLI process directory
    cwd: workingDirectory,
    model,
    ...(claudeCodePath && { pathToClaudeCodeExecutable: claudeCodePath }),
  };

  // Conditional debug logging
  if (isDevelopment) {
    logger.info('[DEBUG] Claude Code SDK Configuration');
    logger.info(`[DEBUG] Working Directory Parameter: ${workingDirectory}`);
    logger.info(`[DEBUG] SDK CWD (should match working directory): ${sdkOptions.cwd}`);
    logger.info(`[DEBUG] Claude Code Path: ${claudeCodePath}`);
    logger.info(`[DEBUG] Model: ${sdkOptions.model}`);
    logger.info(`[DEBUG] Allowed Tools: ${JSON.stringify(sdkOptions.allowedTools)}`);
    logger.info(`[DEBUG] Has Custom System Prompt: ${!!sdkOptions.customSystemPrompt}`);
    logger.info(`[DEBUG] System Prompt Length: ${promptContent.length}`);
  }

  for await (const message of query({
    prompt: 'please respect your system prompt very carefully',
    abortController: new AbortController(),
    options: sdkOptions,
  })) {
    messages.push(message);

    if (message.type === 'result') {
      logger.debug('Prompt completed', {
        duration: `${message.duration_ms}ms`,
        cost: `$${message.total_cost_usd.toFixed(4)}`,
      });

      // Conditional debug logging
      if (isDevelopment) {
        logger.info('[DEBUG] Claude Code SDK Result Details');
        logger.info(`[DEBUG] Message Type: ${message.type}`);
        logger.info(`[DEBUG] Duration: ${message.duration_ms}ms`);
        logger.info(`[DEBUG] Success: true`);
        logger.info(`[DEBUG] Output Path From Variables: ${variables.OUTPUT_PATH}`);
        logger.info(`[DEBUG] Current Directory: ${process.cwd()}`);
      }
    }

    // Conditional debug logging
    if (isDevelopment) {
      logger.debug('[DEBUG] Claude Code SDK Message', {
        messageType: message.type,
        hasContent: 'message' in message && !!message.message,
      });
    }
  }

  // Conditional debug logging
  if (isDevelopment) {
    logger.info('[DEBUG] RunPromptStep Completed - Checking Results', {
      expectedOutputFile: variables.OUTPUT_PATH,
      fileExists: variables.OUTPUT_PATH
        ? existsSync(variables.OUTPUT_PATH)
        : 'no output path specified',
      workingDirectory,
      currentDirectory: process.cwd(),
    });
  }
}

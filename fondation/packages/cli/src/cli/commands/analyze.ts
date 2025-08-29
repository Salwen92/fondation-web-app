import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { isatty } from 'node:tty';
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
  .option('--dry-run', 'show what would be done without doing it')
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
  $ fondation analyze ./src --steps extract,analyze --dry-run
  
Use "fondation --help" for more information about global options.`,
  )
  .action(async (codebasePath: string, options) => {
    const config: CLIConfig = options._config;
    const logger: Logger = options._logger;
    const timer = options._timer;

    const projectDir = resolve(process.cwd(), codebasePath);
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
      dryRun: options.dryRun || false,
    });

    if (options.dryRun) {
      logger.info('DRY RUN MODE - No files will be created or modified');
    }

    try {
      // Ensure output directory exists
      if (!options.dryRun && !existsSync(outputDir)) {
        await mkdir(outputDir, { recursive: true });
        logger.debug('Created output directory', { path: outputDir });
      }

      const totalSteps = steps.length;
      let currentStep = 0;

      // Helper to show progress
      const showProgress = (step: string, message: string) => {
        currentStep++;
        if (isTTY) {
          logger.info(`[${currentStep}/${totalSteps}] ${step}: ${message}`);
        } else {
          logger.info(message, { step: `${currentStep}/${totalSteps}`, phase: step });
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

        if (!options.dryRun) {
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
      }

      // Step 2: Analyze relationships
      if (steps.includes('analyze')) {
        showProgress('Analyze', 'Analyzing relationships between components');

        if (!options.dryRun) {
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
      }

      // Step 3: Order chapters
      if (steps.includes('order')) {
        showProgress('Order', 'Determining optimal chapter order');

        if (!options.dryRun) {
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
      }

      // Step 4: Generate chapters
      if (steps.includes('generate-chapters')) {
        showProgress('Generate', 'Generating chapter content');

        if (!options.dryRun) {
          const promptTemplatePath = resolve(process.cwd(), 'prompts/4-write-chapters.md');

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
      }

      // Step 5: Review chapters
      if (steps.includes('review-chapters')) {
        showProgress('Review', 'Reviewing and enhancing chapters');

        if (!options.dryRun) {
          const reviewPromptPath = resolve(process.cwd(), 'prompts/5-review-chapters.md');

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
      }

      // Step 6: Generate tutorials
      if (steps.includes('generate-tutorials')) {
        showProgress('Tutorials', 'Generating interactive tutorials');

        if (!options.dryRun) {
          const tutorialPromptPath = resolve(process.cwd(), 'prompts/6-tutorials.md');

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
      }

      // Summary
      const duration = timer.elapsed();
      logger.info('Analysis complete!', { duration: `${duration}ms` });

      if (!options.dryRun) {
        logger.info('Output summary:');
        logger.info(`  Core abstractions: ${abstractionsOutput}`);
        logger.info(`  Relationships: ${relationshipsOutput}`);
        logger.info(`  Chapter order: ${chapterOrderOutput}`);
        logger.info(`  Generated chapters: ${chaptersDir}/`);
        logger.info(`  Reviewed chapters: ${reviewedChaptersDir}/`);
        logger.info(`  Interactive tutorials: ${tutorialsDir}/`);
      }
    } catch (error) {
      logger.error('Analysis failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      process.exit(1);
    }
  });

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

  let promptContent = await readFile(resolve(process.cwd(), promptPath), 'utf-8');

  // Replace variables in the prompt
  for (const [key, value] of Object.entries(variables)) {
    promptContent = promptContent.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }

  logger.debug('Running prompt', { prompt: promptPath, variables: Object.keys(variables) });

  // Use the SDK directly to match existing analyze-all.ts behavior
  const messages = [];
  for await (const message of query({
    prompt: 'please respect your system prompt very carefully',
    abortController: new AbortController(),
    options: {
      customSystemPrompt: promptContent,
      allowedTools: ['Write', 'Read', 'LS', 'Glob', 'Grep', 'Edit', 'Bash'],
      cwd: workingDirectory,
      model,
    },
  })) {
    messages.push(message);

    if (message.type === 'result') {
      logger.debug('Prompt completed', {
        duration: `${message.duration_ms}ms`,
        cost: `$${message.total_cost_usd.toFixed(4)}`,
      });
    }
  }
}

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Command } from 'commander';
import type { Logger } from 'pino';
// Import will be available after Phase 2 generators are properly integrated
// For now, using the legacy function
import { generateTutorialsFromDirectory } from '../../tutorial-generator';
import { modelOption } from '../options/common';
import type { CLIConfig } from '../utils/config';

export const generateTutorialsCommand = new Command('generate-tutorials')
  .description('Convert reviewed chapters into interactive tutorials')
  .requiredOption('-r, --reviews-dir <dir>', 'directory containing reviewed chapters')
  .option('-o, --output-dir <dir>', 'output directory for tutorials', './tutorials')
  .addOption(modelOption)
  .option(
    '-p, --parallel <n>',
    'number of parallel operations',
    (value) => Number.parseInt(value, 10),
    5,
  )
  .option('--interactive', 'add extra interactive elements')
  .option(
    '--difficulty <level>',
    'set difficulty level (beginner/intermediate/advanced)',
    'intermediate',
  )
  .option('--abstractions <file>', 'abstractions YAML file', 'step1_abstractions.yaml')
  .option('--order <file>', 'chapter order YAML file', 'step3_order.yaml')
  .option('--overwrite', 'overwrite existing files')
  .action(async (options) => {
    const config: CLIConfig = options._config;
    const logger: Logger = options._logger;
    const timer = options._timer;

    const reviewsDir = resolve(process.cwd(), options.reviewsDir);
    const outputDir = resolve(process.cwd(), options.outputDir);
    const abstractionsFile = resolve(process.cwd(), options.abstractions);
    const orderFile = resolve(process.cwd(), options.order);

    // Validate input directories/files
    if (!existsSync(reviewsDir)) {
      logger.error(`Reviews directory not found: ${reviewsDir}`);
      process.exit(1);
    }

    if (!existsSync(abstractionsFile)) {
      logger.error(`Abstractions file not found: ${abstractionsFile}`);
      process.exit(1);
    }

    if (!existsSync(orderFile)) {
      logger.error(`Chapter order file not found: ${orderFile}`);
      process.exit(1);
    }

    logger.info('Starting tutorial generation', {
      input: reviewsDir,
      output: outputDir,
      model: options.model || config.model,
      parallel: options.parallel,
      difficulty: options.difficulty,
      interactive: options.interactive || false,
    });

    try {
      const tutorialPromptPath = resolve(process.cwd(), 'prompts/6-tutorials.md');

      await generateTutorialsFromDirectory(
        reviewsDir,
        abstractionsFile,
        orderFile,
        outputDir,
        tutorialPromptPath,
        process.cwd(),
        options.overwrite || false,
      );

      const duration = timer.elapsed();
      logger.info('Tutorial generation complete!', { duration: `${duration}ms` });
    } catch (error) {
      logger.error('Tutorial generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      process.exit(1);
    }
  });

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Command } from 'commander';
import type { Logger } from 'pino';
// Import will be available after Phase 2 generators are properly integrated
// For now, using the legacy function
import { reviewChaptersFromDirectory } from '../../chapter-reviewer';
import { modelOption } from '../options/common';
import type { CLIConfig } from '../utils/config';

export const reviewChaptersCommand = new Command('review-chapters')
  .description('Review and enhance existing chapters')
  .requiredOption('-c, --chapters-dir <dir>', 'directory containing chapters to review')
  .option('-o, --output-dir <dir>', 'output directory for reviews', './reviewed-chapters')
  .addOption(modelOption)
  .option(
    '-p, --parallel <n>',
    'number of parallel operations',
    (value) => Number.parseInt(value, 10),
    5,
  )
  .option('--chapters <list>', 'review specific chapters only (comma-separated)')
  .option('--force', 'review even if review already exists')
  .option('--abstractions <file>', 'abstractions YAML file', 'step1_abstractions.yaml')
  .option('--order <file>', 'chapter order YAML file', 'step3_order.yaml')
  .action(async (options) => {
    const config: CLIConfig = options._config;
    const logger: Logger = options._logger;
    const timer = options._timer;

    const chaptersDir = resolve(process.cwd(), options.chaptersDir);
    const outputDir = resolve(process.cwd(), options.outputDir);
    const abstractionsFile = resolve(process.cwd(), options.abstractions);
    const orderFile = resolve(process.cwd(), options.order);

    // Validate input directories/files
    if (!existsSync(chaptersDir)) {
      logger.error(`Chapters directory not found: ${chaptersDir}`);
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

    logger.info('Starting chapter review', {
      input: chaptersDir,
      output: outputDir,
      model: options.model || config.model,
      parallel: options.parallel,
    });

    try {
      const reviewPromptPath = resolve(process.cwd(), 'prompts/5-review-chapters.md');

      await reviewChaptersFromDirectory(
        chaptersDir,
        abstractionsFile,
        orderFile,
        outputDir,
        reviewPromptPath,
        process.cwd(),
        options.force || false,
      );

      const duration = timer.elapsed();
      logger.info('Chapter review complete!', { duration: `${duration}ms` });
    } catch (error) {
      logger.error('Chapter review failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      process.exit(1);
    }
  });

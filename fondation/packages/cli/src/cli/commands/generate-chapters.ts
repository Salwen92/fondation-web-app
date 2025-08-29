import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Command } from 'commander';
import type { Logger } from 'pino';
// Import will be available after Phase 2 generators are properly integrated
// For now, using the legacy function
import { generateChaptersFromYaml } from '../../chapter-generator';
import { modelOption, outputDirOption } from '../options/common';
import type { CLIConfig } from '../utils/config';

export const generateChaptersCommand = new Command('generate-chapters')
  .description('Generate chapter content from ordered abstractions')
  .requiredOption('-i, --input <file>', 'ordered chapters YAML file')
  .addOption(outputDirOption)
  .addOption(modelOption)
  .option(
    '-p, --parallel <n>',
    'number of parallel operations',
    (value) => Number.parseInt(value, 10),
    5,
  )
  .option('-c, --chapters <list>', 'generate specific chapters only (comma-separated)')
  .option('--skip-existing', 'skip files that already exist')
  .option('--overwrite', 'overwrite existing files')
  .option('--abstractions <file>', 'abstractions YAML file', 'step1_abstractions.yaml')
  .option('--relationships <file>', 'relationships YAML file', 'step2_relationships.yaml')
  .action(async (options) => {
    const config: CLIConfig = options._config;
    const logger: Logger = options._logger;
    const timer = options._timer;

    const outputDir = resolve(process.cwd(), options.outputDir || config.outputDir || './chapters');
    const inputFile = resolve(process.cwd(), options.input);
    const abstractionsFile = resolve(process.cwd(), options.abstractions);
    const relationshipsFile = resolve(process.cwd(), options.relationships);

    // Validate input files
    if (!existsSync(inputFile)) {
      logger.error(`Input file not found: ${inputFile}`);
      process.exit(1);
    }

    if (!existsSync(abstractionsFile)) {
      logger.error(`Abstractions file not found: ${abstractionsFile}`);
      process.exit(1);
    }

    if (!existsSync(relationshipsFile)) {
      logger.error(`Relationships file not found: ${relationshipsFile}`);
      process.exit(1);
    }

    logger.info('Starting chapter generation', {
      input: inputFile,
      output: outputDir,
      model: options.model || config.model,
      parallel: options.parallel,
    });

    try {
      const promptTemplatePath = resolve(process.cwd(), 'prompts/4-write-chapters.md');

      await generateChaptersFromYaml(
        abstractionsFile,
        relationshipsFile,
        inputFile,
        outputDir,
        promptTemplatePath,
        process.cwd(),
        options.overwrite || false,
      );

      const duration = timer.elapsed();
      logger.info('Chapter generation complete!', { duration: `${duration}ms` });
    } catch (error) {
      logger.error('Chapter generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      process.exit(1);
    }
  });

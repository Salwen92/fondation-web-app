import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import type { Logger } from 'pino';
import type { CLIConfig } from '../utils/config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const versionCommand = new Command('version')
  .description('Display version and environment information')
  .option('--check-updates', 'check for available updates')
  .action(async (options, command) => {
    const config: CLIConfig = command.optsWithGlobals()._config;
    const logger: Logger = command.optsWithGlobals()._logger;
    const globalJson = command.optsWithGlobals().json;

    // Read package.json
    const packageJson = JSON.parse(readFileSync(join(__dirname, '../../../package.json'), 'utf-8'));

    const versionInfo = {
      cli: {
        name: packageJson.name,
        version: packageJson.version,
        description: packageJson.description,
      },
      runtime: {
        type: process.versions.bun ? 'Bun' : 'Node.js',
        version: process.versions.bun || process.version,
      },
      environment: {
        platform: process.platform,
        arch: process.arch,
        cwd: process.cwd(),
      },
      configuration: {
        model: config.model,
        outputDir: config.outputDir,
        configLocation: getConfigLocation(),
      },
      models: {
        available: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514'],
        current: config.model,
      },
      dependencies: {
        '@anthropic-ai/claude-code':
          packageJson.dependencies['@anthropic-ai/claude-code'] || 'unknown',
        commander: packageJson.dependencies.commander || 'unknown',
        zod: packageJson.dependencies.zod || 'unknown',
      },
    };

    if (globalJson) {
      process.stdout.write(`${JSON.stringify(versionInfo, null, 2)}\n`);
    } else {
      displayVersionInfo(versionInfo, logger);
    }

    if (options.checkUpdates) {
      await checkForUpdates(packageJson.name, packageJson.version, logger);
    }
  });

function getConfigLocation(): string {
  return 'Using defaults (no filesystem search)';
}

interface VersionInfo {
  cli: { name: string; version: string; description: string };
  runtime: { type: string; version: string };
  environment: { platform: string; arch: string; cwd: string };
  configuration: { model: string; outputDir: string; configLocation: string };
  models: { current: string; available: string[] };
  dependencies: Record<string, string>;
}

function displayVersionInfo(info: VersionInfo, logger: Logger): void {
  logger.info(`\n${info.cli.name} v${info.cli.version}`);
  logger.info(info.cli.description);

  logger.info(`\nRuntime: ${info.runtime.type} ${info.runtime.version}`);
  logger.info(`Platform: ${info.environment.platform} ${info.environment.arch}`);
  logger.info(`Working Directory: ${info.environment.cwd}`);

  logger.info(`\nConfiguration:`);
  logger.info(`  Model: ${info.configuration.model}`);
  logger.info(`  Output Directory: ${info.configuration.outputDir}`);
  logger.info(`  Config: ${info.configuration.configLocation}`);

  logger.info(`\nAvailable Models:`);
  info.models.available.forEach((model: string) => {
    const current = model === info.models.current ? ' (current)' : '';
    logger.info(`  - ${model}${current}`);
  });

  logger.info(`\nKey Dependencies:`);
  Object.entries(info.dependencies).forEach(([name, version]) => {
    logger.info(`  ${name}: ${version}`);
  });
}

async function checkForUpdates(
  packageName: string,
  currentVersion: string,
  logger: Logger,
): Promise<void> {
  logger.info('\nChecking for updates...');

  try {
    const response = await fetch(`https://registry.npmjs.org/${packageName}/latest`);
    if (!response.ok) {
      logger.warn('Unable to check for updates');
      return;
    }

    const data = (await response.json()) as { version: string };
    const latestVersion = data.version;

    if (latestVersion === currentVersion) {
      logger.info(`You are running the latest version (${currentVersion})`);
    } else {
      logger.warn(`Update available: ${currentVersion} → ${latestVersion}`);
      logger.info(`Run: npm update -g ${packageName}`);
    }
  } catch (error) {
    logger.warn('Unable to check for updates');
    logger.debug('Update check error:', error);
  }
}

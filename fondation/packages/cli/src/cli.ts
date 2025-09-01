#!/usr/bin/env node

// Read version from package.json
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import type { GlobalOptions } from './cli/types';
import { type CLIConfig, loadConfig } from './cli/utils/config';
import { createLogger, LogMessages, setLogger, Timer } from './cli/utils/logger';
import type { PackageJson } from './types/package';

// Handle both bundled and unbundled scenarios
let packageJson: PackageJson;
let version: string;

if (process.env.PACKAGE_JSON) {
  // Use embedded package.json in bundled version
  packageJson = JSON.parse(process.env.PACKAGE_JSON) as PackageJson;
  version = packageJson.version;
} else {
  // Read from file system in development
  const __dirname = dirname(fileURLToPath(import.meta.url));
  packageJson = JSON.parse(
    readFileSync(join(__dirname, '../package.json'), 'utf-8'),
  ) as PackageJson;
  version = packageJson.version;
}

async function main() {
  const program = new Command();

  program
    .name('fondation')
    .description('A powerful CLI for interacting with Claude AI')
    .version(version)
    .option('-v, --verbose', 'enable verbose output for debugging')
    .option('-q, --quiet', 'suppress all logs and tool output (minimal output)')
    .option('--json', 'output structured JSON format')
    .option(
      '--profile <profile>',
      'use configuration profile (clean, dev, debug, production, test)',
    )
    .option('--config <path>', 'path to custom config file')
    .option('--log-file <path>', 'write logs to specified file')
    .hook('preAction', async (_thisCommand, actionCommand) => {
      const commandName = actionCommand.name();
      const options = actionCommand.opts();
      const globalOptions = actionCommand.parent?.opts() || {};
      const allOptions = { ...globalOptions, ...options } as GlobalOptions;

      // Fast path for chat command - minimal initialization
      if (commandName === 'chat' && !allOptions.config && !allOptions.profile) {
        // Use minimal config for chat to avoid loading overhead
        const minimalConfig: CLIConfig = {
          model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
          outputDir: process.env.CLAUDE_OUTPUT_DIR || '.claude-output',
          temperature: 0.7,
          maxOutputTokens: 4096,
          logMessages: true,
          verbose: allOptions.verbose || false,
          tools: [], // Chat doesn't use tools
        };

        // Create minimal logger
        const logger = createLogger({
          verbose: allOptions.verbose || false,
          quiet: allOptions.quiet || false,
          json: false, // Chat doesn't use JSON output
          context: 'chat',
        });

        actionCommand.setOptionValue('_config', minimalConfig);
        actionCommand.setOptionValue('_logger', logger);
        actionCommand.setOptionValue('_timer', new Timer());
        return;
      }

      // Regular path for other commands - full initialization
      // Create initial logger for configuration loading
      const bootstrapLogger = createLogger({
        verbose: allOptions.verbose || false,
        quiet: allOptions.quiet || false,
        json: allOptions.json || false,
      });

      bootstrapLogger.debug(LogMessages.configLoading);
      const config = await loadConfig({
        ...(allOptions.config && { configPath: allOptions.config }),
        ...(allOptions.profile && { profile: allOptions.profile }),
        cliOptions: allOptions,
      });
      bootstrapLogger.debug(LogMessages.configLoaded('configuration file'));

      // Setup final logger with full configuration
      const logger = createLogger({
        verbose: allOptions.verbose || config.verbose || false,
        quiet: allOptions.quiet || false,
        json: allOptions.json || false,
        ...(allOptions.logFile && { logFile: allOptions.logFile }),
        context: actionCommand.name(),
      });

      // Set as global logger
      setLogger(logger);

      // Attach to command context
      actionCommand.setOptionValue('_config', config);
      actionCommand.setOptionValue('_logger', logger);
      actionCommand.setOptionValue('_timer', new Timer());
    });

  // Error handling
  program.exitOverride((err) => {
    if (err.code === 'commander.help' || err.code === 'commander.helpDisplayed') {
      process.exit(0);
    }
    if (err.code === 'commander.version') {
      process.exit(0);
    }
    const logger = createLogger({ json: (program.opts() as GlobalOptions).json || false });
    logger.error(err.message);
    process.exit(1);
  });

  // Define commands with lazy loading - each registers itself when imported
  const commandDefinitions = [
    {
      name: 'run',
      load: async () => {
        const { runCommand } = await import('./cli/commands/run');
        program.addCommand(runCommand);
      },
    },
    {
      name: 'chat',
      load: async () => {
        const { chatCommand } = await import('./cli/commands/chat');
        program.addCommand(chatCommand);
      },
    },
    {
      name: 'config',
      load: async () => {
        const { configCommand } = await import('./cli/commands/config');
        program.addCommand(configCommand);
      },
    },
    {
      name: 'version',
      load: async () => {
        const { versionCommand } = await import('./cli/commands/version');
        program.addCommand(versionCommand);
      },
    },
    {
      name: 'analyze',
      load: async () => {
        const { analyzeCommand } = await import('./cli/commands/analyze');
        program.addCommand(analyzeCommand);
      },
    },
    {
      name: 'generate-chapters',
      load: async () => {
        const { generateChaptersCommand } = await import('./cli/commands/generate-chapters');
        program.addCommand(generateChaptersCommand);
      },
    },
    {
      name: 'review-chapters',
      load: async () => {
        const { reviewChaptersCommand } = await import('./cli/commands/review-chapters');
        program.addCommand(reviewChaptersCommand);
      },
    },
    {
      name: 'generate-tutorials',
      load: async () => {
        const { generateTutorialsCommand } = await import('./cli/commands/generate-tutorials');
        program.addCommand(generateTutorialsCommand);
      },
    },
    {
      name: 'worker',
      load: async () => {
        const { workerCommand } = await import('./cli/commands/worker');
        program.addCommand(workerCommand);
      },
    },
  ];

  // Check if help or version is requested at the program level
  const isGlobalHelpRequest =
    process.argv.length === 3 && (process.argv[2] === '-h' || process.argv[2] === '--help');
  const isVersionRequest = process.argv.includes('-V') || process.argv.includes('--version');

  // Check if help is requested for a specific command (e.g., "run --help")
  const commandHelpIndex = process.argv.findIndex((arg) => arg === '-h' || arg === '--help');
  const isCommandHelp = commandHelpIndex > 2;

  // Only load commands if not global help/version
  if (!isGlobalHelpRequest && !isVersionRequest) {
    // Find which command is being requested
    const requestedCommand = process.argv.find((arg) =>
      commandDefinitions.some((cmd) => cmd.name === arg),
    );

    // If a specific command is requested (including for help), only load that one
    if (requestedCommand) {
      const cmdDef = commandDefinitions.find((cmd) => cmd.name === requestedCommand);
      if (cmdDef) {
        await cmdDef.load();
      }
    } else if (isCommandHelp) {
      // If help is requested but no command found yet, load all commands
      // This handles cases like "--help" after other flags
      for (const cmdDef of commandDefinitions) {
        await cmdDef.load();
      }
    } else {
      // Handle convenience patterns first
      const commands = commandDefinitions.map((cmd) => cmd.name);
      const hasCommand = commands.some((cmd) => process.argv.includes(cmd));

      if (!hasCommand) {
        // If -p flag provided without command, default to 'run'
        if (process.argv.includes('-p')) {
          const pIndex = process.argv.indexOf('-p');
          process.argv.splice(pIndex, 0, 'run');
          // Load run command
          await commandDefinitions.find((cmd) => cmd.name === 'run')?.load();
        }
        // If direct prompt provided (no flags), default to 'run'
        else if (process.argv.length >= 3 && !process.argv[2]?.startsWith('-')) {
          process.argv.splice(2, 0, 'run', '-p');
          // Load run command
          await commandDefinitions.find((cmd) => cmd.name === 'run')?.load();
        }
        // If no arguments, default to 'chat'
        else if (process.argv.length === 2) {
          process.argv.push('chat');
          // Load chat command
          await commandDefinitions.find((cmd) => cmd.name === 'chat')?.load();
        }
      }
    }
  }

  // Parse arguments
  await program.parseAsync();
}

// Handle uncaught errors
process.on('uncaughtException', (_error) => {
  process.exit(1);
});

process.on('unhandledRejection', (_reason, _promise) => {
  process.exit(1);
});

// Run CLI
main().catch((_error) => {
  process.exit(1);
});

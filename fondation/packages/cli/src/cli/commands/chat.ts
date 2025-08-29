import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import type { Logger } from 'pino';
import { modelOption } from '../options/common';
import type { ClaudeEnvironment } from '../types/environment';
import type { CLIConfig } from '../utils/config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const chatCommand = new Command('chat')
  .description('Launch interactive chat UI')
  .addOption(modelOption)
  .option('-r, --resume <session>', 'resume specific session')
  .option('--no-history', "disable conversation history (messages won't be saved)")
  .option('-o, --output-dir <dir>', 'set output directory')
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
  $ fondation chat
  $ fondation chat --resume session-abc123
  $ fondation chat --model claude-opus-4-20250514
  $ fondation chat --verbose --output-dir ./my-sessions
  
Use "fondation --help" for more information about global options.`,
  )
  .action(async (options) => {
    const config: CLIConfig = options._config;
    const logger: Logger = options._logger;

    try {
      // Build environment variables from configuration
      const env = buildEnvironment(config, options);

      // Find the dev.tsx path
      const devPath = getDevPath();
      if (!existsSync(devPath)) {
        throw new Error(`Chat UI not found at ${devPath}`);
      }

      // Validate session if resuming
      if (options.resume) {
        const sessionValid = await validateSession(options.resume, config, logger);
        if (!sessionValid) {
          logger.warn(`Session ${options.resume} not found, starting new session`);
        }
      }

      logger.debug('Spawning chat UI', {
        devPath,
        env: Object.keys(env).filter((k) => k.startsWith('CLAUDE_')),
      });

      // Spawn the interactive UI
      const child = spawn('bun', ['run', devPath], {
        stdio: 'inherit',
        env: { ...process.env, ...env } as NodeJS.ProcessEnv,
        cwd: process.cwd(),
      });

      // Forward signals to child
      const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGTSTP', 'SIGCONT'];
      signals.forEach((signal) => {
        process.on(signal, () => {
          if (!child.killed) {
            child.kill(signal);
          }
        });
      });

      // Handle child exit
      child.on('exit', (code, signal) => {
        handleChildExit(code, signal, logger);
      });

      child.on('error', (error) => {
        logger.error('Failed to launch chat UI', { error: error.message });
        process.exit(1);
      });
    } catch (error) {
      logger.error('Chat command failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      process.exit(1);
    }
  });

interface ChatOptions {
  model?: string;
  outputDir?: string;
  history?: boolean;
  resume?: string;
}

function buildEnvironment(config: CLIConfig, options: ChatOptions): ClaudeEnvironment {
  const env: ClaudeEnvironment = {};

  // Model selection (CLI flag takes precedence)
  if (options.model) {
    env.CLAUDE_MODEL = options.model;
  } else if (config.model) {
    env.CLAUDE_MODEL = config.model;
  }

  // Output directory
  if (options.outputDir) {
    env.CLAUDE_OUTPUT_DIR = options.outputDir;
  } else if (config.outputDir) {
    env.CLAUDE_OUTPUT_DIR = config.outputDir;
  }

  // Message history (note: --no-history sets history to false)
  if (options.history === false) {
    env.CLAUDE_LOG_MESSAGES = 'false';
  } else if (config.logMessages !== undefined) {
    env.CLAUDE_LOG_MESSAGES = config.logMessages.toString();
  }

  // Session resume
  if (options.resume) {
    env.CLAUDE_SESSION_ID = options.resume;
  }

  // Pass through any existing CLAUDE_ environment variables
  Object.keys(process.env).forEach((key) => {
    if (key.startsWith('CLAUDE_') && !env[key]) {
      const value = process.env[key];
      if (value) {
        env[key] = value;
      }
    }
  });

  return env;
}

async function validateSession(
  sessionId: string,
  config: CLIConfig,
  logger: Logger,
): Promise<boolean> {
  try {
    // Check if session ID follows expected format
    const sessionIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!sessionIdPattern.test(sessionId)) {
      logger.debug('Invalid session ID format', { sessionId });
      return false;
    }

    // Check if session file exists
    const sessionDir = config.outputDir || '.claude-output';
    const sessionFile = join(sessionDir, 'sessions', `${sessionId}.json`);

    if (!existsSync(sessionFile)) {
      logger.debug('Session file not found', { sessionFile });
      return false;
    }

    return true;
  } catch (error) {
    logger.debug('Session validation error', { error });
    return false;
  }
}

function getDevPath(): string {
  // Try multiple possible locations
  const possiblePaths = [
    join(__dirname, '..', '..', '..', 'src', 'dev.tsx'), // From dist/cli/commands
    join(process.cwd(), 'src', 'dev.tsx'), // From current working directory
    join(__dirname, '..', 'dev.tsx'), // Relative to command
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  // Default to expected location
  return possiblePaths[0] || 'src/dev.tsx';
}

function handleChildExit(code: number | null, signal: NodeJS.Signals | null, logger: Logger): void {
  if (signal) {
    logger.debug(`Chat UI terminated by signal ${signal}`);
    // Exit with 128 + signal number (Unix convention)
    const signalNumber = process.platform === 'win32' ? 1 : 128 + (signal === 'SIGINT' ? 2 : 15);
    process.exit(signalNumber);
  } else if (code !== null) {
    logger.debug(`Chat UI exited with code ${code}`);
    process.exit(code);
  } else {
    logger.debug('Chat UI exited without code or signal');
    process.exit(0);
  }
}

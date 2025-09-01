import { cosmiconfig } from 'cosmiconfig';
import { z } from 'zod';
import { DEFAULT_MODEL_CONFIG, getModelConfig } from '../../config';
import { env } from '../../env';
import type { CLIOptionsMap } from '../types/environment';

// Base Configuration Schema (without profiles)
const BaseConfigSchema = z.object({
  model: z.string().optional(),
  outputDir: z.string().optional(),
  temperature: z.number().min(0).max(1).optional(),
  maxOutputTokens: z.number().positive().optional(),
  logMessages: z.boolean().optional(),
  verbose: z.boolean().optional(),
  tools: z.array(z.string()).optional(),
  thinking: z
    .union([
      z.boolean(),
      z.object({
        enabled: z.boolean(),
        maxTokens: z.number().positive().optional(),
        verbose: z.boolean().optional(),
      }),
    ])
    .optional(),
  showToolLogs: z.boolean().optional(),
  showSystemLogs: z.boolean().optional(),
});

// Full Configuration Schema (with profiles)
const ConfigSchema = BaseConfigSchema.extend({
  profiles: z.record(z.string(), BaseConfigSchema).optional(),
});

// Merged configuration type
export type CLIConfig = z.infer<typeof BaseConfigSchema> & {
  // Ensure required fields are present after merging
  model: string;
  outputDir: string;
  temperature: number;
  maxOutputTokens: number;
  logMessages: boolean;
  verbose: boolean;
  thinking?:
    | boolean
    | {
        enabled: boolean;
        maxTokens?: number;
        verbose?: boolean;
      };
  showToolLogs?: boolean;
  showSystemLogs?: boolean;
};

interface LoadConfigOptions {
  configPath?: string;
  profile?: string;
  cliOptions?: CLIOptionsMap; // CLI command options
}

// Built-in defaults
const DEFAULTS: CLIConfig = {
  model: DEFAULT_MODEL_CONFIG.model,
  outputDir: '.claude-output',
  temperature: DEFAULT_MODEL_CONFIG.temperature || 0.7,
  maxOutputTokens: DEFAULT_MODEL_CONFIG.maxTokens || 4096,
  logMessages: true,
  verbose: false,
  tools: [
    'Write',
    'Read',
    'LS',
    'Glob',
    'Grep',
    'Edit',
    'MultiEdit',
    'Bash',
    'TodoRead',
    'TodoWrite',
    'Task',
    'WebFetch',
    'WebSearch',
    'NotebookRead',
    'NotebookEdit',
    'exit_plan_mode',
  ],
  showToolLogs: true, // NEW: Show tool operations by default
  showSystemLogs: false, // NEW: Hide system logs by default
};

// Default profiles
const DEFAULT_PROFILES: Record<string, Partial<CLIConfig>> = {
  clean: {
    showToolLogs: false,
    showSystemLogs: false,
    verbose: false,
  },
  dev: {
    verbose: true,
    logMessages: true,
    showSystemLogs: true,
    showToolLogs: true,
  },
  debug: {
    verbose: true,
    logMessages: true,
    showSystemLogs: true,
    showToolLogs: true,
    thinking: { enabled: true, maxTokens: 32000, verbose: true },
  },
  production: {
    temperature: 0.3,
    showToolLogs: false,
    showSystemLogs: false,
  },
  test: {
    tools: ['Read'],
    maxOutputTokens: 1000,
    outputDir: './test-output',
    showSystemLogs: false,
  },
};

// Cache for loaded configurations
const configCache = new Map<string, CLIConfig>();

function getCacheKey(options: LoadConfigOptions): string {
  return `${options.configPath || 'default'}:${options.profile || 'none'}`;
}

export async function loadConfig(options: LoadConfigOptions = {}): Promise<CLIConfig> {
  // Check cache first
  const cacheKey = getCacheKey(options);
  const cached = configCache.get(cacheKey);
  if (cached && !options.cliOptions) {
    // Return cached config if no CLI options override it
    return cached;
  }
  try {
    // 1. Start with built-in defaults
    let config: CLIConfig = { ...DEFAULTS };

    // 2. Load explicit config file only (no filesystem search)
    if (options.configPath) {
      const explorer = cosmiconfig('fondation', {
        searchPlaces: [options.configPath], // Only search the explicit path
        stopDir: process.cwd(), // Don't search up the tree
      });
      
      // Add timeout to prevent hanging
      const loadWithTimeout = Promise.race([
        explorer.load(options.configPath),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Configuration loading timed out after 10 seconds`)), 10000)
        )
      ]);
      
      const result = await loadWithTimeout;
      if (!result) {
        throw new Error(`Configuration file not found: ${options.configPath}`);
      }

      // Validate configuration file
      const validated = ConfigSchema.parse(result.config);

      // Merge file config (excluding profiles)
      const { profiles, ...fileConfig } = validated;
      config = { ...config, ...fileConfig } as CLIConfig;

      // 3. Apply selected profile from file
      if (options.profile) {
        const allProfiles = { ...DEFAULT_PROFILES, ...profiles };
        const profileConfig = allProfiles[options.profile];

        if (!profileConfig) {
          const available = Object.keys(allProfiles).join(', ');
          throw new Error(`Profile "${options.profile}" not found. Available: ${available}`);
        }

        config = { ...config, ...profileConfig } as CLIConfig;
      }
    }

    // 3. Apply built-in profile (if no config file was loaded)
    if (options.profile && !options.configPath) {
      const profileConfig = DEFAULT_PROFILES[options.profile];

      if (!profileConfig) {
        const available = Object.keys(DEFAULT_PROFILES).join(', ');
        throw new Error(`Profile "${options.profile}" not found. Available: ${available}`);
      }

      config = { ...config, ...profileConfig } as CLIConfig;
    }

    // 4. Apply environment variables
    const modelConfig = getModelConfig();
    config = {
      ...config,
      ...(env.CLAUDE_MODEL && { model: env.CLAUDE_MODEL }),
      ...(env.CLAUDE_OUTPUT_DIR && { outputDir: env.CLAUDE_OUTPUT_DIR }),
      ...(env.ENABLE_MESSAGE_LOGGING !== undefined && { logMessages: env.ENABLE_MESSAGE_LOGGING }),
      ...(modelConfig.temperature !== undefined && { temperature: modelConfig.temperature }),
      ...(modelConfig.maxTokens !== undefined && { maxOutputTokens: modelConfig.maxTokens }),
    } as CLIConfig;

    // 5. Apply CLI options (highest priority)
    if (options.cliOptions) {
      const cliMappings: Record<string, string> = {
        model: 'model',
        outputDir: 'outputDir',
        verbose: 'verbose',
        quiet: 'quiet',
        tools: 'tools',
        maxTokens: 'maxOutputTokens',
      };

      for (const [cliKey, configKey] of Object.entries(cliMappings)) {
        if (options.cliOptions[cliKey] !== undefined) {
          (config as Record<string, unknown>)[configKey] = options.cliOptions[cliKey];
        }
      }

      // Handle quiet flag (inverse of verbose)
      if (options.cliOptions.quiet !== undefined) {
        config.verbose = !options.cliOptions.quiet;
      }
    }

    // Validate final configuration
    const finalConfig = BaseConfigSchema.parse(config) as CLIConfig;

    // Cache the configuration if no CLI options were used
    if (!options.cliOptions) {
      configCache.set(cacheKey, finalConfig);
    }

    return finalConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
        .join('\n');
      throw new Error(`Configuration validation failed:\n${issues}`);
    }
    throw error;
  }
}

/**
 * Display configuration sources and final values
 */
export function displayConfig(config: CLIConfig, options: LoadConfigOptions = {}): void {
  if (options.profile) {
    // Profile-specific display logic would go here
    process.stdout.write(`Using profile: ${options.profile}\n`);
  }
  process.stdout.write(`${JSON.stringify(config, null, 2)}\n`);
}

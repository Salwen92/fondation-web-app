import { z } from 'zod';

// Define the environment variable schema
const envSchema = z.object({
  // Claude model configuration
  CLAUDE_MODEL: z
    .enum(['claude-sonnet-4-20250514', 'claude-opus-4-20250514'])
    .optional()
    .default('claude-sonnet-4-20250514'),

  // Message logging configuration
  ENABLE_MESSAGE_LOGGING: z
    .string()
    .optional()
    .transform((val) => val !== 'false') // Convert to boolean, default true
    .default('true'),

  // Alternative message logging configuration (from CLI)
  CLAUDE_LOG_MESSAGES: z
    .string()
    .optional()
    .transform((val) => val !== 'false')
    .default('true'),

  // Output directory configuration
  CLAUDE_OUTPUT_DIR: z.string().optional().default('.claude-tutorial-output'),

  // Session ID for resuming sessions
  CLAUDE_SESSION_ID: z.string().uuid().optional(),
});

// Parse and validate environment variables
function loadEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      process.exit(1);
    }
    throw error;
  }
}

// Export the validated environment variables
export const env = loadEnv();

// Export the inferred type for use in other files
export type Env = z.infer<typeof envSchema>;

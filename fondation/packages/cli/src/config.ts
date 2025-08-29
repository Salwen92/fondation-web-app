import { env } from './env.js';

export type ModelName = 'claude-sonnet-4-20250514' | 'claude-opus-4-20250514';

export interface ModelConfig {
  model: ModelName;
  temperature?: number;
  maxTokens?: number;
}

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  model: 'claude-sonnet-4-20250514', // Sonnet 4 model string
  temperature: 0.7,
  maxTokens: 4096,
};

export function getModelConfig(): ModelConfig {
  return {
    ...DEFAULT_MODEL_CONFIG,
    model: env.CLAUDE_MODEL,
  };
}

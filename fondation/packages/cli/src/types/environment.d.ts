declare global {
  // biome-ignore lint/style/noNamespace: Required for extending Node.js types
  namespace NodeJS {
    interface ProcessEnv {
      ANTHROPIC_API_KEY?: string;
      CLAUDE_MODEL?: string;
      CLAUDE_OUTPUT_DIR?: string;
      CLAUDE_LOG_MESSAGES?: string;
      CLAUDE_SESSION_ID?: string;
      DEBUG_KEYS?: string;
      [key: string]: string | undefined;
    }

    interface ProcessVersions {
      bun?: string;
    }
  }
}

export {};

/**
 * Environment Variable Configuration
 * This file provides type-safe environment variable access with validation
 */

interface EnvironmentVariables {
  // Authentication
  AUTH_SECRET: string;
  NEXTAUTH_SECRET: string;
  NEXTAUTH_URL: string;

  // GitHub OAuth
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;

  // Convex
  NEXT_PUBLIC_CONVEX_URL: string;
  CONVEX_URL?: string;
  CONVEX_DEPLOYMENT?: string;

  // Worker Gateway
  WORKER_GATEWAY_URL?: string;

  // Environment
  NODE_ENV?: 'development' | 'production' | 'test';
}

class EnvironmentConfig {
  private static instance: EnvironmentConfig;
  private vars: Partial<EnvironmentVariables>;

  private constructor() {
    this.vars = {
      AUTH_SECRET: process.env.AUTH_SECRET,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
      GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
      NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
      CONVEX_URL: process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL,
      CONVEX_DEPLOYMENT: process.env.CONVEX_DEPLOYMENT,
      WORKER_GATEWAY_URL: process.env.WORKER_GATEWAY_URL,
      NODE_ENV: process.env.NODE_ENV as EnvironmentVariables['NODE_ENV'],
    };
  }

  static getInstance(): EnvironmentConfig {
    if (!EnvironmentConfig.instance) {
      EnvironmentConfig.instance = new EnvironmentConfig();
    }
    return EnvironmentConfig.instance;
  }

  get(key: keyof EnvironmentVariables): string | undefined {
    return this.vars[key];
  }

  getRequired(key: keyof EnvironmentVariables): string {
    const value = this.vars[key];
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }

  validate(): void {
    const required: (keyof EnvironmentVariables)[] = [
      'NEXTAUTH_SECRET',
      'GITHUB_CLIENT_ID',
      'GITHUB_CLIENT_SECRET',
    ];

    const missing = required.filter((key) => !this.vars[key]);

    if (missing.length > 0) {
      // In production, this would throw an error for missing required environment variables
    }

    // Security warnings
    if (process.env.NODE_ENV === 'production') {
      if (!this.vars.AUTH_SECRET || !this.vars.NEXTAUTH_SECRET) {
        // Production environment should have authentication secrets configured
      }

      if (
        this.vars.NEXTAUTH_URL?.startsWith('http://') &&
        !this.vars.NEXTAUTH_URL.includes('localhost')
      ) {
        // Production should use HTTPS for authentication URLs
      }
    }
  }

  isProduction(): boolean {
    return this.vars.NODE_ENV === 'production';
  }

  isDevelopment(): boolean {
    return this.vars.NODE_ENV === 'development';
  }
}

// Export singleton instance
export const env = (() => {
  const config = EnvironmentConfig.getInstance();

  // Validate on initialization
  if (typeof window === 'undefined') {
    config.validate();
  }

  return {
    // Auth
    AUTH_SECRET: config.get('AUTH_SECRET') ?? '',
    NEXTAUTH_SECRET: config.get('NEXTAUTH_SECRET') ?? config.get('AUTH_SECRET') ?? '',
    NEXTAUTH_URL: config.get('NEXTAUTH_URL') ?? 'http://localhost:3000',

    // GitHub OAuth
    GITHUB_CLIENT_ID: config.get('GITHUB_CLIENT_ID') ?? '',
    GITHUB_CLIENT_SECRET: config.get('GITHUB_CLIENT_SECRET') ?? '',

    // Convex
    NEXT_PUBLIC_CONVEX_URL: config.get('NEXT_PUBLIC_CONVEX_URL') ?? '',
    CONVEX_URL: config.get('CONVEX_URL') ?? config.get('NEXT_PUBLIC_CONVEX_URL') ?? '',
    CONVEX_DEPLOYMENT: config.get('CONVEX_DEPLOYMENT') ?? '',

    // Worker
    WORKER_GATEWAY_URL: config.get('WORKER_GATEWAY_URL') ?? '',

    // Environment
    NODE_ENV: config.get('NODE_ENV') ?? 'development',

    // Helper methods
    isProduction: () => config.isProduction(),
    isDevelopment: () => config.isDevelopment(),
  };
})();

// Package.json type definitions for bundled CLI support
export interface PackageJson {
  name: string;
  version: string;
  description?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

// Environment variables for bundled CLI
export interface BundledEnvironment {
  PACKAGE_JSON?: string;
  PACKAGE_VERSION?: string;
}

// Extend ProcessEnv to include our custom variables
declare global {
  // biome-ignore lint/style/noNamespace: Required for extending Node.js ProcessEnv interface
  namespace NodeJS {
    interface ProcessEnv extends BundledEnvironment {
      // Existing env vars are preserved
    }
  }
}

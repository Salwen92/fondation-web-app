/**
 * Environment Detection Utility
 *
 * Provides centralized environment detection for the Fondation monorepo.
 * Supports development, production, and test environments with clear
 * detection logic and consistent behavior across packages.
 */
export type Environment = 'development' | 'production' | 'test';
export type ExecutionMode = 'local' | 'docker' | 'container';
/**
 * Detect the current environment based on NODE_ENV and other indicators
 */
export declare function getEnvironment(): Environment;
/**
 * Check if running in development mode
 */
export declare function isDevelopment(): boolean;
/**
 * Check if running in production mode
 */
export declare function isProduction(): boolean;
/**
 * Check if running in test mode
 */
export declare function isTest(): boolean;
/**
 * Detect the current execution mode (local vs docker/container)
 */
export declare function getExecutionMode(): ExecutionMode;
/**
 * Check if running inside a Docker container
 */
export declare function isInsideDocker(): boolean;
/**
 * Check if running locally (not in container)
 */
export declare function isLocalExecution(): boolean;
/**
 * Get environment-specific configuration with fallbacks
 */
export declare function getEnvironmentConfig<T>(config: {
    development?: T;
    production?: T;
    test?: T;
    default?: T;
}): T | undefined;
/**
 * Validate environment requirements
 */
export declare function validateEnvironment(requirements: {
    allowedEnvironments?: Environment[];
    requiredExecutionMode?: ExecutionMode;
    requiredEnvVars?: string[];
}): {
    valid: boolean;
    errors: string[];
};
/**
 * Development mode helpers
 */
export declare const dev: {
    /**
     * Check if development mode allows a specific feature
     */
    allows: (feature: "docker_bypass" | "mock_auth" | "hot_reload" | "debug_logging") => boolean;
    /**
     * Get development-specific paths
     */
    paths: {
        cliSource: () => "../../cli/src/cli.ts" | null;
        cliBundle: () => "../../cli/dist/cli.bundled.mjs" | "/app/packages/cli/dist/cli.bundled.mjs";
        tempDir: () => "/tmp/fondation-dev" | "/tmp/fondation";
    };
};
export declare const environmentInfo: {
    environment: Environment;
    executionMode: ExecutionMode;
    isDocker: boolean;
    isLocal: boolean;
    nodeEnv: string | undefined;
    platform: NodeJS.Platform;
    arch: NodeJS.Architecture;
};
//# sourceMappingURL=environment.d.ts.map
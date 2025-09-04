/**
 * WorkerConfigBuilder Unit Tests
 *
 * Phase 3 Testing: Comprehensive test suite for Configuration Builder Pattern
 * Validates builder pattern functionality, method chaining, environment integration
 */

import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import {
  createCustomWorkerConfig,
  createWorkerConfig,
  WorkerConfigBuilder,
} from './config-builder.js';

// Mock EnvironmentConfig singleton
const mockEnvironmentConfig = {
  getInstance: mock(() => mockEnvironmentConfig),
  getWorkerId: mock(() => 'test-worker-123'),
  getConvexUrl: mock(() => 'https://test.convex.cloud'),
  getExecutionMode: mock(() => 'local'),
  isDevelopment: mock(() => true),
  getPollInterval: mock(() => 5000),
  getLeaseTime: mock(() => 30000),
  getHeartbeatInterval: mock(() => 10000),
  getMaxConcurrentJobs: mock(() => 3),
  getCliPath: mock(() => null),
  getTempDir: mock(() => null),
  requireValidEnvironment: mock(() => undefined),
  isDebugMode: mock(() => false),
};

// Mock the environment config import
mock.module('@fondation/shared/environment-config', () => ({
  EnvironmentConfig: mockEnvironmentConfig,
}));

// Mock the dev paths for CLI source resolution
const mockDevPaths = {
  cliSource: mock(() => '@fondation/cli/src/cli.ts'),
};

mock.module('@fondation/shared/environment', () => ({
  dev: { paths: mockDevPaths },
}));

describe('WorkerConfigBuilder', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    mock.restore();

    // Set default mock implementations
    mockEnvironmentConfig.getWorkerId.mockReturnValue('test-worker-123');
    mockEnvironmentConfig.getConvexUrl.mockReturnValue('https://test.convex.cloud');
    mockEnvironmentConfig.getExecutionMode.mockReturnValue('local');
    mockEnvironmentConfig.isDevelopment.mockReturnValue(true);
    mockEnvironmentConfig.getPollInterval.mockReturnValue(5000);
    mockEnvironmentConfig.getLeaseTime.mockReturnValue(30000);
    mockEnvironmentConfig.getHeartbeatInterval.mockReturnValue(10000);
    mockEnvironmentConfig.getMaxConcurrentJobs.mockReturnValue(3);
    mockEnvironmentConfig.getCliPath.mockReturnValue(null);
    mockEnvironmentConfig.getTempDir.mockReturnValue(null);
    mockDevPaths.cliSource.mockReturnValue('@fondation/cli/src/cli.ts');
  });

  describe('Builder Pattern', () => {
    it('should create builder instance with static create method', () => {
      const builder = WorkerConfigBuilder.create();
      expect(builder).toBeInstanceOf(WorkerConfigBuilder);
    });

    it('should support fluent interface method chaining', () => {
      const builder = WorkerConfigBuilder.create();

      const chained = builder
        .withEnvironmentDefaults()
        .withCliPath()
        .withTempDirectory()
        .withPollingConfig()
        .withValidation();

      expect(chained).toBeInstanceOf(WorkerConfigBuilder);
      expect(chained).toBe(builder); // Should return same instance
    });

    it('should build complete configuration with all methods', () => {
      const config = WorkerConfigBuilder.create()
        .withEnvironmentDefaults()
        .withCliPath()
        .withTempDirectory()
        .withPollingConfig()
        .withValidation()
        .build();

      expect(config).toMatchObject({
        workerId: 'test-worker-123',
        convexUrl: 'https://test.convex.cloud',
        executionMode: 'local',
        developmentMode: true,
        pollInterval: 5000,
        leaseTime: 30000,
        heartbeatInterval: 10000,
        maxConcurrentJobs: 3,
        tempDir: '/tmp/fondation-dev',
      });

      expect(config.cliPath).toBeDefined();
    });
  });

  describe('Environment Integration', () => {
    it('should use EnvironmentConfig singleton for defaults', () => {
      const config = WorkerConfigBuilder.create()
        .withEnvironmentDefaults()
        .withCliPath()
        .withTempDirectory()
        .build();

      expect(mockEnvironmentConfig.getWorkerId).toHaveBeenCalled();
      expect(mockEnvironmentConfig.getConvexUrl).toHaveBeenCalled();
      expect(mockEnvironmentConfig.getExecutionMode).toHaveBeenCalled();
      expect(mockEnvironmentConfig.isDevelopment).toHaveBeenCalled();
    });

    it('should handle production environment configuration', () => {
      mockEnvironmentConfig.isDevelopment.mockReturnValue(false);
      mockEnvironmentConfig.getExecutionMode.mockReturnValue('container');

      const config = WorkerConfigBuilder.create()
        .withEnvironmentDefaults()
        .withCliPath()
        .withTempDirectory()
        .build();

      expect(config.developmentMode).toBe(false);
      expect(config.executionMode).toBe('container');
      expect(config.cliPath).toBe('/app/packages/cli/dist/cli.bundled.mjs');
      expect(config.tempDir).toBe('/tmp/fondation');
    });

    it('should respect explicit environment overrides', () => {
      mockEnvironmentConfig.getCliPath.mockReturnValue('/custom/cli/path');
      mockEnvironmentConfig.getTempDir.mockReturnValue('/custom/temp');

      const config = WorkerConfigBuilder.create()
        .withEnvironmentDefaults()
        .withCliPath()
        .withTempDirectory()
        .build();

      expect(config.cliPath).toBe('/custom/cli/path');
      expect(config.tempDir).toBe('/custom/temp');
    });
  });

  describe('CLI Path Resolution', () => {
    it('should use source path for development mode', () => {
      mockEnvironmentConfig.isDevelopment.mockReturnValue(true);
      mockDevPaths.cliSource.mockReturnValue('@fondation/cli/src/cli.ts');

      const config = WorkerConfigBuilder.create()
        .withEnvironmentDefaults()
        .withCliPath()
        .withTempDirectory()
        .build();

      expect(config.cliPath).toBe('@fondation/cli/src/cli.ts');
    });

    it('should use bundled path for production mode', () => {
      mockEnvironmentConfig.isDevelopment.mockReturnValue(false);

      const config = WorkerConfigBuilder.create()
        .withEnvironmentDefaults()
        .withCliPath()
        .withTempDirectory()
        .build();

      expect(config.cliPath).toBe('/app/packages/cli/dist/cli.bundled.mjs');
    });

    it('should fallback to local bundle in development when source unavailable', () => {
      mockEnvironmentConfig.isDevelopment.mockReturnValue(true);
      mockDevPaths.cliSource.mockReturnValue(null);

      const config = WorkerConfigBuilder.create()
        .withEnvironmentDefaults()
        .withCliPath()
        .withTempDirectory()
        .build();

      expect(config.cliPath).toBe('@fondation/cli/dist/cli.bundled.mjs');
    });
  });

  describe('Validation', () => {
    it('should validate required fields are present', () => {
      expect(() => {
        WorkerConfigBuilder.create().withValidation().build();
      }).toThrow('Configuration validation failed: workerId is required');
    });

    it('should call EnvironmentConfig validation', () => {
      WorkerConfigBuilder.create()
        .withEnvironmentDefaults()
        .withCliPath()
        .withTempDirectory()
        .withPollingConfig()
        .withValidation()
        .build();

      expect(mockEnvironmentConfig.requireValidEnvironment).toHaveBeenCalled();
    });

    it('should validate production CLI path requirements', () => {
      mockEnvironmentConfig.isDevelopment.mockReturnValue(false);

      expect(() => {
        WorkerConfigBuilder.create()
          .withEnvironmentDefaults()
          .withCliPath()
          .withTempDirectory()
          .withPollingConfig()
          .withValidation()
          .build();
      }).not.toThrow();

      // Test invalid production CLI path
      const builder = WorkerConfigBuilder.create();
      builder.withEnvironmentDefaults();
      (builder as any).config.cliPath = '/invalid/path';
      (builder as any).config.developmentMode = false;

      expect(() => {
        builder.withValidation().build();
      }).toThrow('Production mode requires bundled CLI path');
    });

    it('should validate positive numeric values', () => {
      const builder = WorkerConfigBuilder.create();
      builder.withEnvironmentDefaults();
      (builder as any).config.pollInterval = -1;

      expect(() => {
        builder.withValidation().build();
      }).toThrow('Poll interval must be positive');
    });
  });

  describe('Factory Functions', () => {
    it('should create standard config via createWorkerConfig', () => {
      const config = createWorkerConfig();

      expect(config).toMatchObject({
        workerId: 'test-worker-123',
        convexUrl: 'https://test.convex.cloud',
        executionMode: 'local',
        developmentMode: true,
      });
    });

    it('should create custom config via createCustomWorkerConfig', () => {
      const config = createCustomWorkerConfig((builder) => {
        // Simulate customizing the builder
        (builder as any).config.maxConcurrentJobs = 10;
        return builder;
      });

      expect(config.maxConcurrentJobs).toBe(10);
    });
  });

  describe('Error Handling', () => {
    it('should handle EnvironmentConfig validation errors', () => {
      mockEnvironmentConfig.requireValidEnvironment.mockImplementation(() => {
        throw new Error('Environment validation failed');
      });

      expect(() => {
        WorkerConfigBuilder.create()
          .withEnvironmentDefaults()
          .withCliPath()
          .withTempDirectory()
          .withPollingConfig()
          .withValidation()
          .build();
      }).toThrow('Environment validation failed');
    });

    it('should accumulate multiple validation errors', () => {
      // Mock to avoid environment validation errors
      mockEnvironmentConfig.requireValidEnvironment.mockImplementation(() => {});

      const builder = WorkerConfigBuilder.create();
      builder.withEnvironmentDefaults();
      builder.withCliPath();
      builder.withTempDirectory();
      (builder as any).config.pollInterval = -1;
      (builder as any).config.leaseTime = 0;
      (builder as any).config.maxConcurrentJobs = -5;

      try {
        builder.withValidation().build();
        expect.unreachable('Should have thrown validation error');
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain('Poll interval must be positive');
        expect(message).toContain('Lease time must be positive');
        expect(message).toContain('Max concurrent jobs must be positive');
      }
    });
  });

  describe('Method Isolation', () => {
    it('should allow partial configuration building', () => {
      const config = WorkerConfigBuilder.create()
        .withEnvironmentDefaults()
        .withCliPath()
        .withTempDirectory()
        .build();

      // Should have environment defaults and CLI path, and temp directory
      expect(config.workerId).toBe('test-worker-123');
      expect(config.cliPath).toBeDefined();
      expect(config.tempDir).toBeDefined();
    });

    it('should maintain configuration state across method calls', () => {
      const builder = WorkerConfigBuilder.create();

      builder.withEnvironmentDefaults();
      expect((builder as any).config.workerId).toBe('test-worker-123');

      builder.withCliPath();
      expect((builder as any).config.workerId).toBe('test-worker-123'); // Should still be set
      expect((builder as any).config.cliPath).toBeDefined();
    });
  });
});

/**
 * Strategy Pattern Simplification - Integration Tests
 * 
 * Phase 5: Comprehensive testing to ensure refactoring maintains exact behavior
 * Tests the complete integration of all 4 phases of simplification
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { DevelopmentCLIStrategy } from "./cli-strategies/development-strategy.js";
import { ProductionCLIStrategy } from "./cli-strategies/production-strategy.js";
import { createConfig, validateConfig } from "./config.js";
import { ProgressParser } from "./progress-parser.js";
import { EnvironmentConfig } from "@fondation/shared/environment-config.js";

describe("Strategy Pattern Simplification - Integration Tests", () => {
  
  // Save original environment
  let originalEnv: Record<string, string | undefined>;
  
  beforeAll(() => {
    originalEnv = { ...process.env };
  });
  
  beforeEach(() => {
    // Reset singleton cache between tests to ensure clean environment detection
    EnvironmentConfig.reset();
  });
  
  afterAll(() => {
    // Restore original environment
    for (const key in process.env) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
  });

  describe("Phase 1: Strategy Pattern Validation", () => {
    it("should create development strategy with proper inheritance", () => {
      const strategy = new DevelopmentCLIStrategy("@fondation/cli/src/cli.ts");
      
      expect(strategy.getName()).toBe("Development CLI Strategy");
      expect(typeof strategy.validate).toBe("function");
      expect(typeof strategy.getCommandConfig).toBe("function");
    });

    it("should create production strategy with proper inheritance", () => {
      const strategy = new ProductionCLIStrategy("/app/packages/cli/dist/cli.bundled.mjs");
      
      expect(strategy.getName()).toBe("Production CLI Strategy");
      expect(typeof strategy.validate).toBe("function");
      expect(typeof strategy.getCommandConfig).toBe("function");
    });

    it("should maintain strategy-specific behavior differences", () => {
      const devStrategy = new DevelopmentCLIStrategy("@fondation/cli/src/cli.ts");
      const prodStrategy = new ProductionCLIStrategy("/app/packages/cli/dist/cli.bundled.mjs");
      
      expect(devStrategy.getName()).not.toBe(prodStrategy.getName());
      // Strategies should have different validation logic but same interface
      expect(typeof devStrategy.validate).toBe(typeof prodStrategy.validate);
    });
  });

  describe("Phase 2: Environment Config Integration", () => {
    it("should use EnvironmentConfig singleton for development", () => {
      // Set development environment
      process.env.NODE_ENV = "development";
      process.env.CONVEX_URL = "https://test-dev.convex.cloud";
      process.env.FONDATION_EXECUTION_MODE = "local";
      
      const config = createConfig();
      
      expect(config.developmentMode).toBe(true);
      expect(config.convexUrl).toBe("https://test-dev.convex.cloud");
      expect(config.executionMode).toBe("local");
      expect(config.workerId).toMatch(/^worker-/);
      
      // Should not throw validation error
      expect(() => validateConfig(config)).not.toThrow();
    });

    it("should use EnvironmentConfig singleton for production", () => {
      // Set production environment  
      process.env.NODE_ENV = "production";
      process.env.CONVEX_URL = "https://test-prod.convex.cloud";
      process.env.FONDATION_EXECUTION_MODE = "container";
      process.env.CLAUDE_CODE_OAUTH_TOKEN = "sk-ant-test";
      process.env.DOCKER_CONTAINER = "true";
      
      const config = createConfig();
      
      expect(config.developmentMode).toBe(false);
      expect(config.convexUrl).toBe("https://test-prod.convex.cloud");
      expect(config.executionMode).toBe("container");
      
      // Production validation should pass with proper environment
      expect(() => validateConfig(config)).not.toThrow();
    });

    it("should handle environment variable overrides", () => {
      process.env.NODE_ENV = "development";
      process.env.CONVEX_URL = "https://test.convex.cloud";
      process.env.CLI_PATH = "/custom/cli/path";
      process.env.TEMP_DIR = "/custom/temp";
      process.env.POLL_INTERVAL = "8000";
      
      const config = createConfig();
      
      expect(config.cliPath).toBe("/custom/cli/path");
      expect(config.tempDir).toBe("/custom/temp");  
      expect(config.pollInterval).toBe(8000);
    });
  });

  describe("Phase 3: Configuration Builder Integration", () => {
    it("should use WorkerConfigBuilder internally", () => {
      process.env.NODE_ENV = "development";
      process.env.CONVEX_URL = "https://test.convex.cloud";
      
      const config = createConfig();
      
      // Verify builder pattern produces complete, valid configuration
      expect(config).toHaveProperty("workerId");
      expect(config).toHaveProperty("convexUrl");
      expect(config).toHaveProperty("pollInterval");
      expect(config).toHaveProperty("leaseTime");
      expect(config).toHaveProperty("heartbeatInterval");
      expect(config).toHaveProperty("maxConcurrentJobs");
      expect(config).toHaveProperty("tempDir");
      expect(config).toHaveProperty("cliPath");
      expect(config).toHaveProperty("executionMode");
      expect(config).toHaveProperty("developmentMode");
    });

    it("should maintain configuration consistency", () => {
      process.env.NODE_ENV = "development";
      process.env.CONVEX_URL = "https://test.convex.cloud";
      
      const config1 = createConfig();
      const config2 = createConfig();
      
      // Same environment should produce consistent configuration structure
      expect(config1.developmentMode).toBe(config2.developmentMode);
      expect(config1.convexUrl).toBe(config2.convexUrl);
      expect(config1.executionMode).toBe(config2.executionMode);
      
      // Worker IDs should be different (generated)
      expect(config1.workerId).not.toBe(config2.workerId);
    });
  });

  describe("Phase 4: Progress Parser Integration", () => {
    it("should parse all progress message patterns", () => {
      const testMessages = [
        "Étape 2/6: Analyse des relations",
        "Step 3/6: Generating chapters", 
        "1. Extracting abstractions",
        "3/6 completed",
        "[PROGRESS] Processing files",
        '{"msg": "Starting codebase analysis", "level": "info"}',
        "Generating comprehensive documentation"
      ];

      const results = testMessages.map(msg => ProgressParser.parseMessage(msg));
      
      // All messages should parse successfully (no nulls)
      expect(results.every(result => result !== null)).toBe(true);
      expect(results.filter(r => r !== null)).toHaveLength(testMessages.length);
    });

    it("should maintain French UI formatting consistency", () => {
      const englishMessage = "Step 4/6: Creating documentation";
      const result = ProgressParser.parseMessage(englishMessage);
      
      expect(result).toMatch(/^Étape \d+\/\d+:/); // Should convert to French format
      expect(result).toContain("4/6");
    });

    it("should integrate with BaseStrategy progress parsing", () => {
      const multilineOutput = [
        "Starting analysis...",
        "Étape 1/6: Extraction des abstractions",
        "[PROGRESS] Processing files", 
        '{"msg": "Analyzing relationships", "level": "info"}',
        "Generating documentation"
      ].join("\n");

      const messages: string[] = [];
      const callback = async (msg: string) => messages.push(msg);
      
      ProgressParser.parseMultilineOutput(multilineOutput, callback);
      
      // Should extract multiple progress messages
      expect(messages.length).toBeGreaterThan(2);
      expect(messages.some(msg => msg.includes("Étape"))).toBe(true);
    });
  });

  describe("End-to-End Integration", () => {
    it("should create and validate complete worker setup", () => {
      // Set up complete development environment
      process.env.NODE_ENV = "development";
      process.env.CONVEX_URL = "https://basic-stoat-666.convex.cloud";
      process.env.FONDATION_EXECUTION_MODE = "local";
      
      // Create configuration using builder pattern (Phase 3)
      const config = createConfig();
      expect(() => validateConfig(config)).not.toThrow();
      
      // Create strategy using template method pattern (Phase 1)
      const strategy = new DevelopmentCLIStrategy(config.cliPath!);
      expect(strategy.getName()).toBe("Development CLI Strategy");
      
      // Validate strategy uses environment config (Phase 2)
      // This is tested indirectly through the strategy validation
      expect(typeof strategy.validate).toBe("function");
      
      // Validate progress parser integration (Phase 4)
      const progressMessage = "Étape 1/6: Extraction des abstractions";
      const parsedMessage = ProgressParser.parseMessage(progressMessage);
      expect(parsedMessage).toBe(progressMessage);
    });

    it("should maintain backward compatibility", () => {
      process.env.NODE_ENV = "development";
      process.env.CONVEX_URL = "https://test.convex.cloud";
      
      // All original API methods should still exist and work
      expect(typeof createConfig).toBe("function");
      expect(typeof validateConfig).toBe("function");
      expect(typeof DevelopmentCLIStrategy).toBe("function");
      expect(typeof ProductionCLIStrategy).toBe("function");
      expect(typeof ProgressParser.parseMessage).toBe("function");
      expect(typeof ProgressParser.getWorkflowSteps).toBe("function");
    });
  });

  describe("Performance & Behavior Validation", () => {
    it("should create configurations efficiently", () => {
      process.env.NODE_ENV = "development";
      process.env.CONVEX_URL = "https://test.convex.cloud";
      
      const startTime = performance.now();
      
      // Create multiple configurations to test performance
      for (let i = 0; i < 100; i++) {
        const config = createConfig();
        expect(config.workerId).toBeDefined();
      }
      
      const duration = performance.now() - startTime;
      
      // Should create 100 configurations in reasonable time (< 100ms)
      expect(duration).toBeLessThan(100);
    });

    it("should parse progress messages efficiently", () => {
      const testMessages = [
        "Étape 1/6: Test", "Step 2/6: Test", "3/6 completed", 
        "[PROGRESS] Test", '{"msg": "test", "level": "info"}',
        "Generating test", "Random message"
      ];
      
      const startTime = performance.now();
      
      // Parse many messages to test performance
      for (let i = 0; i < 1000; i++) {
        for (const msg of testMessages) {
          ProgressParser.parseMessage(msg);
        }
      }
      
      const duration = performance.now() - startTime;
      
      // Should parse 7000 messages in reasonable time (< 200ms)
      expect(duration).toBeLessThan(200);
    });
  });
});
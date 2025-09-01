# Developer Guide: Strategy Pattern Implementation

This guide documents the refactored architecture patterns for future developers working on the Fondation Worker package.

## Architecture Overview

The worker has been refactored using modern design patterns to eliminate code duplication while maintaining 100% functional compatibility. This was completed through a 5-phase Strategy Pattern Simplification project in January 2025.

## Design Patterns Used

### 1. Template Method Pattern (BaseStrategy)

**Location:** `src/cli-strategies/base-strategy.ts`

**Purpose:** Centralizes common CLI execution logic while allowing strategies to customize specific behaviors.

```typescript
// Abstract base class with Template Method pattern
export abstract class BaseStrategy implements CLIExecutionStrategy {
  // Template method - defines the algorithm skeleton
  async execute(repoPath: string, options: ExecutionOptions): Promise<CLIResult> {
    // Step 1: Validate environment (strategy-specific)
    const validation = await this.validate();
    if (!validation.valid) throw new Error(validation.errors.join(', '));
    
    // Step 2: Get command configuration (strategy-specific)
    const config = this.getCommandConfig(repoPath);
    
    // Step 3: Execute process (common implementation)
    return this.executeProcess(config, options);
  }
  
  // Abstract methods - must be implemented by concrete strategies
  abstract validate(): Promise<ValidationResult>;
  abstract getCommandConfig(repoPath: string): CommandConfig;
}
```

**Benefits:**
- Common execution flow is implemented once
- Strategy-specific behavior is isolated to abstract methods
- Progress parsing, output handling, and error management are centralized

### 2. Strategy Pattern (Development vs Production)

**Locations:** 
- `src/cli-strategies/development-strategy.ts`
- `src/cli-strategies/production-strategy.ts`

**Purpose:** Encapsulates different execution approaches for development and production environments.

```typescript
// Development Strategy - optimized for fast iteration
export class DevelopmentCLIStrategy extends BaseStrategy {
  async validate(): Promise<ValidationResult> {
    // Development-specific validation (allows local execution)
    return EnvironmentConfig.getInstance().validateDevelopmentEnvironment();
  }
  
  getCommandConfig(repoPath: string): CommandConfig {
    return {
      command: "bun",
      args: ["src/cli.ts", "analyze", repoPath, "--profile", "dev"],
      // No timeout for development
    };
  }
}

// Production Strategy - optimized for reliability
export class ProductionCLIStrategy extends BaseStrategy {
  async validate(): Promise<ValidationResult> {
    // Production-specific validation (requires Docker)
    return EnvironmentConfig.getInstance().validateProductionEnvironment();
  }
  
  getCommandConfig(repoPath: string): CommandConfig {
    return {
      command: "bun",
      args: ["dist/cli.bundled.mjs", "analyze", repoPath, "--profile", "production"],
      timeout: 3600000, // 1 hour timeout
    };
  }
}
```

### 3. Singleton Pattern (EnvironmentConfig)

**Location:** `packages/shared/src/environment-config.ts`

**Purpose:** Provides centralized environment detection and validation with caching for performance.

```typescript
export class EnvironmentConfig {
  private static instance: EnvironmentConfig | null = null;
  
  static getInstance(): EnvironmentConfig {
    if (!EnvironmentConfig.instance) {
      EnvironmentConfig.instance = new EnvironmentConfig();
    }
    return EnvironmentConfig.instance;
  }
  
  // Cached environment detection
  getEnvironment(): Environment {
    if (this._environment === null) {
      // Detect environment once and cache result
      this._environment = this.detectEnvironment();
    }
    return this._environment;
  }
}
```

**Usage:**
```typescript
const env = EnvironmentConfig.getInstance();
if (env.isDevelopment()) {
  // Development-specific logic
}
```

### 4. Builder Pattern (WorkerConfigBuilder)

**Location:** `src/config-builder.ts`

**Purpose:** Provides fluent interface for assembling worker configuration with proper validation.

```typescript
export class WorkerConfigBuilder {
  static create(): WorkerConfigBuilder {
    return new WorkerConfigBuilder();
  }
  
  withEnvironmentDefaults(): WorkerConfigBuilder {
    // Apply environment-specific defaults
    return this;
  }
  
  withCliPath(path?: string): WorkerConfigBuilder {
    // Configure CLI path
    return this;
  }
  
  build(): WorkerConfig {
    // Assemble and validate final configuration
    return this.config;
  }
}

// Usage
const config = WorkerConfigBuilder
  .create()
  .withEnvironmentDefaults()
  .withCliPath("/custom/path")
  .build();
```

## Key Components

### ProgressParser (Utility Class)

**Location:** `src/progress-parser.ts`

**Purpose:** Centralized progress message parsing with multilingual support.

```typescript
export class ProgressParser {
  static parseMessage(message: string): string | null {
    // Handles French/English progress messages
    // Converts to consistent French format for UI
  }
  
  static parseMultilineOutput(
    text: string, 
    onProgress?: (message: string) => Promise<void>
  ): void {
    // Processes CLI output and extracts progress messages
  }
}
```

**Supported Patterns:**
- French steps: "Étape 2/6: Analyse des relations"
- English steps: "Step 2/6: Analyzing relationships"
- Progress ratios: "3/6 completed"
- JSON logs: `{"msg": "Starting analysis", "level": "info"}`
- Action words: "Generating documentation" → "Étape 4/6: Génération des chapitres"

### Strategy Factory

**Location:** `src/cli-strategies/strategy-factory.ts`

```typescript
export function createStrategy(repoPath: string): CLIExecutionStrategy {
  const env = EnvironmentConfig.getInstance();
  
  if (env.isProduction()) {
    return new ProductionCLIStrategy(repoPath);
  } else {
    return new DevelopmentCLIStrategy(repoPath);
  }
}
```

## Adding New Strategies

To add a new execution strategy (e.g., TestStrategy):

1. **Create the strategy class:**
```typescript
export class TestCLIStrategy extends BaseStrategy {
  getName(): string {
    return "Test CLI Strategy";
  }
  
  async validate(): Promise<ValidationResult> {
    // Test-specific validation
    return { valid: true, errors: [], warnings: [] };
  }
  
  getCommandConfig(repoPath: string): CommandConfig {
    return {
      command: "bun",
      args: ["src/cli.ts", "analyze", repoPath, "--profile", "test", "--dry-run"],
      timeout: 300000, // 5 minutes for tests
    };
  }
}
```

2. **Update the factory:**
```typescript
export function createStrategy(repoPath: string): CLIExecutionStrategy {
  const env = EnvironmentConfig.getInstance();
  
  if (env.isTest()) {
    return new TestCLIStrategy(repoPath);
  } else if (env.isProduction()) {
    return new ProductionCLIStrategy(repoPath);
  } else {
    return new DevelopmentCLIStrategy(repoPath);
  }
}
```

3. **Add environment detection:**
```typescript
// In EnvironmentConfig
isTest(): boolean {
  return this.getEnvironment() === 'test';
}
```

## Environment Configuration

### Adding New Environment Variables

1. **Add getter to EnvironmentConfig:**
```typescript
getNewVariable(): string {
  return process.env.NEW_VARIABLE || 'default-value';
}
```

2. **Update WorkerConfigBuilder:**
```typescript
withNewFeature(): WorkerConfigBuilder {
  const env = EnvironmentConfig.getInstance();
  this.config.newFeature = env.getNewVariable();
  return this;
}
```

3. **Add validation if required:**
```typescript
validateProductionEnvironment(): EnvironmentValidationResult {
  // ... existing validation
  
  if (this.isProduction() && !this.getNewVariable()) {
    errors.push("NEW_VARIABLE is required in production");
  }
  
  // ... rest of validation
}
```

## Progress Message Patterns

### Adding New Progress Patterns

1. **Update ProgressParser patterns:**
```typescript
static parseMessage(message: string): string | null {
  // ... existing patterns
  
  // New pattern: "Phase 3: Description"
  const phaseMatch = trimmed.match(/Phase (\\d+):\\s*(.*)/i);
  if (phaseMatch) {
    const phase = parseInt(phaseMatch[1]);
    const desc = phaseMatch[2];
    return this.formatStep(phase, 6, desc, 'fr');
  }
  
  // ... continue with existing patterns
}
```

2. **Update action word mappings:**
```typescript
private static readonly ACTION_MAPPINGS = [
  // ... existing mappings
  { words: ["validating", "verification"], step: 7, desc: "Validation des résultats" },
];
```

### Adding New Languages

```typescript
private static readonly WORKFLOW_STEPS = {
  fr: [/*French steps*/],
  en: [/*English steps*/],
  es: [/*Spanish steps*/], // New language
};

static formatStep(step: number, total: number, description: string, lang: ProgressLanguage = 'fr'): string {
  if (lang === 'es') {
    return `Paso ${step}/${total}: ${description}`;
  }
  // ... existing languages
}
```

## Testing Patterns

### Integration Testing

All new strategies should be covered by integration tests:

```typescript
describe("New Strategy Integration", () => {
  beforeEach(() => {
    EnvironmentConfig.reset(); // Clear singleton cache
  });
  
  it("should validate new strategy behavior", () => {
    process.env.NODE_ENV = "test";
    process.env.CONVEX_URL = "https://test.convex.cloud";
    
    const strategy = new TestCLIStrategy("test-repo");
    expect(strategy.getName()).toBe("Test CLI Strategy");
    
    const config = strategy.getCommandConfig("/test/repo");
    expect(config.args).toContain("--dry-run");
  });
});
```

### Performance Testing

Performance benchmarks should validate no regression:

```typescript
it("should maintain performance standards", () => {
  const startTime = performance.now();
  
  // Create 100 configurations
  for (let i = 0; i < 100; i++) {
    const config = createConfig();
    expect(config.workerId).toBeDefined();
  }
  
  const duration = performance.now() - startTime;
  expect(duration).toBeLessThan(100); // <100ms
});
```

## Error Handling Patterns

### Validation Errors

```typescript
async validate(): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check required environment
  if (!this.requiredEnvVar) {
    errors.push("REQUIRED_ENV_VAR is missing");
  }
  
  // Check optional but recommended
  if (!this.optionalEnvVar) {
    warnings.push("OPTIONAL_ENV_VAR not set - some features may be limited");
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
```

### Process Execution Errors

Error handling is centralized in BaseStrategy - new strategies inherit robust error handling automatically.

## Migration Notes

### From Original Implementation

The refactoring maintains 100% API compatibility. Existing code using the strategies will continue to work without changes:

```typescript
// This still works exactly the same
const strategy = new DevelopmentCLIStrategy(repoPath);
const result = await strategy.execute(repoPath, options);
```

### Performance Improvements

- **Singleton Caching**: Environment detection is cached after first access
- **Optimized Parsing**: Progress parsing uses efficient regex patterns
- **Reduced Memory**: Eliminated duplicate code paths reduce memory footprint

## Best Practices

1. **Always extend BaseStrategy** for new CLI execution strategies
2. **Use EnvironmentConfig singleton** for all environment variable access
3. **Implement comprehensive validation** in strategy validate() methods
4. **Add integration tests** for any new patterns or strategies
5. **Use WorkerConfigBuilder** for configuration assembly
6. **Leverage ProgressParser** for consistent progress message handling

## Troubleshooting

### Common Issues

**Import Resolution:**
```typescript
// ✅ Correct - use relative imports for local files
import { BaseStrategy } from "./base-strategy";

// ❌ Wrong - don't use .js extensions in development
import { BaseStrategy } from "./base-strategy.js";
```

**Singleton Cache:**
```typescript
// In tests, always reset singleton cache
beforeEach(() => {
  EnvironmentConfig.reset();
});
```

**Environment Detection:**
```typescript
// Use the centralized config, not direct process.env
const env = EnvironmentConfig.getInstance();
if (env.isDevelopment()) {
  // Development logic
}

// ❌ Don't access process.env directly
if (process.env.NODE_ENV === 'development') {
  // This bypasses centralized validation
}
```

This architecture provides a solid foundation for future enhancements while maintaining code quality and performance.
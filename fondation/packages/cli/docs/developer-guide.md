# Developer Guide

This guide is for developers working on the Fondation codebase or running it from source.

## Getting Started

### Prerequisites
- Bun (recommended) or Node.js 18+
- Git
- GitHub account with access token (for package installation)

### Setup

```bash
# Clone the repository
git clone https://github.com/Fondation-io/fondation.git
cd fondation

# Install dependencies
bun install

# Set up environment
export ANTHROPIC_API_KEY="your-api-key"
```

## Development Workflow

### Running from Source

```bash
# Run the CLI directly with Bun
bun run src/cli.ts run "Your prompt"

# Run with file watching (auto-reload on changes)
bun run cli:dev run "Your prompt"

# Start interactive chat UI
bun run dev
```

### Building

```bash
# Build TypeScript to JavaScript
bun run build

# Build production CLI bundle
bun run build:cli

# Run type checking
bun run typecheck
```

### Code Quality

```bash
# Run linter
bun run lint

# Auto-fix linting issues
bun run lint:fix

# Format code
bun run format

# Run all checks
bun run check
```

## Project Structure

```
fondation/
├── src/
│   ├── cli.ts              # Main CLI entry point
│   ├── dev.tsx             # Interactive chat UI entry
│   ├── cli/
│   │   ├── commands/       # CLI command implementations
│   │   │   ├── run.ts      # Headless execution
│   │   │   ├── chat.ts     # Interactive chat
│   │   │   ├── config.ts   # Configuration management
│   │   │   └── version.ts  # Version info
│   │   ├── options/        # Shared CLI options
│   │   └── utils/          # CLI utilities
│   ├── core/               # Core business logic
│   │   ├── claude-query.ts # Claude API integration
│   │   └── session-manager.ts # Session handling
│   ├── ui/                 # React/Ink UI components
│   └── types/              # TypeScript definitions
├── dist/                   # Built output
├── docs/                   # Documentation
└── package.json
```

## Key Components

### CLI Entry Point (`src/cli.ts`)

The main entry point that:
- Sets up Commander.js program
- Loads commands lazily for performance
- Handles global options and configuration
- Implements convenience shortcuts

### Command Structure

Each command follows this pattern:

```typescript
import { Command } from 'commander';

export const myCommand = new Command('mycommand')
  .description('Description here')
  .option('-f, --flag', 'flag description')
  .action(async (options, command) => {
    const config = command.optsWithGlobals()._config;
    const logger = command.optsWithGlobals()._logger;
    
    // Implementation
  });
```

### Configuration System

- Uses `cosmiconfig` for configuration file discovery
- Looks for `.fondation.*` files (json, yaml, js)
- Cascading priority: CLI flags → Profile → Config file → Defaults

### Adding a New Command

1. Create command file in `src/cli/commands/`:
```typescript
// src/cli/commands/example.ts
import { Command } from 'commander';

export const exampleCommand = new Command('example')
  .description('Example command')
  .action(async (options, command) => {
    console.log('Example command executed');
  });
```

2. Register in `src/cli.ts`:
```typescript
{
  name: 'example',
  load: async () => {
    const { exampleCommand } = await import('./cli/commands/example');
    program.addCommand(exampleCommand);
  },
}
```

## Testing Commands

### Manual Testing

```bash
# Test run command
bun run src/cli.ts run "test prompt" --verbose

# Test with different flags
bun run src/cli.ts run -p "test" --thinking --quiet

# Test config command
bun run src/cli.ts config show

# Test chat command (requires TTY)
bun run src/cli.ts chat
```

### Testing the Built CLI

```bash
# Build first
bun run build:cli

# Test the bundle
node dist/cli.bundled.cjs run "test"

# Or install locally
npm link
fondation run "test"
```

## Debugging

### Enable Verbose Logging

```bash
# Maximum verbosity
bun run src/cli.ts run "test" --verbose

# With file logging
bun run src/cli.ts run "test" --verbose --log-file debug.log
```

### Using VS Code Debugger

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug CLI",
      "runtimeExecutable": "bun",
      "program": "${workspaceFolder}/src/cli.ts",
      "args": ["run", "-p", "test prompt", "--verbose"],
      "console": "integratedTerminal"
    }
  ]
}
```

## Environment Variables

```bash
# Required
export ANTHROPIC_API_KEY="sk-ant-..."

# Optional
export CLAUDE_MODEL="claude-opus-4-20250514"
export CLAUDE_OUTPUT_DIR="./output"
export ENABLE_MESSAGE_LOGGING="true"
```

## Common Development Tasks

### Updating Dependencies

```bash
# Update all dependencies
bun update

# Update specific dependency
bun add commander@latest
```

### Running Pre-commit Hooks

```bash
# Hooks run automatically on commit
# To run manually:
bunx lint-staged
```

### Building for Distribution

```bash
# Clean build
rm -rf dist/
bun run build:cli

# Test the distribution build
node dist/cli.bundled.cjs version
```

## Architecture Decisions

### Why Lazy Loading?
Commands are loaded on-demand to improve startup performance. The CLI only loads what it needs.

### Why Bun for Development?
- Faster startup and execution
- Built-in TypeScript support
- Better developer experience

### Configuration Priority
1. CLI flags (highest)
2. Profile settings
3. Config file
4. Environment variables
5. Built-in defaults (lowest)

## Contributing

### Code Style
- TypeScript with strict mode
- No unnecessary comments
- Follow existing patterns
- Run formatter before committing

### Commit Messages
- Use conventional commits
- Keep messages concise
- Reference issues when applicable

### Pull Request Process
1. Fork and create feature branch
2. Make changes with tests
3. Run `bun run check`
4. Submit PR with description

## Troubleshooting Development

### TypeScript Errors
```bash
# Check types
bun run typecheck

# Clean and rebuild
rm -rf dist/
bun run build
```

### Module Resolution Issues
```bash
# Clear Bun cache
bun pm cache rm

# Reinstall dependencies
rm -rf node_modules bun.lockb
bun install
```

### Build Failures
```bash
# Check for circular dependencies
bunx madge --circular src/

# Verify all imports
bun run build --noEmit
```
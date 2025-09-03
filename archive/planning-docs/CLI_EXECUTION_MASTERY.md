# CLI Execution Mastery - Complete Testing Guide

## Overview
This document provides step-by-step procedures for executing the Fondation CLI analyze command using three different methods:
1. Source file execution
2. Distribution build execution  
3. Docker container execution

## Prerequisites

### Claude Authentication
The Fondation CLI uses the Claude Code SDK which requires authentication. The authentication is handled through:
- **Host System**: Uses the installed `claude` CLI tool (installed via Homebrew or npm)
- **Docker**: Requires `CLAUDE_CODE_OAUTH_TOKEN` environment variable

### Environment Setup
Ensure the following environment variables are set in your `.env` file:
```bash
# Claude Code OAuth Token (required for Docker execution)
CLAUDE_CODE_OAUTH_TOKEN="your-token-here"
```

## Test Repository Setup

Create a minimal test repository for all testing methods:

```bash
# Create test repository
mkdir -p /tmp/test-repo
cd /tmp/test-repo

# Create a simple JavaScript file
cat > index.js << 'EOF'
// Simple test application
function greet(name) {
  return `Hello, ${name}!`;
}

function calculate(a, b) {
  return a + b;
}

module.exports = { greet, calculate };
EOF

echo "Test repository created at /tmp/test-repo"
```

## Method 1: Source File Execution

### Overview
Running the CLI directly from TypeScript source files using Bun runtime.

### Setup
```bash
cd /Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation/packages/cli
```

### Available Scripts
- `bun run cli` - Run CLI from source
- `bun run cli:source` - Run with NODE_ENV=development
- `bun run cli:dev` - Run with file watching
- `bun run cli:test` - Run test analyze command

### Execution Commands

#### Basic execution:
```bash
bun run src/cli.ts --version
# Output: 1.0.0-beta.9
```

#### Analyze command:
```bash
bun run src/cli.ts analyze /tmp/test-repo --steps extract --verbose
```

#### Using npm script:
```bash
bun run cli:source analyze /tmp/test-repo --steps extract
```

### Output Location
Default: `/tmp/test-repo/.claude-tutorial-output/`

### Successful Output Indicators
- `step1_abstractions.yaml` created
- Log shows: "Analysis complete!"
- Duration reported in milliseconds

### Authentication
- Uses system-installed Claude CLI (`/opt/homebrew/bin/claude`)
- No explicit token needed if `claude -p "1+1"` works on host

## Method 2: Distribution Build Execution

### Overview
Running the CLI from compiled JavaScript distribution files.

### Build Process
```bash
cd /Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation/packages/cli

# Build the distribution
bun run build

# This creates:
# - dist/cli.js (TypeScript compiled)
# - dist/cli.bundled.mjs (ESM bundle with dependencies)
# - dist/prompts/ (copied prompt templates)
```

### Verification
```bash
# Verify build
bun run build:verify
# Output: 1.0.0-beta.9

# Check build artifacts
ls -la dist/
# Should show cli.js, cli.bundled.mjs, prompts/
```

### Execution Commands

#### Bundled version (recommended):
```bash
bun dist/cli.bundled.mjs --version
bun dist/cli.bundled.mjs analyze /tmp/test-repo --steps extract --output-dir /tmp/test-repo/dist-output
```

#### Non-bundled version:
```bash
bun dist/cli.js --version
bun dist/cli.js analyze /tmp/test-repo --steps extract --output-dir /tmp/test-repo/dist-js-output
```

### Output Locations
- Bundled: `/tmp/test-repo/dist-output/`
- Non-bundled: `/tmp/test-repo/dist-js-output/`

### Key Differences from Source
- Faster startup (pre-compiled)
- Bundled version includes all dependencies
- Prompts are in `dist/prompts/` not `prompts/`

## Method 3: Docker Container Execution

### Overview
Running the CLI inside a Docker container for consistent, isolated execution.

### Docker Build
```bash
cd /Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation

# Build Docker image
bun run docker:build
# Or manually:
# docker build -f packages/cli/Dockerfile.production -t fondation/cli:latest .

# Verify image
docker images | grep fondation
# Should show: fondation/cli:latest
```

### Authentication Setup
Docker requires the Claude OAuth token as an environment variable:

```bash
# Export token for current session
export CLAUDE_CODE_OAUTH_TOKEN="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"

# Or source from .env file
source .env
```

### Docker Execution Commands

#### Test Docker CLI version:
```bash
docker run --rm fondation/cli:latest --version
# Output: 1.0.0-beta.9
```

#### Run analyze with authentication:
```bash
docker run --rm \
  -e CLAUDE_CODE_OAUTH_TOKEN="${CLAUDE_CODE_OAUTH_TOKEN}" \
  -v /tmp/test-repo:/workspace \
  -v /tmp/docker-output:/output \
  fondation/cli:latest \
  analyze /workspace --output-dir /output --steps extract
```

#### Using env file:
```bash
docker run --rm \
  --env-file .env \
  -v /tmp/test-repo:/workspace \
  -v /tmp/docker-output:/output \
  fondation/cli:latest \
  analyze /workspace --output-dir /output --steps extract
```

### Volume Mounts
- `/workspace` - Mount your repository here
- `/output` - Mount for analysis results

### Output Location
Host: `/tmp/docker-output/`
Container: `/output/`

### Troubleshooting Docker Authentication

If you see `Claude Code process exited with code 1`:
1. Ensure `CLAUDE_CODE_OAUTH_TOKEN` is set correctly
2. Check token is not expired
3. Verify token format (starts with `sk-ant-oat`)

## Comparative Analysis

### Execution Speed
1. **Source**: Slowest (TypeScript compilation overhead)
2. **Distribution**: Fast (pre-compiled)
3. **Docker**: Moderate (container startup overhead)

### Setup Complexity
1. **Source**: Simple (just Bun required)
2. **Distribution**: Moderate (build step required)
3. **Docker**: Complex (Docker + token setup)

### Authentication
1. **Source**: Uses host Claude CLI
2. **Distribution**: Uses host Claude CLI
3. **Docker**: Requires explicit token

### Use Cases
- **Source**: Development, debugging, quick iterations
- **Distribution**: Testing builds, performance testing
- **Docker**: Production, CI/CD, consistent environments

## Quick Reference Commands

```bash
# Source execution
bun run cli:source analyze /tmp/test-repo --steps extract

# Distribution execution
bun dist/cli.bundled.mjs analyze /tmp/test-repo --steps extract

# Docker execution (with token)
source .env && docker run --rm \
  -e CLAUDE_CODE_OAUTH_TOKEN \
  -v /tmp/test-repo:/workspace \
  -v /tmp/docker-output:/output \
  fondation/cli:latest \
  analyze /workspace --output-dir /output --steps extract
```

## Security Considerations

1. **Token Storage**: Store `CLAUDE_CODE_OAUTH_TOKEN` in `.env` files, never commit to git
2. **Docker Images**: Don't bake tokens into Docker images
3. **Environment Variables**: Use `--env-file` instead of inline `-e` for production

## Next Steps

After mastering these execution methods, you can:
1. Integrate into CI/CD pipelines
2. Create automated analysis workflows
3. Build custom Docker images with pre-configured settings
4. Optimize performance for large repositories
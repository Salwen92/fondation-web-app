# Quick Start Guide - Fondation CLI

Get up and running with Fondation CLI in under 5 minutes.

## Prerequisites
- Bun installed (`curl -fsSL https://bun.sh/install | bash`)
- Docker installed (for production mode)
- Claude CLI installed (`brew install claude` or via npm)

## 1. Clone and Setup (2 minutes)

```bash
# Clone repository
git clone https://github.com/fondation/fondation.git
cd fondation

# Install dependencies
bun install

# Build the project
bun run build
```

## 2. Configure Authentication (1 minute)

Create a `.env` file with your OAuth token:

```bash
# .env
CLAUDE_CODE_OAUTH_TOKEN="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"
```

## 3. Run Your First Analysis (2 minutes)

### Option A: Quick Test (Source Execution)
```bash
cd packages/cli

# Create test repository
mkdir -p /tmp/test-repo
echo "console.log('Hello');" > /tmp/test-repo/index.js

# Run analysis
bun run cli:source analyze /tmp/test-repo --steps extract

# Check output
ls -la /tmp/test-repo/.claude-tutorial-output/
```

### Option B: Production Mode (Docker)
```bash
# Build Docker image
bun run docker:build

# Run with Docker
source .env
docker run --rm \
  -e CLAUDE_CODE_OAUTH_TOKEN \
  -v /tmp/test-repo:/workspace \
  -v /tmp/output:/output \
  fondation/cli:latest \
  analyze /workspace --output-dir /output --steps extract

# Check output
ls -la /tmp/output/
```

## Success! 🎉

You should see:
- `step1_abstractions.yaml` - Core concepts extracted
- Log message: "Analysis complete!"

## Next Steps

### Full Analysis (All 6 Steps)
```bash
# Remove --steps flag to run all steps
bun run cli:source analyze /tmp/test-repo
```

Output will include:
- `step1_abstractions.yaml`
- `step2_relationships.yaml`
- `step3_order.yaml`
- `chapters/` - Generated chapter content
- `reviewed-chapters/` - Enhanced chapters
- `tutorials/` - Interactive tutorials

### Analyze Your Own Repository
```bash
# Replace with your repository path
bun run cli:source analyze ~/projects/my-app
```

### Start the Web Interface
```bash
# Start all services
bun run dev

# Open http://localhost:3000
```

## Common Commands

```bash
# Development
bun run dev              # Start all services
bun run dev:cli         # CLI development mode
bun run dev:web         # Web interface only
bun run dev:worker      # Worker service only

# Production
bun run build           # Build all packages
bun run docker:build    # Build Docker image
bun run test           # Run tests

# Utilities
bun run clean          # Clean build artifacts
bun run typecheck      # Type checking
bun run lint           # Linting
```

## Troubleshooting

### "Claude Code process exited with code 1"
```bash
# Verify token is set
echo $CLAUDE_CODE_OAUTH_TOKEN

# Test authentication
claude -p "1+1"  # Should output: 2
```

### "Command not found: bun"
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc  # or ~/.zshrc
```

### Docker build fails
```bash
# Clean Docker cache
docker system prune -f

# Rebuild
bun run docker:build
```

## Environment Variables

Essential variables for `.env`:
```bash
# Required for Docker
CLAUDE_CODE_OAUTH_TOKEN="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"

# Optional
CLAUDE_OUTPUT_DIR=.claude-tutorial-output
CLAUDE_MODEL=claude-sonnet-4-20250514
```

## Getting Help

- Documentation: `/docs` folder
- Issues: [GitHub Issues](https://github.com/fondation/fondation/issues)
- Logs: Check with `--verbose` flag

## Tips for Success

1. **Start small**: Test with simple repositories first
2. **Use steps flag**: Run individual steps to understand the process
3. **Check logs**: Use `--verbose` for detailed output
4. **Save outputs**: Use `--output-dir` to organize results

## Example: Complete Workflow

```bash
# 1. Setup
git clone https://github.com/fondation/fondation.git
cd fondation
bun install

# 2. Configure
echo 'CLAUDE_CODE_OAUTH_TOKEN="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"' > .env

# 3. Build
bun run build

# 4. Test
cd packages/cli
mkdir -p /tmp/demo && echo "function test() { return 42; }" > /tmp/demo/test.js
bun run cli:source analyze /tmp/demo --steps extract

# 5. Verify
cat /tmp/demo/.claude-tutorial-output/step1_abstractions.yaml
```

Ready to analyze your codebase! 🚀
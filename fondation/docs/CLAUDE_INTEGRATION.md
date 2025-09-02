# Claude Integration Guide

This guide covers the integration of Claude AI capabilities in the Fondation project.

## Overview

Fondation uses the Claude SDK (`@anthropic-ai/claude-code`) to provide AI-powered code analysis and documentation generation. The integration is primarily used in the CLI package for the `analyze` command.

## Runtime Environment

**Important:** This project uses **Bun** as the JavaScript runtime, not Node.js.

- **Runtime:** Bun v1.2.5
- **Package Manager:** Bun
- **Docker Base Image:** `oven/bun:1.2.5-slim`

### Key Differences from Node.js

1. **Use `bun` instead of `node`:**
   ```bash
   # ❌ Incorrect
   node dist/cli.bundled.mjs
   
   # ✅ Correct
   bun dist/cli.bundled.mjs
   ```

2. **Use `bunx` instead of `npx` for package execution**

3. **In Docker containers:**
   - The `node` command is a symlink to `bun`
   - Both work, but `bun` is preferred for clarity

## Claude SDK Setup

### Local Development

1. **Install the SDK:**
   ```bash
   cd packages/cli
   bun add @anthropic-ai/claude-code
   ```

2. **Authenticate (on host system only):**
   ```bash
   # For host system development
   claude -p "1+1"  # Test authentication
   ```

3. **Test the integration:**
   ```bash
   bun run cli analyze /path/to/repo
   ```

### Docker Environment

The Docker image handles Claude SDK setup automatically:

```dockerfile
# The Dockerfile installs Claude SDK
RUN cd /app/cli && bun add @anthropic-ai/claude-code@latest
```

To authenticate in Docker (use environment variables):
```bash
# Set token in .env file and run with environment variable
source .env && docker run --rm \
  -e CLAUDE_CODE_OAUTH_TOKEN="$CLAUDE_CODE_OAUTH_TOKEN" \
  fondation/cli:latest --version
```

## Usage in Code

### CLI Package (`packages/cli`)

The main Claude integration is in `packages/cli/src/core/claude-query.ts`:

```typescript
import { Conversation } from '@anthropic-ai/claude-code';

export class ClaudeQueryProcessor {
  private conversation: Conversation;
  
  async processQuery(prompt: string): Promise<string> {
    // Uses Claude SDK to process prompts
  }
}
```

### Worker Package (`packages/worker`)

The worker executes the CLI commands that use Claude:

```typescript
// In packages/worker/src/cli-executor.ts
const runCmd = `cd /app/cli && bun dist/cli.bundled.mjs analyze /tmp/repo --profile production`;
```

## Environment Variables

### **Critical for Worker Startup (Phase 2 Finding):**

```bash
# CONVEX_URL is REQUIRED - worker crashes with exit code 158 without this
CONVEX_URL=https://basic-stoat-666.convex.cloud  # CRITICAL

# Development mode uses host authentication
NODE_ENV=development  # Uses bunx claude auth tokens

# Local execution mode (recommended for development)
FONDATION_EXECUTION_MODE=local
```

### **Production Environment Variables:**

```bash
# Claude OAuth Token (for API access)
CLAUDE_CODE_OAUTH_TOKEN="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"

# GitHub Token (for private repo access)
GITHUB_TOKEN=ghp_your-github-token

# Convex URL (for job processing)
CONVEX_URL=https://your-deployment.convex.cloud
```

### Setting Environment Variables

**Local Development:**
```bash
export CLAUDE_CODE_OAUTH_TOKEN="sk-ant-..."
bun run dev
```

**Docker:**
```bash
docker run --rm -e CLAUDE_CODE_OAUTH_TOKEN="${CLAUDE_CODE_OAUTH_TOKEN}" fondation/cli:latest analyze /workspace
```

**Docker Compose:**
```yaml
services:
  worker:
    image: fondation/cli:latest
    environment:
      - CLAUDE_CODE_OAUTH_TOKEN=${CLAUDE_CODE_OAUTH_TOKEN}
    command: worker
```

## Common Commands

### Running the Analyze Command

**Local:**
```bash
cd packages/cli
bun run cli analyze /path/to/repo --output-dir ./output
```

**Docker:**
```bash
docker run --rm \
  -v /path/to/repo:/workspace \
  -v /path/to/output:/output \
  fondation/cli:latest \
  analyze /workspace --output-dir /output
```

### Starting the Worker

**Local:**
```bash
cd packages/cli
bun run cli worker --convex-url https://your.convex.cloud
```

**Docker:**
```bash
docker run -d \
  -e CONVEX_URL=https://your.convex.cloud \
  -e CLAUDE_CODE_OAUTH_TOKEN=sk-ant-... \
  fondation/cli:latest worker
```

## Troubleshooting

### **Issue: Worker crashes with exit code 158 (Phase 2 Critical Finding)**
**Root Cause:** Missing CONVEX_URL environment variable  
**Solution:**
```bash
# Always set CONVEX_URL when starting worker
CONVEX_URL=https://basic-stoat-666.convex.cloud bun run dev

# Verify it's set
echo $CONVEX_URL  # Should show URL, not empty
```

### **Issue: CLI execution fails with "profile not found" (Phase 2 Fixed)**
**Root Cause:** Using invalid profile "development" instead of "dev"  
**Status:** ✅ Fixed in `packages/worker/src/cli-strategies/development-strategy.ts`  
**Solution:** Use correct profile names:
```bash
# Correct profiles
bun src/cli.ts analyze /path --profile dev        # Development
bun src/cli.ts analyze /path --profile production # Production
```

### Issue: "executable file not found"
**Solution:** Use `bunx` instead of `npx`, or `bun` instead of `node`

### Issue: Claude authentication fails
**Solution:** 
1. Re-authenticate: `bunx claude auth`
2. Check authentication status: `bunx claude auth status`
3. For production, check token is set: `echo $CLAUDE_CODE_OAUTH_TOKEN`
4. Ensure token is passed to Docker container

### Issue: Worker can't find Claude SDK
**Solution:** The SDK must be installed as an external dependency (not bundled):
```bash
# Correct - SDK is external
bun build --external @anthropic-ai/claude-code

# Wrong - SDK is bundled (won't work)
bun build --no-external
```

## Best Practices

1. **Always use Bun commands** in documentation and scripts
2. **Keep Claude SDK external** when bundling (for OAuth to work)
3. **Pass tokens at runtime**, not build time
4. **Use environment variables** for sensitive data
5. **Test locally with Bun** before Docker deployment

## Security Considerations

1. **Never commit tokens** to version control
2. **Use `.env` files** for local development (add to `.gitignore`)
3. **Pass tokens via environment** in production
4. **Rotate tokens regularly**
5. **Use read-only GitHub tokens** when possible

## References

- [Bun Documentation](https://bun.sh/docs)
- [Claude SDK Documentation](https://docs.anthropic.com/claude/docs/claude-sdk)
- [Docker Bun Images](https://hub.docker.com/r/oven/bun)
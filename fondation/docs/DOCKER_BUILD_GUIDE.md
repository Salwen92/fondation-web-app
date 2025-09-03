# Docker Build Guide - Fondation CLI

## Overview
This guide documents the Docker build process for the Fondation CLI, including production deployment with Doppler secret management.

**IMPORTANT**: This project uses a single, secure docker-compose file: `docker-compose.doppler.yml`

## Important: Bun vs Alpine Compatibility Issue

### The Problem
When building Docker images for the Fondation CLI, you may encounter this issue:
- **Bun doesn't provide official binaries for Alpine Linux on ARM64 architecture** (common on Apple Silicon Macs)
- The project uses Bun for package management and building
- Traditional Node.js Docker images use Alpine Linux for smaller size

### The Solution
We use the official Bun Docker images (`oven/bun`) instead of Node.js Alpine images. These images:
- Are maintained by the Bun team
- Handle all platform compatibility issues
- Use Debian instead of Alpine (slightly larger but fully compatible)
- Support both AMD64 and ARM64 architectures

## Production Setup Guide

### Prerequisites
- Docker Desktop installed and running
- Doppler CLI installed and authenticated (`doppler login`)
- Access to the Fondation Doppler project

### Step 1: Build the Production Image

1. **Navigate to the monorepo root:**
   ```bash
   cd fondation-web-app/fondation
   ```

2. **Build the production Docker image:**
   ```bash
   docker build -f packages/cli/Dockerfile.production \
     -t fondation/cli:latest \
     -t fondation/cli:$(date +%Y-%m-%d) \
     .
   ```

3. **Verify the build:**
   ```bash
   docker images | grep fondation/cli
   ```

### Step 2: Configure Doppler Secrets

1. **Ensure Claude token is set in production config:**
   ```bash
   doppler secrets set CLAUDE_CODE_OAUTH_TOKEN="sk-ant-oat01-YOUR-TOKEN" \
     --config prd --project fondation
   ```

2. **Verify secrets are configured:**
   ```bash
   doppler secrets --config prd --project fondation
   ```

### Step 3: Production Deployment

1. **Generate Doppler token for deployment:**
   ```bash
   DOPPLER_TOKEN_WORKER=$(doppler configs tokens create worker-prod-$(date +%Y%m%d) \
     --project fondation --config prd --plain)
   ```

2. **Deploy using docker-compose:**
   ```bash
   DOPPLER_TOKEN_WORKER="$DOPPLER_TOKEN_WORKER" \
     docker-compose -f docker-compose.doppler.yml up -d
   ```

### Step 4: Test the Deployment

1. **Check worker status:**
   ```bash
   docker-compose -f docker-compose.doppler.yml logs worker
   ```

2. **Test analyze command:**
   ```bash
   DOPPLER_TOKEN_WORKER="$DOPPLER_TOKEN_WORKER" \
     docker-compose -f docker-compose.doppler.yml run --rm \
     -v /path/to/repo:/workspace \
     -v /path/to/output:/output \
     worker analyze /workspace --output-dir /output
   ```

## Multi-Stage Dockerfile Explained

The Dockerfile uses a multi-stage build process:

### Stage 1: Builder
- Uses `oven/bun:1.2.5` as the base image
- Installs all dependencies using `bun install`
- Builds TypeScript code for both shared and CLI packages
- Bundles the CLI using Bun's bundler
- Copies prompt files

### Stage 2: Runtime
- Uses `oven/bun:1.2.5-slim` for smaller size
- Installs only runtime dependencies (bash, curl, git)
- Copies the bundled CLI from the builder stage
- Installs the Claude SDK separately (required for OAuth authentication)

## Authentication with Claude

### ✅ Production Method: Doppler Secret Management

**IMPORTANT**: Production deployments use Doppler for secure secret management. Never use environment variables directly in production.

#### For New Developers - Initial Setup:

1. **Get access to Doppler:**
   ```bash
   # Install Doppler CLI
   curl -Ls https://cli.doppler.com/install.sh | sudo sh
   
   # Authenticate
   doppler login
   
   # Set up project locally
   cd fondation && doppler setup --project fondation --config prd
   ```

2. **Verify you have access:**
   ```bash
   doppler secrets --config prd --project fondation
   ```

#### For Production Deployment:

**Always use `docker-compose.doppler.yml` - this is the ONLY production docker-compose file:**

```bash
# 1. Generate deployment token
DOPPLER_TOKEN_WORKER=$(doppler configs tokens create deployment-$(date +%Y%m%d) \
  --project fondation --config prd --plain)

# 2. Deploy
DOPPLER_TOKEN_WORKER="$DOPPLER_TOKEN_WORKER" \
  docker-compose -f docker-compose.doppler.yml up -d

# 3. Monitor
docker-compose -f docker-compose.doppler.yml logs -f worker
```

### ❌ Interactive Authentication (Does Not Work)

**⚠️ Warning:** Interactive authentication (`docker exec -it ... bunx claude auth`) **does not work in Docker containers**.

The Claude CLI requires OAuth token authentication via environment variable when running in containers.

**Always use the `CLAUDE_CODE_OAUTH_TOKEN` environment variable for Docker authentication.**

## Common Issues and Solutions

### Issue 1: "npx: executable file not found"
**Problem:** Trying to use `npx` in a Bun-based Docker image
**Solution:** Use `bunx` or `bun x` instead of `npx`

### Issue 2: "Failed to install package @oven/bun-linux-aarch64"
**Problem:** Trying to install Bun in Alpine Linux on ARM64
**Solution:** Use the official Bun Docker images instead of installing Bun manually

### Issue 3: "lockfile had changes, but lockfile is frozen"
**Problem:** The lockfile differs between local and Docker environments
**Solution:** Remove `--frozen-lockfile` flag in Docker builds, or regenerate lockfile

### Issue 4: Build takes too long or hangs
**Problem:** The bundling script might be stuck
**Solution:** Use Bun's built-in bundler directly instead of complex build scripts

## Testing the Docker Image

### Basic Test
```bash
docker run --rm fondation/cli:latest --version
```

### Analyze Command Test
```bash
# Create a test repository
mkdir -p /tmp/test-repo
echo "console.log('test');" > /tmp/test-repo/index.js

# Run analysis with authentication
docker run --rm \
  -e CLAUDE_CODE_OAUTH_TOKEN="${CLAUDE_CODE_OAUTH_TOKEN}" \
  -v /tmp/test-repo:/workspace \
  -v /tmp/output:/output \
  fondation/cli:latest \
  analyze /workspace --output-dir /output
```

## Production Deployment

### Using Docker with Authentication
The worker service uses the standard image with token authentication:

```bash
# In your worker configuration
FONDATION_WORKER_IMAGE=fondation/cli:latest
CLAUDE_CODE_OAUTH_TOKEN="sk-ant-oat01-YOUR-TOKEN-HERE"
```

### Docker Compose Example
```yaml
version: '3.8'
services:
  worker:
    image: fondation/cli:latest
    environment:
      - CONVEX_URL=${CONVEX_URL}
      - CLAUDE_CODE_OAUTH_TOKEN=${CLAUDE_CODE_OAUTH_TOKEN}
      - NODE_ENV=production
    volumes:
      - ./workspaces:/workspace
      - ./outputs:/output
    command: worker
```

## Maintenance

### Updating the CLI
1. Make changes to the CLI code
2. Rebuild the Docker image with a new tag
3. Ensure `CLAUDE_CODE_OAUTH_TOKEN` is set in environment
4. Update the worker service to use the new image

### Cleaning Up Old Images
```bash
# List all Fondation images
docker images | grep fondation

# Remove old images
docker rmi fondation/cli:old-tag

# Remove dangling images
docker image prune -f
```

## Key Learnings

1. **Always use Bun-native commands** in Bun Docker images (bunx instead of npx)
2. **Build from monorepo root** to access all packages
3. **Multi-stage builds** keep the final image size reasonable
4. **Document platform-specific issues** for team members on different architectures
5. **Test with OAuth token** before marking an image as production-ready
6. **Understand execution methods**:
   - `bun run script-name` - Runs npm scripts defined in package.json
   - `bun file.mjs` - Directly executes a bundled JavaScript file with Bun runtime
   - The Docker image uses Bun as the runtime (node is a symlink to bun)
   - Use `bun` for bundled executables, `bun run` for development scripts

## References

- [Bun Docker Images](https://hub.docker.com/r/oven/bun)
- [Docker Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Claude SDK Documentation](https://docs.anthropic.com/claude/docs/claude-sdk)

---

Last Updated: 2025-08-31
Tested On: macOS (Apple Silicon), Docker Desktop 4.x
# Fondation Worker

Dual-mode job processor that polls Convex for pending jobs and executes the Fondation CLI with Claude AI analysis. Supports both development and production execution modes with environment-aware adaptation.

## Architecture

The worker is a long-running process with dual execution modes:

### 🔧 **Development Mode**
- **Runtime**: Local Bun/Node.js process (no Docker required)
- **CLI Execution**: Direct TypeScript source execution (`bun src/cli.ts`)
- **Authentication**: Uses host Claude CLI authentication (`bunx claude auth`)
- **Hot Reload**: Automatic restarts on file changes with `tsx watch`
- **Debug**: Enhanced logging and error reporting

### 🏭 **Production Mode**  
- **Runtime**: Docker container with strict isolation
- **CLI Execution**: Bundled CLI (`dist/cli.bundled.mjs`)
- **Authentication**: Environment variable authentication (`CLAUDE_CODE_OAUTH_TOKEN`)
- **Stability**: Optimized for reliability and consistency

### Core Workflow (Both Modes)
1. Polls Convex database for pending jobs (configurable interval)
2. Claims jobs atomically with lease-based locking
3. Clones GitHub repositories to temporary directory
4. Executes CLI using appropriate strategy for 6-step analysis
5. Saves results back to Convex with real-time progress updates
6. Provides health checks on port 8081

### 6-Step Analysis Pipeline
The worker executes a 6-step analysis process with French UI messages:
- **Étape 1/6**: Extraction des abstractions (~60s)
- **Étape 2/6**: Analyse des relations (~60s)
- **Étape 3/6**: Ordonnancement des chapitres (~30s)
- **Étape 4/6**: Génération des chapitres (~60s)
- **Étape 5/6**: Révision des chapitres (~40s)
- **Étape 6/6**: Finalisation de l'analyse (~40s)

## Development Setup

### Quick Start (Development Mode)
```bash
# 1. Install dependencies
bun install

# 2. Authenticate Claude CLI (once)
bunx claude auth

# 3. Start Convex database
bun run dev:convex  # Terminal 1

# 4. Start worker in development mode
bun run dev:worker  # Terminal 2 (or use dev:worker:local for pure local mode)
```

### Development Scripts
```bash
# Standard development (auto-detects environment)
bun run dev

# Force local execution mode (bypasses all Docker checks)
bun run dev:local

# Debug mode (enhanced logging)
bun run dev:debug

# Health check
bun run health

# Environment diagnostics
bun run diagnostics
```

## Environment Variables

### Core Variables (Both Modes)
```bash
# Required
CONVEX_URL=https://your-deployment.convex.cloud

# Worker Configuration
WORKER_ID=worker-1                  # Unique worker ID (auto-generated if not set)
POLL_INTERVAL=5000                  # Job polling interval in ms (default: 5s)
LEASE_TIME=300000                   # Job lease duration in ms (default: 5 minutes)
HEARTBEAT_INTERVAL=60000           # Lease heartbeat interval in ms (default: 1 minute)
MAX_CONCURRENT_JOBS=1               # Maximum concurrent jobs per worker
```

### Development-Specific Variables
```bash
# Environment Detection
NODE_ENV=development               # Enables development mode
FONDATION_ENV=development          # Override environment detection
FONDATION_EXECUTION_MODE=local     # Force local execution mode

# Development Features
FONDATION_DEV_DOCKER_BYPASS=true   # Skip Docker requirements
FONDATION_DEV_DEBUG=true           # Enhanced logging
FONDATION_DEV_HOT_RELOAD=true      # Auto-restart on changes

# Paths
TEMP_DIR=/tmp/fondation-dev        # Development temp directory
CLI_PATH=@fondation/cli/cli.ts      # CLI path (TypeScript source)
```

### Production Variables
```bash
# Environment
NODE_ENV=production
DOCKER_CONTAINER=true              # Indicates Docker environment

# Authentication (required for production)
CLAUDE_CODE_OAUTH_TOKEN=sk-ant-... # Claude API authentication
GITHUB_TOKEN=ghp_...               # GitHub private repo access

# Docker
FONDATION_WORKER_IMAGE=fondation/cli:authenticated  # Docker image with Claude auth

# Paths
TEMP_DIR=/tmp/fondation           # Production temp directory
CLI_PATH=/app/packages/cli/dist/cli.bundled.mjs    # Bundled CLI path
```

## Authentication Setup

### 🔧 **Development Authentication**
No Docker setup required! Authentication uses your host Claude CLI:

```bash
# One-time setup (run once per machine)
bunx claude auth

# Verify authentication works
bunx claude --help

# Start development worker
bun run dev:worker
```

### 🏭 **Production Authentication**  
⚠️ **Production only**: Requires pre-authenticated Docker image. See `DOCKER_BUILD_GUIDE.md` for complete setup.

### Quick Setup

```bash
# 1. Build base CLI image
docker build -f packages/cli/Dockerfile.production -t fondation/cli:latest .

# 2. Create authentication container
docker run -d --name auth fondation/cli:latest tail -f /dev/null

# 3. Authenticate interactively (requires browser)
docker exec -it auth npx claude auth

# 4. Commit authenticated image
docker commit auth fondation/cli:authenticated
docker rm -f auth
```

### Production Deployment

```bash
# Deploy worker with authenticated image
docker run -d \
  --name fondation-worker \
  --restart unless-stopped \
  -e CONVEX_URL=https://your-deployment.convex.cloud \
  -e WORKER_ID=worker-1 \
  fondation/cli:authenticated
```

## Docker Build

⚠️ **IMPORTANT**: Docker images must be rebuilt after code changes!

For complete instructions, see:
- `DOCKER_BUILD_GUIDE.md` - Docker build process
- `CLAUDE.md` - E2E testing and troubleshooting


## Health Checks

The worker exposes health endpoints on port 8081:

- `GET /health` - Health status and system info
- `GET /metrics` - Job processing metrics

```bash
# Check health
curl http://localhost:8080/health

# Get metrics
curl http://localhost:8080/metrics
```

## Scaling

Run multiple workers by deploying additional containers:

```bash
# Worker 1
docker run -d \
  --name worker-1 \
  -e WORKER_ID=worker-1 \
  -e CONVEX_URL=https://your-deployment.convex.cloud \
  fondation/cli:authenticated

# Worker 2  
docker run -d \
  --name worker-2 \
  -e WORKER_ID=worker-2 \
  -e CONVEX_URL=https://your-deployment.convex.cloud \
  fondation/cli:authenticated
```

## Troubleshooting

### Development Issues

#### Worker Won't Start
```bash
# Check environment detection
bun run diagnostics

# Force local execution mode
bun run dev:local

# Check Claude authentication
bunx claude --help

# Check if required packages built
cd ../shared && bun run build
```

#### CLI Execution Fails in Development
```bash
# Test CLI directly
cd ../cli && bun src/cli.ts --help

# Use debug mode for detailed logs
bun run dev:debug

# Check CLI paths
echo "CLI resolved to: $(which bun)"
```

#### Docker Issues (Development)
If getting Docker-related errors in development:
```bash
# Use pure local mode (bypasses Docker completely)
bun run dev:local

# Or enable Docker bypass
export FONDATION_DEV_DOCKER_BYPASS=true
bun run dev
```

### Production Issues

#### Worker not picking up jobs
```bash
# Check worker logs
docker logs -f fondation-worker

# Verify Convex connection
curl -f $CONVEX_URL/_system/version

# Check for pending jobs in Convex dashboard
npx convex dashboard
```

### Claude CLI authentication issues
```bash
# Test authentication
docker run --rm fondation/cli:authenticated sh -c 'npx claude -p "test"'

# Re-authenticate if needed
docker run -d --name auth fondation/cli:latest tail -f /dev/null
docker exec -it auth npx claude auth
docker commit auth fondation/cli:authenticated
docker rm -f auth
```

### Step 4+ Analysis Failures
⚠️ **Common Issue**: Docker image built before code fixes

```bash
# 1. Rebuild CLI bundle
cd packages/cli && npm run build:cli

# 2. Rebuild Docker image
docker build -f packages/cli/Dockerfile.production -t fondation/cli:latest .

# 3. Re-authenticate (see above)
```

### Job Processing Issues
```bash
# Check job states in Convex
npx convex data jobs

# Clear stuck jobs (admin)
curl -X POST http://localhost:3000/api/clear-stuck-jobs

# Monitor job progression
tail -f /var/log/worker.log | grep -E "Step [0-9]/6"
```

## Monitoring

### Real-time Monitoring
```bash
# Worker logs with step tracking
docker logs -f fondation-worker | grep -E "(Step [0-9]/6|ERROR|Authentication)"

# Health and metrics (worker exposes :8080)
curl -s http://localhost:8080/health | jq
curl -s http://localhost:8080/metrics | jq

# Watch job progression in Convex
watch -n 2 'npx convex run jobs:listJobs | head -20'
```

### Performance Monitoring
```bash
# Container resource usage
docker stats fondation-worker

# Disk usage (temp files)
du -sh /tmp/fondation/*

# Memory usage by process
docker exec fondation-worker top -o %MEM
```

## Key Features

### Atomic Job Processing
- **Lease-based locking**: Jobs claimed with 5-minute leases
- **Heartbeat system**: Extends lease every minute while processing
- **Automatic recovery**: Expired leases return jobs to queue
- **Retry logic**: Failed jobs retry with exponential backoff (5s → 10min)

### 6-Step Analysis Workflow
1. **Extract abstractions** (~60s) - Identify core components
2. **Analyze relationships** (~60s) - Map dependencies 
3. **Determine order** (~30s) - Structure learning sequence
4. **Generate chapters** (~60s) - Create course content
5. **Review chapters** (~40s) - Enhance material
6. **Create tutorials** (~40s) - Build interactive experiences

### Health & Monitoring
- Health endpoint: `http://localhost:8080/health`
- Metrics endpoint: `http://localhost:8080/metrics`
- Real-time job status updates via Convex
- Automatic cleanup of temporary files
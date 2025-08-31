# Fondation Worker

Docker-based job processor that polls Convex for pending jobs and executes the Fondation CLI with Claude AI analysis. Runs as a persistent container with lease-based job claiming and automatic retry logic.

## Architecture

The worker is a long-running Node.js process that:
1. Polls Convex database for pending jobs
2. Claims jobs atomically with lease-based locking
3. Clones GitHub repositories
4. Executes Claude CLI for code analysis
5. Saves results back to Convex
6. Provides health checks and metrics

## Local Development

```bash
# From monorepo root (requires Convex running)
npx convex dev  # Terminal 1

# In separate terminal:
cd packages/worker
bun run dev     # Terminal 2
```

## Environment Variables

```bash
# Required
CONVEX_URL=https://your-deployment.convex.cloud

# Docker-specific (production)
FONDATION_WORKER_IMAGE=fondation/cli:authenticated  # Docker image with Claude auth

# Optional
WORKER_ID=worker-1                  # Unique worker ID (auto-generated if not set)
POLL_INTERVAL=5000                  # Job polling interval in ms (default: 5s)
LEASE_TIME=300000                   # Job lease duration in ms (default: 5 minutes)
HEARTBEAT_INTERVAL=60000           # Lease heartbeat interval in ms (default: 1 minute)
MAX_CONCURRENT_JOBS=1               # Maximum concurrent jobs per worker
TEMP_DIR=/tmp/fondation            # Temporary directory for cloned repos
```

## Claude CLI Authentication

⚠️ **CRITICAL**: The worker requires a pre-authenticated Docker image. See `DOCKER_BUILD_GUIDE.md` for complete setup.

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

The worker exposes health endpoints on port 8080:

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

### Worker not picking up jobs
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
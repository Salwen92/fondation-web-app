# Fondation Worker

Persistent job processor that polls Convex for pending jobs and executes the Fondation/Claude CLI.

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
# From monorepo root
bun dev:worker

# Or directly
cd apps/worker
bun dev
```

## Environment Variables

```bash
# Required
CONVEX_URL=https://your-deployment.convex.cloud

# Optional
WORKER_ID=worker-1                  # Unique worker ID (auto-generated if not set)
POLL_INTERVAL=5000                  # Job polling interval in ms
LEASE_TIME=300000                   # Job lease duration in ms (5 minutes)
HEARTBEAT_INTERVAL=60000           # Lease heartbeat interval in ms (1 minute)
MAX_CONCURRENT_JOBS=1               # Maximum concurrent jobs
TEMP_DIR=/tmp/fondation            # Temporary directory for cloned repos
```

## Claude CLI Authentication

The worker uses the Claude CLI which requires manual authentication:

### First-Time Setup

```bash
# Run container interactively
docker run -it \
  -v /srv/claude-creds:/home/worker/.claude \
  fondation-worker \
  /bin/sh

# Inside container, authenticate with Claude
claude login

# Exit container
exit
```

### Production Deployment

```bash
# Run with mounted credentials (read-only)
docker run -d \
  --name fondation-worker \
  --restart unless-stopped \
  -v /srv/claude-creds:/home/worker/.claude:ro \
  -e CONVEX_URL=https://your-deployment.convex.cloud \
  fondation-worker
```

## Docker Build

```bash
# From monorepo root
docker build -f apps/worker/Dockerfile -t fondation-worker .

# Or with specific tag
docker build -f apps/worker/Dockerfile -t fondation-worker:v1.0.0 .
```

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
  -e CONVEX_URL=... \
  fondation-worker

# Worker 2
docker run -d \
  --name worker-2 \
  -e WORKER_ID=worker-2 \
  -e CONVEX_URL=... \
  fondation-worker
```

## Troubleshooting

### Worker not picking up jobs
- Check Convex connection: `CONVEX_URL` must be correct
- Verify jobs exist with `status: "pending"`
- Check worker logs: `docker logs fondation-worker`

### Claude CLI authentication issues
- Re-authenticate: Mount credential directory and run `claude login`
- Check credential persistence: Verify `/home/worker/.claude` is mounted
- Ensure credentials are readable by worker user (UID 1001)

### Repository clone failures
- Verify GitHub access for public repos
- For private repos: Ensure GitHub token is available in Convex
- Check disk space in `/tmp/fondation`

### Memory issues
- Monitor with `/metrics` endpoint
- Adjust Docker memory limits if needed
- Reduce `MAX_CONCURRENT_JOBS` for memory-constrained environments

## Monitoring

### Logs
```bash
docker logs -f fondation-worker
```

### Metrics
```bash
watch -n 5 'curl -s localhost:8080/metrics | jq .'
```

### Health
```bash
watch -n 10 'curl -s localhost:8080/health | jq .status'
```
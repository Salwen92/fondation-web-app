# Fondation Worker Deployment Guide

## Overview
The Fondation Worker is now deployed as a persistent Docker container that polls Convex for jobs and executes them internally using the bundled CLI.

## Architecture
- **Single persistent container** - No more spawn-per-job overhead
- **Bundled worker** (~160KB) - All dependencies included
- **Bundled CLI** (~4MB) - Ready to execute
- **Claude SDK pre-installed** - Ready for authentication
- **Health monitoring** - HTTP endpoint on port 8081

## Quick Start

### 1. Build the Worker
```bash
# Build all components and Docker image
bun run docker:worker:build
```

### 2. Start the Worker
```bash
# Using docker-compose (recommended)
docker-compose -f docker-compose.worker.yml up -d

# Or using docker directly
docker run -d --name fondation-worker \
  -e CONVEX_URL=https://basic-stoat-666.convex.cloud \
  -e CONVEX_DEPLOYMENT=dev:basic-stoat-666 \
  -p 8081:8081 \
  fondation/worker:latest
```

### 3. Authenticate Claude (One-time setup)
```bash
# Run authentication
docker exec -it fondation-worker sh -c "cd /app/packages/cli && bunx claude auth"

# Save authenticated image
docker commit fondation-worker fondation/worker:authenticated

# Update docker-compose.yml to use authenticated image
```

### 4. Monitor Worker
```bash
# View logs
docker logs -f fondation-worker

# Check health
curl http://localhost:8081/health

# View container stats
docker stats fondation-worker
```

## Environment Variables
- `CONVEX_URL` - Convex deployment URL (required)
- `CONVEX_DEPLOYMENT` - Convex deployment name
- `WORKER_ID` - Unique worker identifier (auto-generated if not set)
- `POLL_INTERVAL` - Job polling interval in ms (default: 5000)
- `MAX_CONCURRENT_JOBS` - Max jobs to process simultaneously (default: 1)
- `LEASE_TIME` - Job lease duration in ms (default: 300000)
- `HEARTBEAT_INTERVAL` - Heartbeat interval in ms (default: 60000)

## File Structure
```
/app/
├── packages/
│   ├── worker/
│   │   └── dist/
│   │       └── worker.bundled.mjs  # Bundled worker (~160KB)
│   └── cli/
│       ├── dist/
│       │   ├── cli.bundled.mjs     # Bundled CLI (~4MB)
│       │   └── prompts/             # Symlink to prompts
│       └── prompts/                 # Prompt templates
└── convex/
    └── _generated/                  # Convex API (bundled in worker)
```

## Docker Images
- `fondation/worker:latest` - Base image with Claude SDK
- `fondation/worker:authenticated` - With Claude authentication

## Deployment Options

### Development
```yaml
# docker-compose.worker.yml
services:
  worker:
    image: fondation/worker:authenticated
    environment:
      - CONVEX_URL=${CONVEX_URL}
      - WORKER_ID=dev-worker-001
```

### Production (Multiple Workers)
```yaml
services:
  worker:
    image: fondation/worker:authenticated
    deploy:
      replicas: 3
    environment:
      - CONVEX_URL=${CONVEX_URL}
      - MAX_CONCURRENT_JOBS=2
```

### With Local Claude Config
```yaml
services:
  worker:
    image: fondation/worker:latest
    volumes:
      - ~/.config/claude:/root/.config/claude:ro
```

## Troubleshooting

### Worker not processing jobs
1. Check authentication: `docker exec fondation-worker sh -c "cd /app/packages/cli && bunx claude auth status"`
2. Check Convex connection: `docker logs fondation-worker | grep "Convex"`
3. Verify environment variables: `docker exec fondation-worker env | grep CONVEX`

### Health check failing
- Normal if no jobs processed yet
- Check memory usage: `docker stats fondation-worker`
- Restart if needed: `docker restart fondation-worker`

### Authentication issues
```bash
# Re-authenticate
docker exec -it fondation-worker sh -c "cd /app/packages/cli && bunx claude auth"

# Save new authenticated image
docker commit fondation-worker fondation/worker:authenticated-v2
```

## Maintenance

### Update Worker
```bash
# Rebuild with latest code
bun run docker:worker:build

# Stop old container
docker-compose -f docker-compose.worker.yml down

# Start new container
docker-compose -f docker-compose.worker.yml up -d
```

### Clean Up
```bash
# Remove old images
docker images | grep fondation/worker | awk '{print $3}' | xargs docker rmi

# Clean build cache
docker system prune -af --volumes
```

## Performance
- **Startup time**: <1 second (vs 10+ seconds with spawn model)
- **Memory usage**: ~65MB idle, ~200MB during job processing
- **CPU usage**: Minimal when polling, spikes during job execution
- **Bundle sizes**:
  - Worker: 160KB (includes Convex API)
  - CLI: 4MB (includes all prompts and logic)

## Security Notes
- Claude authentication token stored in container
- Use secrets management for production
- Consider using Docker secrets or environment variable encryption
- Regularly rotate authentication tokens

## Next Steps
1. **Create job through UI** to test end-to-end flow
2. **Monitor logs** during job processing
3. **Scale horizontally** by increasing replicas
4. **Set up monitoring** with Prometheus/Grafana
5. **Configure log aggregation** with ELK stack
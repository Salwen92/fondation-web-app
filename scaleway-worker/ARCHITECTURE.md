# Scaleway Worker Docker Architecture

## Overview
This document explains the Docker-based architecture for the Scaleway Worker, which processes long-running Fondation CLI jobs. The architecture mirrors the Cloud Run setup we migrated from, using a persistent Express server inside a Docker container.

## Architecture Decisions

### 1. Persistent Server vs Spawning Containers
**Decision**: Use a persistent Express server that spawns worker processes, not new containers per job.

**Rationale**:
- Matches Cloud Run architecture exactly
- Avoids container startup overhead (15-30 seconds per job)
- Simplifies Claude authentication (authenticate once, reuse for all jobs)
- Better resource utilization
- Easier debugging and monitoring

### 2. Docker Networking with host.docker.internal
**Decision**: Replace `localhost` URLs with `host.docker.internal` for container-to-host communication.

**Problem**: Callbacks from Docker container to Convex (on host) were failing with ECONNREFUSED.

**Solution**: The server.js automatically rewrites callback URLs:
```javascript
const dockerCallbackUrl = callbackUrl.replace('http://localhost', 'http://host.docker.internal')
```

This allows the container to reach services running on the host machine.

### 3. Claude Authentication Strategy
**Decision**: Pre-authenticate Claude in the Docker image instead of using ANTHROPIC_API_KEY.

**Process**:
1. Build base image with Fondation CLI
2. Install Claude CLI globally
3. Authenticate interactively: `claude auth`
4. Save authenticated image for reuse

**Benefits**:
- No API keys in environment variables
- More secure authentication
- Works with Claude Code's authentication system

## Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│                     http://localhost:3000                    │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP POST /api/analyze
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Scaleway Gateway (Express)                │
│                     http://localhost:8081                    │
│                                                              │
│  Development Mode:                                           │
│  - Forwards requests to Docker container server             │
│  - Handles job routing                                      │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP POST /execute
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Docker Container: scaleway-worker              │
│                     http://localhost:8080                    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │              Express Server (server.js)             │    │
│  │  - Receives job requests                           │    │
│  │  - Rewrites callback URLs for Docker networking    │    │
│  │  - Spawns worker processes                         │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │ spawn()                             │
│                       ▼                                     │
│  ┌────────────────────────────────────────────────────┐    │
│  │           Worker Process (worker.js)               │    │
│  │  - Clones repository                              │    │
│  │  - Runs Fondation CLI                            │    │
│  │  - Sends progress callbacks                      │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Environment Variables:                                      │
│  - CLAUDECODE=1                                             │
│  - CLAUDE_CODE_SSE_PORT=27121                              │
│  - RUNNING_IN_DOCKER=true                                  │
└──────────────────────────┬───────────────────────────────────┘
                          │ Callbacks (via host.docker.internal)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Convex Backend (Webhook)                  │
│              http://host.docker.internal:3000                │
│                   /api/webhook/job-callback                  │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

```
scaleway-worker/
├── Dockerfile          # Multi-stage build with Fondation CLI
├── server.js          # Express server (entrypoint)
├── worker.js          # Job processor (spawned per job)
├── package.json       # Dependencies
└── build-and-auth.sh  # Build and authenticate script
```

## Docker Image Layers

1. **Base Layer** (node:20-alpine)
   - Minimal Alpine Linux with Node.js 20
   - Git, bash, curl for operations

2. **Fondation Layer**
   - Copies CLI bundle from fondation source
   - Copies prompts directory
   - Sets up /fondation directory

3. **Worker Layer**
   - Copies server.js and worker.js
   - Installs Express
   - Creates work directories (/tmp/repos, /tmp/outputs)

4. **Authentication Layer** (manual step)
   - Claude CLI installed globally
   - Authenticated via `claude auth`
   - Saved as authenticated image

## Building and Running

### Build Process
```bash
# Build with Fondation source as build context
docker build \
  --build-context fondation-source=/path/to/fondation \
  -t scaleway-worker:production \
  -f Dockerfile .
```

### Running the Container
```bash
docker run -d \
  --name scaleway-worker \
  -p 8080:8080 \
  -e CLAUDECODE=1 \
  -e CLAUDE_CODE_SSE_PORT=27121 \
  scaleway-worker:production
```

## Environment Variables

### Required for Container
- `CLAUDECODE=1` - Enables Claude Code integration
- `CLAUDE_CODE_SSE_PORT=27121` - Port for Claude SSE communication

### Passed to Worker Process
- `JOB_ID` - Unique job identifier
- `REPOSITORY_URL` - Git repository to analyze
- `BRANCH` - Git branch to checkout
- `CALLBACK_URL` - Webhook URL (auto-converted for Docker)
- `CALLBACK_TOKEN` - Authentication token for callbacks
- `GITHUB_TOKEN` - Optional GitHub authentication

## Production Deployment

For production Scaleway deployment:

1. **Push to Scaleway Container Registry**
```bash
docker tag scaleway-worker:production rg.fr-par.scw.cloud/fondation/worker:latest
docker push rg.fr-par.scw.cloud/fondation/worker:latest
```

2. **Deploy as Scaleway Serverless Job**
- Max duration: 24 hours
- Memory: 2GB minimum
- CPU: 1000m minimum
- Environment variables configured in Scaleway Console

3. **Gateway Configuration**
- Set NODE_ENV=production
- Configure Scaleway credentials:
  - SCW_ACCESS_KEY
  - SCW_SECRET_KEY
  - SCW_DEFAULT_PROJECT_ID
  - SCW_JOB_DEFINITION_ID

## Monitoring and Debugging

### View Container Logs
```bash
docker logs scaleway-worker --follow
```

### Check Container Status
```bash
docker ps -a | grep scaleway-worker
```

### Access Container Shell
```bash
docker exec -it scaleway-worker /bin/sh
```

### Debug Job Processing
1. Check gateway logs for request forwarding
2. Check container server logs for job receipt
3. Check worker logs for CLI execution
4. Verify callbacks in Convex dashboard

## Known Issues and Solutions

### Issue 1: ECONNREFUSED on Callbacks
**Solution**: Server.js automatically replaces `localhost` with `host.docker.internal` in callback URLs.

### Issue 2: Claude Authentication Lost
**Solution**: Rebuild and re-authenticate the image:
```bash
./build-and-auth.sh
```

### Issue 3: CLI Analysis Fails
**Possible Causes**:
- Claude not authenticated properly
- Missing CLAUDECODE environment variable
- Fondation CLI bundle corrupted

**Debug Steps**:
1. Check CLI environment variables in worker logs
2. Verify Claude authentication: `docker exec scaleway-worker claude auth status`
3. Test CLI manually: `docker exec scaleway-worker node /fondation/cloud-run/cli.bundled.cjs --help`

## Migration Notes

### From Cloud Run
- Cloud Run used similar architecture with persistent server
- Main difference: Docker networking requires host.docker.internal
- Authentication method changed from API keys to Claude CLI

### From Spawning Containers
- Initial approach spawned new container per job
- Problems: slow startup, authentication complexity
- Solution: persistent server matching Cloud Run pattern

## Future Improvements

1. **Health Checks**
   - Add /health endpoint to server.js
   - Configure Docker health check
   - Monitor Claude authentication status

2. **Resource Management**
   - Implement job queue with concurrency limits
   - Add memory usage monitoring
   - Graceful shutdown with job completion

3. **Security**
   - Run as non-root user (already implemented)
   - Add rate limiting
   - Implement job timeout controls

4. **Observability**
   - Structure logs as JSON
   - Add metrics collection
   - Implement distributed tracing

## Conclusion

This Docker-based architecture provides a robust, scalable solution for running Fondation CLI jobs. By maintaining a persistent server and handling Docker networking properly, we achieve good performance while maintaining compatibility with both development and production environments.
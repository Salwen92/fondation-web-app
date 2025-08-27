# Local Development Setup Guide

## Overview

This guide helps you run the entire Fondation stack locally for development.

## Prerequisites

- Node.js 20+
- Docker Desktop
- npm or bun
- Claude CLI (for worker authentication)

## Step 1: Convex Local Development

Convex runs a local development server that syncs with a dev deployment in the cloud.

### Start Convex Dev Server

```bash
cd fondation/apps/web

# First time setup - creates a dev deployment
npx convex dev

# This will:
# 1. Create a dev deployment (free)
# 2. Start local server at http://localhost:3210
# 3. Watch for file changes
# 4. Auto-sync schema and functions
```

The Convex dev server provides:
- Hot reload for functions
- Real-time sync with dev deployment
- Local development URL: `http://localhost:3210`
- Dashboard access at https://dashboard.convex.dev

## Step 2: Web Application Setup

### Environment Variables

Create `fondation/apps/web/.env.local`:

```env
# Convex (local dev)
NEXT_PUBLIC_CONVEX_URL=http://localhost:3210
CONVEX_URL=http://localhost:3210

# Auth (local dev)
AUTH_SECRET=dev-secret-at-least-32-characters-long-for-dev
AUTH_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000

# GitHub OAuth (create a dev app at github.com/settings/developers)
GITHUB_CLIENT_ID=your-dev-github-client-id
GITHUB_CLIENT_SECRET=your-dev-github-client-secret

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Encryption (dev only - not secure)
ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000
```

### Start Web App

```bash
cd fondation/packages/web

# Install dependencies
npm install

# Run in development mode (separate terminal)
npm run dev

# This starts:
# - Next.js at http://localhost:3000
# - Auto connects to Convex at localhost:3210
```

## Step 3: Worker Setup with Docker

### Option A: Docker with Host Network (Recommended for Mac/Linux)

```bash
cd fondation

# Build the worker image
docker build -t fondation-worker:dev -f packages/worker/Dockerfile .

# Run with host network to access localhost Convex
docker run -it --rm \
  --name fondation-worker-dev \
  --network host \
  -e CONVEX_URL=http://localhost:3210 \
  -e WORKER_ID=worker-dev-1 \
  -e NODE_ENV=development \
  -v ~/.claude:/home/worker/.claude:ro \
  fondation-worker:dev
```

### Option B: Docker with Bridge Network (Windows or isolated setup)

```bash
# Create a custom network
docker network create fondation-dev

# Run Convex container (if needed)
# Note: Usually Convex dev runs on host, skip if using npx convex dev

# Run worker with custom network
docker run -it --rm \
  --name fondation-worker-dev \
  --network fondation-dev \
  -e CONVEX_URL=http://host.docker.internal:3210 \
  -e WORKER_ID=worker-dev-1 \
  -e NODE_ENV=development \
  -v ~/.claude:/home/worker/.claude:ro \
  -p 8080:8080 \
  fondation-worker:dev
```

## Step 4: Claude CLI Authentication (IMPORTANT)

The worker needs Claude CLI authenticated. You have two options:

### Option 1: Mount Host Claude Config (Development)

```bash
# First, authenticate Claude on your host machine
claude login  # or claude setup-token

# Then mount the config directory in Docker
docker run -v ~/.claude:/home/worker/.claude:ro ...
```

### Option 2: Authenticate Inside Container

```bash
# Run container with interactive shell
docker run -it --rm \
  --name fondation-worker-dev \
  --network host \
  -e CONVEX_URL=http://localhost:3210 \
  -e WORKER_ID=worker-dev-1 \
  --entrypoint /bin/sh \
  fondation-worker:dev

# Inside container, authenticate
claude login  # Follow prompts

# Then start the worker
npm start
```

## Step 5: Verify Everything Works

### 1. Check Convex is running:
```bash
curl http://localhost:3210
# Should return Convex dev server response
```

### 2. Check Web app:
```bash
curl http://localhost:3000
# Should return Next.js page
```

### 3. Check Worker health:
```bash
curl http://localhost:8080/health
# Should return health status JSON
```

### 4. Test the flow:
1. Open http://localhost:3000
2. Login with GitHub
3. Add a repository
4. Click "Generate Documentation"
5. Watch logs in worker container
6. See results in web UI

## Development Workflow

### Hot Reload Everything

1. **Convex Functions**: Auto-reload on file save
2. **Next.js**: Auto-reload with Fast Refresh
3. **Worker**: Restart container for changes (or use volume mount for source)

### Debug Worker

```bash
# View worker logs
docker logs -f fondation-worker-dev

# Enter container for debugging
docker exec -it fondation-worker-dev /bin/sh
```

### Reset Everything

```bash
# Stop all services
docker stop fondation-worker-dev
# Kill Next.js (Ctrl+C)
# Kill Convex dev (Ctrl+C)

# Clear Convex data (optional)
cd fondation/apps/web
npx convex dashboard  # Delete data from UI
```

## Environment Differences

| Component | Development | Production |
|-----------|------------|------------|
| Convex URL | http://localhost:3210 | https://xxx.convex.cloud |
| Web URL | http://localhost:3000 | https://fondation.ai |
| Worker | Docker on localhost | Docker on VPS |
| Auth | Dev GitHub OAuth | Prod GitHub OAuth |
| SSL | None (HTTP) | Required (HTTPS) |

## Common Issues

### Worker Can't Connect to Convex

**Problem**: Connection refused to localhost:3210

**Solutions**:
- Mac/Linux: Use `--network host`
- Windows: Use `http://host.docker.internal:3210`
- WSL2: Check firewall settings

### Claude CLI Not Authenticated

**Problem**: Claude command not found or not authenticated

**Solution**:
```bash
# On host machine
claude login
# Check config exists
ls ~/.claude/

# Mount in Docker
docker run -v ~/.claude:/home/worker/.claude:ro ...
```

### Port Already in Use

**Problem**: Port 3000 or 3210 already in use

**Solution**:
```bash
# Find and kill process
lsof -i :3000
kill -9 <PID>

# Or use different ports
PORT=3001 npm run dev
```

## Next Steps

Once local development works:
1. Test job processing end-to-end
2. Verify Claude analyzes repositories
3. Check results stored in Convex
4. Test error handling
5. Monitor worker health endpoint
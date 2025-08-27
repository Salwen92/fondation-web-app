# Local Development Setup

This guide provides step-by-step instructions for running the complete Fondation application locally with the new vendor-agnostic monorepo architecture.

## Architecture Overview

The application uses a simple, vendor-agnostic architecture:
- **Web App** (Next.js): User interface with real-time updates
- **Worker** (Node.js): Persistent process that polls for jobs
- **Database** (Convex): Real-time data and job queue
- **Claude CLI**: AI-powered documentation generation

## Prerequisites

- Bun (latest version)
- Node.js 20+ 
- Git
- Claude CLI (must be authenticated)
- GitHub OAuth App credentials
- Convex account

## Environment Setup

### 1. Install Dependencies

```bash
# Install all workspace dependencies
bun run install
```

### 2. Configure Web App Environment

Create `fondation/apps/web/.env.local`:

```bash
# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# GitHub OAuth
GITHUB_ID=your-github-oauth-app-id
GITHUB_SECRET=your-github-oauth-app-secret

# Convex
NEXT_PUBLIC_CONVEX_URL=your-convex-url
CONVEX_DEPLOYMENT=your-deployment-name
```

### 3. Configure Worker Environment

Create `fondation/apps/worker/.env`:

```bash
# Convex connection
CONVEX_URL=your-convex-url

# Worker settings
POLL_INTERVAL=5000
MAX_CONCURRENT_JOBS=1
WORKER_ID=local-worker-1
TEMP_DIR=/tmp/fondation
```

### 4. Authenticate Claude CLI

```bash
# Authenticate Claude CLI (one-time setup)
claude login

# Verify authentication
claude --version
```

## Running the Application

### Start All Services

Open three terminal windows:

#### Terminal 1: Convex Backend
```bash
cd fondation/apps/web
bunx convex dev
```

#### Terminal 2: Web Application
```bash
bun run dev
```
Access at: http://localhost:3000

#### Terminal 3: Worker Process
```bash
bun run dev:worker
```

#### Alternative: Start Everything
```bash
# Start all services at once
bun run dev:all
```

## Testing Workflow

1. **Login**: Navigate to http://localhost:3000 and sign in with GitHub
2. **Select Repository**: Choose a repository from your GitHub account
3. **Generate Documentation**: Click "Generate Documentation"
4. **Monitor Progress**: Watch real-time updates as the worker processes
5. **View Results**: Access generated documentation once complete

## Development Commands

### Type Checking
```bash
# Check all workspaces
bun run typecheck

# Check specific workspace (run from fondation directory)
cd fondation/apps/web && bun run typecheck
```

### Linting
```bash
# Lint all workspaces
bun run lint

# Fix linting issues
bun run lint:fix
```

### Formatting
```bash
# Format all code
bun run format

# Check formatting
bun run format:check
```

## Common Issues

### Worker Not Picking Up Jobs

1. Check Convex connection:
```bash
curl $CONVEX_URL
```

2. Verify worker is polling:
- Check worker logs for "Polling for jobs..." messages
- Ensure POLL_INTERVAL is set (default: 5000ms)

### Claude CLI Authentication Issues

1. Re-authenticate:
```bash
claude logout
claude login
```

2. Verify credentials:
```bash
claude --version
```

### Convex Connection Issues

1. Check deployment URL:
```bash
bunx convex dashboard
```

2. Verify environment variables match

### Port Conflicts

Default ports:
- Web app: 3000
- Convex: 5001
- Worker metrics: 8080

Change if needed:
```bash
# Web app
PORT=3001 bun run dev

# Worker metrics
METRICS_PORT=8081 bun run dev
```

## Debugging

### Enable Debug Logs

```bash
# Web app
DEBUG=* bun run dev

# Worker
DEBUG=fondation:* bun run dev
```

### Inspect Database

```bash
cd apps/web
bunx convex dashboard
```

### Monitor Worker Health

```bash
curl http://localhost:8080/health
curl http://localhost:8080/metrics
```

## Docker Development

### Build Worker Container
```bash
cd apps/worker
docker build -t fondation-worker-dev .
```

### Run Worker in Docker
```bash
docker run -it \
  -v ~/.claude:/home/worker/.claude:ro \
  -e CONVEX_URL=$CONVEX_URL \
  -p 8080:8080 \
  fondation-worker-dev
```

## Additional Resources

- [Architecture Overview](./fondation/docs/ARCHITECTURE.md)
- [API Documentation](./docs/API.md)
- [Troubleshooting Guide](./docs/TROUBLESHOOTING.md)
- [Contributing Guidelines](./fondation/CONTRIBUTING.md)
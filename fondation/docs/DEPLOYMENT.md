# Deployment Guide

This guide covers building and deploying Fondation to production.

## Table of Contents
1. [Building for Production](#building-for-production)
2. [Docker Deployment](#docker-deployment)
3. [Environment Variables](#environment-variables)
4. [Platform-Specific Guides](#platform-specific-guides)
5. [Monitoring & Logging](#monitoring--logging)

## Building for Production

### Prerequisites
- Node.js 20+
- Docker Desktop
- Bun package manager
- GitHub OAuth App (production URLs)

### Build All Packages

```bash
# From monorepo root
cd /Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation

# Clean previous builds
bun run clean

# Build everything in correct order
bun run build

# Verify builds
ls -la packages/*/dist/
```

## Docker Deployment

### Building the CLI Docker Image

The CLI runs in Docker for consistent execution and authentication management.

#### Step 1: Build TypeScript Sources (Critical Order)

```bash
# Build from root (REQUIRED - respects dependencies)
npx tsc --build --force

# Or if that fails, build individually:
cd packages/shared && npx tsc --build
cd ../cli && npx tsc --build
```

#### Step 2: Bundle the CLI

```bash
cd packages/cli
node scripts/bundle-cli.js --production

# Expected output:
# 📦 Bundle created: 476.22KB (0.47MB)
#    - Source files: 25
#    - Dependencies bundled: 209
# ✅ CLI test passed
```

#### Step 3: Verify Bundle Artifacts

```bash
# Check bundled CLI
ls -lh dist/cli.bundled.mjs
# Should show: -rwxr-xr-x 476K cli.bundled.mjs

# Check prompts directory
ls -la dist/prompts/
# Should contain all .md prompt files
```

#### Step 4: Build Docker Image

```bash
cd packages/cli
docker build -f Dockerfile.production -t fondation/cli:latest .

# Verify image
docker images | grep fondation/cli
```

### Docker Authentication Process

The CLI requires OAuth authentication with Claude.

#### Step 1: Start Container for Authentication

```bash
# Start container with persistent process
docker run -d --name fondation-auth fondation/cli:latest tail -f /dev/null

# Verify running
docker ps | grep fondation-auth
```

#### Step 2: Authenticate with Claude

```bash
# Run interactive authentication
# IMPORTANT: Use bunx instead of npx with Bun-based images
docker exec -it fondation-auth bunx claude auth
# OR
docker exec -it fondation-auth bun x claude auth

# Follow prompts:
# 1. URL shown: https://claude.ai/authorize?...
# 2. Press Enter to open browser
# 3. Complete OAuth in browser
# 4. Terminal shows "✓ Authentication successful"
```

#### Step 3: Save Authenticated Image

```bash
# Commit authenticated state
docker commit fondation-auth fondation/cli:authenticated

# Tag with version
docker tag fondation/cli:authenticated fondation/cli:1.0.0-beta.9-auth

# Clean up temp container
docker stop fondation-auth && docker rm fondation-auth
```

### Production Docker Usage

```bash
# Run analysis on repository
docker run --rm \
  -v /path/to/repository:/workspace \
  -v /path/to/output:/output \
  fondation/cli:authenticated \
  analyze /workspace --output-dir /output
```

## Environment Variables

### Production Environment Setup

```bash
# Web Application (Vercel/Railway/etc)
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXTAUTH_URL=https://your-domain.com
AUTH_SECRET=<production-secret>
GITHUB_CLIENT_ID=<production-oauth-id>
GITHUB_CLIENT_SECRET=<production-oauth-secret>

# Convex (Production)
NEXT_PUBLIC_CONVEX_URL=https://your-prod.convex.cloud
CONVEX_DEPLOYMENT=prod:your-deployment

# Worker Service
WORKER_GATEWAY_URL=https://worker.your-domain.com
FONDATION_WORKER_IMAGE=fondation/cli:authenticated
MAX_CONCURRENT_JOBS=5
```

## Platform-Specific Guides

### Deploying to Vercel (Web)

1. **Connect Repository**
   ```bash
   vercel link
   ```

2. **Set Environment Variables**
   ```bash
   vercel env add GITHUB_CLIENT_ID production
   vercel env add GITHUB_CLIENT_SECRET production
   vercel env add AUTH_SECRET production
   ```

3. **Deploy**
   ```bash
   cd packages/web
   vercel --prod
   ```

### Deploying to Railway (Worker)

1. **Create New Project**
   ```bash
   railway init
   ```

2. **Configure Dockerfile**
   ```dockerfile
   FROM node:20-alpine
   WORKDIR /app
   COPY packages/worker/dist ./dist
   COPY packages/worker/package.json ./
   RUN npm install --production
   CMD ["node", "dist/index.js"]
   ```

3. **Deploy**
   ```bash
   railway up
   ```

### Deploying to AWS ECS (Worker)

1. **Build and Push Image**
   ```bash
   aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_URI
   docker build -t fondation-worker packages/worker
   docker tag fondation-worker:latest $ECR_URI/fondation-worker:latest
   docker push $ECR_URI/fondation-worker:latest
   ```

2. **Create Task Definition**
   ```json
   {
     "family": "fondation-worker",
     "containerDefinitions": [{
       "name": "worker",
       "image": "${ECR_URI}/fondation-worker:latest",
       "environment": [
         {"name": "CONVEX_URL", "value": "..."},
         {"name": "FONDATION_WORKER_IMAGE", "value": "..."}
       ]
     }]
   }
   ```

### Deploying to Google Cloud Run (Worker)

```bash
# Build and deploy
gcloud builds submit --tag gcr.io/$PROJECT_ID/fondation-worker
gcloud run deploy fondation-worker \
  --image gcr.io/$PROJECT_ID/fondation-worker \
  --platform managed \
  --set-env-vars CONVEX_URL=$CONVEX_URL
```

## CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Deploy Production

on:
  push:
    branches: [main]

jobs:
  deploy-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run build:web
      - uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}

  deploy-worker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: |
          docker build -f packages/worker/Dockerfile -t worker .
          docker tag worker:latest ${{ secrets.REGISTRY }}/worker:${{ github.sha }}
      - name: Push to registry
        run: docker push ${{ secrets.REGISTRY }}/worker:${{ github.sha }}
```

## Monitoring & Logging

### Essential Metrics

1. **Web Application**
   - Response times
   - Error rates
   - Active users
   - GitHub API rate limits

2. **Worker Service**
   - Jobs processed/hour
   - Average processing time
   - Failure rate
   - Docker container health

3. **Convex Database**
   - Function execution times
   - Database size
   - Real-time connections

### Logging Setup

```javascript
// Worker logging
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
});

// Log job processing
logger.info({ jobId, status }, 'Job processed');
```

### Health Checks

```javascript
// Worker health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    jobs: jobQueue.length
  });
});
```

## Production Checklist

### Before Deployment
- [ ] All tests passing (`bun run test`)
- [ ] TypeScript builds without errors (`bun run typecheck`)
- [ ] Docker images built and tagged
- [ ] Environment variables configured
- [ ] Database migrations completed
- [ ] SSL certificates configured

### After Deployment
- [ ] Health checks passing
- [ ] Monitoring configured
- [ ] Logs aggregating properly
- [ ] Backup strategy in place
- [ ] Rollback plan documented

## Troubleshooting Production

### Common Issues

#### Docker Authentication Expires
```bash
# Re-authenticate
docker run -it fondation/cli:latest npx claude auth
docker commit <container-id> fondation/cli:authenticated
```

#### Worker Can't Connect to Convex
- Verify CONVEX_URL is correct
- Check network connectivity
- Ensure deployment is active

#### High Memory Usage
- Increase container limits
- Implement job batching
- Add memory monitoring

## Security Considerations

### Production Security Checklist
- [ ] Use secrets management (AWS Secrets Manager, etc.)
- [ ] Enable CORS for production domain only
- [ ] Implement rate limiting
- [ ] Use HTTPS everywhere
- [ ] Rotate secrets regularly
- [ ] Audit dependencies for vulnerabilities
- [ ] Enable container scanning
- [ ] Implement least privilege IAM

## Scaling Strategies

### Horizontal Scaling
- **Web**: Deploy behind load balancer
- **Worker**: Run multiple instances
- **Database**: Convex auto-scales

### Vertical Scaling
- Increase container resources
- Optimize bundle sizes
- Implement caching layers

---

For development setup, see [Development Guide](./DEVELOPMENT.md).
For troubleshooting, see [Troubleshooting Guide](./TROUBLESHOOTING.md).
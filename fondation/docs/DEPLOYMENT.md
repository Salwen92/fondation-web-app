# Fondation Production Deployment Guide

This comprehensive guide covers deploying the Fondation platform to production using Docker Compose, including the web application (Vercel), worker service (Docker), and Convex backend.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Environment Configuration](#environment-configuration)
3. [Deploy Convex Backend](#deploy-convex-backend)
4. [Deploy Web Application](#deploy-web-application)
5. [Deploy Worker Service](#deploy-worker-service)
6. [Production Checklist](#production-checklist)
7. [Maintenance Operations](#maintenance-operations)
8. [Troubleshooting](#troubleshooting)
9. [Security Considerations](#security-considerations)
10. [Backup and Recovery](#backup-and-recovery)

## Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Vercel    │────▶│   Convex    │◀────│   Worker    │
│  (Next.js)  │     │  (Backend)  │     │  (Docker)   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   GitHub    │
                    │     API     │
                    └─────────────┘
```

## Environment Configuration

### Prerequisites
- Docker and Docker Compose installed
- Convex account configured
- GitHub OAuth App (production URLs)
- Claude Code OAuth token
- Bun package manager

### Required Environment Variables

Create a `.env.production` file:

```bash
# Convex Configuration
CONVEX_URL=https://your-deployment.convex.cloud
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Authentication
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
CLAUDE_CODE_OAUTH_TOKEN=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# GitHub OAuth (for web app)
AUTH_GITHUB_ID=your_github_oauth_app_id
AUTH_GITHUB_SECRET=your_github_oauth_app_secret
AUTH_SECRET=your_random_auth_secret

# Worker Configuration
WORKER_ID=worker-prod
POLL_INTERVAL=5000
LEASE_TIME=300000
HEARTBEAT_INTERVAL=60000
MAX_CONCURRENT_JOBS=1
```

## Deploy Convex Backend

### Initial Setup

```bash
# Install Convex CLI
npm install -g convex

# Login to Convex
npx convex login

# Deploy to production
npx convex deploy --prod
```

### Environment Variables in Convex Dashboard

Set these in your Convex dashboard:
- `GITHUB_TOKEN`: Your GitHub personal access token
- `CLAUDE_CODE_OAUTH_TOKEN`: Your Claude Code OAuth token

## Deploy Web Application

### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from packages/web directory
cd packages/web
vercel --prod
```

### Environment Variables in Vercel

Configure in your Vercel project settings:
- `NEXT_PUBLIC_CONVEX_URL`: Your Convex deployment URL
- `AUTH_GITHUB_ID`: GitHub OAuth App ID
- `AUTH_GITHUB_SECRET`: GitHub OAuth App Secret
- `AUTH_SECRET`: Random secret for NextAuth

## Deploy Worker Service

### Container Architecture Requirements

**IMPORTANT**: The worker MUST run inside a Docker container. The system enforces this requirement and will fail if run outside Docker.

```bash
# ✅ CORRECT: Worker runs inside Docker container
docker-compose -f docker-compose.worker.yml up -d

# ❌ INCORRECT: Worker cannot run directly on host
cd packages/worker && bun run dev  # This will fail
```

### Using Docker Compose (Recommended)

```bash
# 1. Build the Docker image  
docker build -f packages/cli/Dockerfile.production -t fondation/cli:latest .

# 2. Tag with version
docker tag fondation/cli:latest fondation/cli:v1.0.0

# 3. Deploy with docker-compose
docker-compose -f docker-compose.worker.yml up -d

# 4. Check deployment status
docker-compose -f docker-compose.worker.yml ps
docker-compose -f docker-compose.worker.yml logs -f worker
```

### Scaling Workers

```bash
# Deploy with scaling profile for multiple workers (if supported)
docker-compose -f docker-compose.worker.yml --profile scale up -d

# Or scale specific service
docker-compose -f docker-compose.worker.yml up -d --scale worker=3
```

### Health Monitoring

```bash
# Check worker health
curl http://localhost:8081/health

# View logs
docker-compose logs -f worker

# Check resource usage
docker stats fondation-worker
```

## Production Checklist

### Pre-Deployment
- [ ] All environment variables configured
- [ ] Database migrations completed
- [ ] SSL certificates configured
- [ ] Backup strategy in place
- [ ] Monitoring configured

### Deployment Steps
1. [ ] Deploy Convex backend
2. [ ] Deploy web application to Vercel
3. [ ] Build Docker images
4. [ ] Start worker services with docker-compose
5. [ ] Verify health checks passing

### Post-Deployment
- [ ] Test authentication flow
- [ ] Test repository analysis workflow
- [ ] Monitor worker logs
- [ ] Verify database connectivity
- [ ] Check performance metrics

## Maintenance Operations

### Update Worker Service

```bash
# Pull latest changes
git pull origin main

# Rebuild Docker image
docker build -f packages/cli/Dockerfile.production -t fondation/cli:latest .
docker tag fondation/cli:latest fondation/cli:v1.0.1

# Update running containers
docker-compose -f docker-compose.worker.yml down
docker-compose -f docker-compose.worker.yml up -d
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f worker

# Last 100 lines
docker-compose logs --tail=100 worker
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart worker
```

### Clean Up Docker Resources

```bash
# Remove stopped containers
docker container prune -f

# Remove unused images
docker image prune -a -f

# Remove unused volumes
docker volume prune -f

# Complete cleanup
docker system prune -a -f --volumes
```

## Troubleshooting

### Worker Not Processing Jobs
1. Check worker logs: `docker-compose logs -f worker`
2. Verify Convex connection: Check CONVEX_URL
3. Check authentication tokens
4. Restart worker: `docker-compose restart worker`

### Jobs Stuck in Database
1. Connect to Convex dashboard
2. Navigate to Data tab
3. Find stuck jobs in `jobs` table
4. Update status to "failed" or delete

### Docker Memory Issues
1. Check memory usage: `docker stats`
2. Adjust limits in docker-compose.yml
3. Restart Docker daemon if necessary

### Authentication Failures
1. **Container Architecture Error**:
   ```bash
   Error: Worker must run inside Docker container
   ```
   **Solution**: Always run worker via Docker Compose, not directly on host

2. **Claude Authentication Hanging**:
   ```bash
   # Test Claude authentication with environment variable
   source .env && docker run --rm -e CLAUDE_CODE_OAUTH_TOKEN="$CLAUDE_CODE_OAUTH_TOKEN" \
     fondation/cli:latest --version
   ```

3. **GitHub Token Issues**:
   - Verify GitHub token has required scopes
   - Check token expiration dates
   - Ensure tokens are properly set in environment variables

4. **Environment Variable Problems**:
   ```bash
   # Check environment variables in running container
   docker exec fondation-worker env | grep -E "(CLAUDE|GITHUB)"
   ```

## Security Considerations

### Secrets Management
- Never commit `.env` files to version control
- Use Docker secrets for sensitive data
- Rotate tokens regularly
- Use least-privilege principle

### Network Security
- Use HTTPS for all external communications
- Implement rate limiting
- Use private networks for inter-service communication
- Enable Docker's built-in firewall rules

### Monitoring and Alerting
- Set up alerts for worker failures
- Monitor CPU and memory usage
- Track job completion times
- Alert on authentication failures

## Backup and Recovery

### Database Backups
Convex automatically handles database backups. For additional safety:
- Export critical data periodically
- Test restore procedures regularly
- Document recovery time objectives (RTO)

### Docker Volume Backups

```bash
# Backup worker volumes
docker run --rm -v fondation_worker-temp:/source -v $(pwd):/backup alpine \
  tar czf /backup/worker-temp-backup.tar.gz -C /source .

docker run --rm -v fondation_worker-cache:/source -v $(pwd):/backup alpine \
  tar czf /backup/worker-cache-backup.tar.gz -C /source .
```

### Performance Tuning

```yaml
# In docker-compose.yml, adjust resources:
deploy:
  resources:
    limits:
      cpus: '4'      # Increase for more processing power
      memory: 4G     # Increase for larger repositories
    reservations:
      cpus: '1'
      memory: 1G
```

---

For development setup, see [Development Guide](./DEVELOPMENT.md).
For Docker Compose configuration, see [docker-compose.worker.yml](docker-compose.worker.yml).
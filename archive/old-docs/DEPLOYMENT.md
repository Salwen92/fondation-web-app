# Fondation Production Deployment Guide

## Overview

This guide covers the complete production deployment process for the Fondation platform, including the web application, worker services, and backend infrastructure.

## Architecture Components

1. **Web Application** (Next.js) - Deployed to Vercel
2. **Worker Services** (Docker) - Deployed to VPS/Cloud instances
3. **Database** (Convex) - Managed cloud service
4. **Authentication** (NextAuth + GitHub OAuth)

## Prerequisites

- [ ] Vercel account for web deployment
- [ ] VPS or cloud instances for workers (minimum 2GB RAM)
- [ ] Convex account and production deployment
- [ ] GitHub OAuth application credentials
- [ ] Claude API access (Pro/Max subscription or API token)
- [ ] Domain name with DNS access

## Step 1: Environment Configuration

### Web Application Environment Variables

Create `.env.production` in `fondation/apps/web/`:

```env
# Authentication
AUTH_SECRET=<generate-64-char-random-string>
AUTH_URL=https://your-domain.com
GITHUB_CLIENT_ID=<github-oauth-app-id>
GITHUB_CLIENT_SECRET=<github-oauth-secret>

# Convex Backend
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_URL=https://your-deployment.convex.cloud

# Application
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Security
ENCRYPTION_KEY=<generate-64-char-hex-key>
```

### Worker Environment Variables

Create `.env.production` in `fondation/apps/worker/`:

```env
# Convex Backend
CONVEX_URL=https://your-deployment.convex.cloud

# Worker Configuration
WORKER_ID=worker-prod-1
POLL_INTERVAL=5000
MAX_CONCURRENT_JOBS=1
LEASE_TIME=300000
HEARTBEAT_INTERVAL=60000

# Paths
TEMP_DIR=/tmp/fondation
CLI_PATH=/usr/local/bin/claude
```

## Step 2: Convex Deployment

1. **Install Convex CLI**:
   ```bash
   npm install -g convex
   ```

2. **Deploy to Production**:
   ```bash
   cd fondation/apps/web
   npx convex deploy --prod
   ```

3. **Note the deployment URL** (format: `https://your-deployment.convex.cloud`)

## Step 3: Web Application Deployment (Vercel)

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy from monorepo**:
   ```bash
   cd fondation
   vercel --prod --scope your-team
   ```

3. **Configure Vercel**:
   - Root Directory: `fondation/apps/web`
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`

4. **Set Environment Variables in Vercel Dashboard**:
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env.production`

## Step 4: Worker Deployment

### Option A: Single VPS Deployment

1. **Prepare VPS**:
   ```bash
   # Install Docker
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER
   
   # Install Claude CLI
   npm install -g @anthropic-ai/claude
   ```

2. **Setup Claude Authentication**:
   ```bash
   # Interactive login (for Pro/Max users)
   claude
   
   # Or API token setup
   claude setup-token
   ```

3. **Build and Deploy Worker**:
   ```bash
   # Clone repository
   git clone https://github.com/your-org/fondation-web-app.git
   cd fondation-web-app/fondation
   
   # Build Docker image
   docker build -t fondation-worker -f apps/worker/Dockerfile .
   
   # Create persistent volume for Claude auth
   docker volume create claude-auth
   docker cp ~/.claude claude-auth:/home/worker/.claude
   
   # Run worker
   docker run -d \
     --name fondation-worker-1 \
     --restart unless-stopped \
     -e CONVEX_URL=https://your-deployment.convex.cloud \
     -e WORKER_ID=worker-prod-1 \
     -v claude-auth:/home/worker/.claude \
     fondation-worker
   ```

### Option B: Multi-Worker Deployment (Kubernetes)

See `k8s/worker-deployment.yaml` for Kubernetes configuration.

## Step 5: Monitoring Setup

### Health Checks

Workers expose health endpoints on port 8080:
- `GET /health` - Health status
- `GET /metrics` - Prometheus metrics

### Recommended Monitoring Stack

1. **Prometheus** - Metrics collection
2. **Grafana** - Visualization
3. **Alertmanager** - Alert routing

Example Prometheus configuration:

```yaml
scrape_configs:
  - job_name: 'fondation-workers'
    static_configs:
      - targets: 
        - 'worker-1.your-domain.com:8080'
        - 'worker-2.your-domain.com:8080'
```

## Step 6: Security Hardening

1. **Enable HTTPS** on all endpoints
2. **Configure CORS** in Convex functions
3. **Set up rate limiting** using Vercel Edge Config
4. **Implement WAF rules** (Cloudflare recommended)
5. **Regular security updates**:
   ```bash
   # Update dependencies
   npm audit fix
   
   # Update Docker base images
   docker pull node:20-alpine
   ```

## Step 7: Backup Strategy

1. **Convex Data**: Automated backups via Convex dashboard
2. **Configuration**: Store in private Git repository
3. **Secrets**: Use secret management service (AWS Secrets Manager, etc.)

## Step 8: Scaling Strategy

### Horizontal Scaling

Add more workers by incrementing WORKER_ID:

```bash
docker run -d \
  --name fondation-worker-2 \
  -e WORKER_ID=worker-prod-2 \
  # ... other env vars
  fondation-worker
```

### Load Balancing

Workers automatically distribute load through Convex queue system.

## Verification Checklist

- [ ] Web app accessible at production URL
- [ ] OAuth login working
- [ ] Workers claiming jobs from queue
- [ ] Health endpoints responding
- [ ] Monitoring dashboards active
- [ ] Logs being collected
- [ ] Backups configured
- [ ] SSL certificates valid

## Troubleshooting

### Worker Not Processing Jobs

1. Check worker logs:
   ```bash
   docker logs fondation-worker-1
   ```

2. Verify Claude authentication:
   ```bash
   docker exec fondation-worker-1 claude --version
   ```

3. Check Convex connection:
   ```bash
   curl http://localhost:8080/health
   ```

### Web App Issues

1. Check Vercel function logs
2. Verify environment variables in Vercel dashboard
3. Check Convex dashboard for errors

### Performance Issues

1. Monitor worker memory usage
2. Check Convex query performance
3. Review job processing times in metrics

## Rollback Procedure

1. **Web App**: Use Vercel's instant rollback feature
2. **Workers**: Keep previous Docker image tagged:
   ```bash
   docker tag fondation-worker:latest fondation-worker:backup
   docker stop fondation-worker-1
   docker run -d --name fondation-worker-1 fondation-worker:backup
   ```

## Support

- GitHub Issues: https://github.com/your-org/fondation-web-app/issues
- Documentation: /docs/README.md
- Monitoring Dashboard: https://grafana.your-domain.com
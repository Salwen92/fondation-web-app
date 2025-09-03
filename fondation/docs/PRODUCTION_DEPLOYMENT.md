# Production Deployment Guide - Fondation

## Overview

This guide provides step-by-step instructions for deploying the Fondation worker in production using Docker and Doppler for secure secret management.

## Prerequisites

- Docker Desktop installed and running
- Doppler CLI installed (`curl -Ls https://cli.doppler.com/install.sh | sudo sh`)
- Access to the Fondation Doppler project
- Access to production servers/deployment environment

## Quick Start for New Developers

### 1. Initial Setup

```bash
# Clone the repository
git clone <repo-url>
cd fondation-web-app/fondation

# Install and authenticate with Doppler
doppler login

# Configure local environment
doppler setup --project fondation --config prd

# Verify access to production secrets
doppler secrets --config prd --project fondation
```

### 2. Build Production Image

```bash
# Build the Docker image (from monorepo root)
docker build -f packages/cli/Dockerfile.production \
  -t fondation/cli:latest \
  -t fondation/cli:$(date +%Y-%m-%d) \
  .

# Verify build
docker images | grep fondation/cli
```

### 3. Deploy to Production

```bash
# Generate deployment token
DOPPLER_TOKEN_WORKER=$(doppler configs tokens create deployment-$(date +%Y%m%d) \
  --project fondation --config prd --plain)

# Deploy using the secure docker-compose file
DOPPLER_TOKEN_WORKER="$DOPPLER_TOKEN_WORKER" \
  docker-compose -f docker-compose.doppler.yml up -d

# Verify deployment
docker-compose -f docker-compose.doppler.yml ps
docker-compose -f docker-compose.doppler.yml logs worker
```

## Production Architecture

### Docker Components

- **Image**: `fondation/cli:latest` - Contains both CLI and worker functionality
- **Base**: `oven/bun:1.2.5-slim` - Optimized for Bun runtime
- **Authentication**: Doppler-managed secrets via `DOPPLER_TOKEN`
- **Networking**: Internal docker network for service communication

### Secret Management

**All sensitive data is managed through Doppler:**

| Secret | Description | Required |
|--------|-------------|----------|
| `CLAUDE_CODE_OAUTH_TOKEN` | Claude API authentication | Yes |
| `CONVEX_URL` | Database connection | Yes |
| `GITHUB_TOKEN` | Private repo access | Optional |

### File Structure

```
fondation/
├── docker-compose.doppler.yml  # ONLY production docker-compose file
├── packages/cli/Dockerfile.production  # Production Dockerfile
└── docs/
    ├── DOCKER_BUILD_GUIDE.md
    └── PRODUCTION_DEPLOYMENT.md  # This file
```

## Deployment Commands

### Standard Deployment

```bash
# Full deployment workflow
cd fondation-web-app/fondation

# 1. Build fresh image
docker build -f packages/cli/Dockerfile.production -t fondation/cli:latest .

# 2. Generate deployment token
DOPPLER_TOKEN_WORKER=$(doppler configs tokens create deployment-$(date +%Y%m%d) \
  --project fondation --config prd --plain)

# 3. Deploy
DOPPLER_TOKEN_WORKER="$DOPPLER_TOKEN_WORKER" \
  docker-compose -f docker-compose.doppler.yml up -d

# 4. Monitor
docker-compose -f docker-compose.doppler.yml logs -f worker
```

### Testing a Repository Analysis

```bash
# Test analyze command on a specific repository
DOPPLER_TOKEN_WORKER="$DOPPLER_TOKEN_WORKER" \
  docker-compose -f docker-compose.doppler.yml run --rm \
  -v /path/to/source/repo:/workspace \
  -v /path/to/output:/output \
  worker analyze /workspace --output-dir /output
```

### Scaling Workers

```bash
# Deploy multiple workers for load balancing
DOPPLER_TOKEN_WORKER="$DOPPLER_TOKEN_WORKER" \
DOPPLER_TOKEN_WORKER_2="$DOPPLER_TOKEN_WORKER" \
  docker-compose -f docker-compose.doppler.yml --profile scale up -d
```

## Monitoring and Maintenance

### Health Checks

```bash
# Check worker status
docker-compose -f docker-compose.doppler.yml ps

# View logs
docker-compose -f docker-compose.doppler.yml logs worker

# Check resource usage
docker stats fondation-worker
```

### Updates and Rollbacks

```bash
# Update to new version
docker pull fondation/cli:latest
DOPPLER_TOKEN_WORKER="$DOPPLER_TOKEN_WORKER" \
  docker-compose -f docker-compose.doppler.yml up -d

# Rollback to previous version
docker-compose -f docker-compose.doppler.yml down
docker run -d --name fondation-worker fondation/cli:2025-09-02  # previous date
```

### Cleanup

```bash
# Stop services
docker-compose -f docker-compose.doppler.yml down

# Remove old images
docker image prune -f

# Clean up Doppler tokens
doppler configs tokens list --project fondation --config prd
doppler configs tokens revoke <token-name> --project fondation --config prd
```

## Security Best Practices

### 1. Token Management
- **Generate unique tokens** for each deployment
- **Rotate tokens regularly** (recommended: monthly)
- **Revoke unused tokens** immediately
- **Use date-based naming** for tracking: `deployment-20250903`

### 2. Access Control
- **Limit Doppler project access** to necessary team members only
- **Use principle of least privilege** for production secrets
- **Monitor secret access** through Doppler audit logs

### 3. Container Security
- **Use official base images** (`oven/bun:1.2.5-slim`)
- **Update images regularly** for security patches
- **Scan images for vulnerabilities** before deployment

## Troubleshooting

### Common Issues

1. **"Could not find requested secret: CLAUDE_CODE_OAUTH_TOKEN"**
   ```bash
   # Add the secret to production config
   doppler secrets set CLAUDE_CODE_OAUTH_TOKEN="sk-ant-oat01-YOUR-TOKEN" \
     --config prd --project fondation
   ```

2. **"Doppler Error: you must provide a token"**
   ```bash
   # Regenerate deployment token
   DOPPLER_TOKEN_WORKER=$(doppler configs tokens create new-deployment \
     --project fondation --config prd --plain)
   ```

3. **Container exits with code 1**
   ```bash
   # Check logs for authentication issues
   docker-compose -f docker-compose.doppler.yml logs worker
   
   # Verify Claude token is valid
   doppler secrets get CLAUDE_CODE_OAUTH_TOKEN --config prd --project fondation
   ```

### Debug Commands

```bash
# Test Doppler access inside container
docker run --rm -e DOPPLER_TOKEN="$DOPPLER_TOKEN_WORKER" \
  --entrypoint="sh" fondation/cli:latest -c "doppler secrets"

# Test CLI functionality
docker run --rm -e DOPPLER_TOKEN="$DOPPLER_TOKEN_WORKER" \
  fondation/cli:latest --version

# Check container environment
docker-compose -f docker-compose.doppler.yml exec worker env | grep DOPPLER
```

## Support

For issues with:
- **Doppler access**: Contact DevOps team
- **Docker builds**: Check `docs/DOCKER_BUILD_GUIDE.md`
- **Claude authentication**: Verify token in Doppler production config
- **Worker functionality**: Check application logs and Convex database connection

---

**Last Updated**: 2025-09-03  
**Tested On**: macOS (Apple Silicon), Docker Desktop 4.x, Doppler CLI v3.75.1
# Operations Manual

## Table of Contents
- [Deployment](#deployment)
- [Claude CLI Authentication](#claude-cli-authentication)
- [Worker Management](#worker-management)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Backup & Recovery](#backup--recovery)
- [Scaling](#scaling)

## Deployment

### Prerequisites
- Docker 20+ installed
- Docker Compose v2+ installed
- Convex deployment configured
- GitHub repository access

### Initial Setup on VPS/Cloud Instance

1. **Provision a server (any provider)**
   ```bash
   # Minimum requirements:
   # - 2 CPU cores
   # - 2GB RAM
   # - 20GB storage
   # - Ubuntu 22.04 LTS (or compatible)
   # 
   # Providers: Scaleway, DigitalOcean, Linode, Hetzner, AWS EC2, etc.
   ```

2. **Run setup script**
   ```bash
   # SSH into instance
   ssh root@your-instance-ip
   
   # Download and run setup script
   curl -fsSL https://raw.githubusercontent.com/your-org/fondation/main/deploy/vps-setup.sh | bash
   ```

3. **Configure environment**
   ```bash
   cd /srv/fondation
   cp .env.example .env
   nano .env
   
   # Add your configuration:
   # CONVEX_URL=https://your-deployment.convex.cloud
   ```

### Building the Worker Image

```bash
# On your development machine
cd fondation
docker build -f packages/worker/Dockerfile -t fondation-worker:latest .

# Tag for registry
docker tag fondation-worker:latest your-registry/fondation-worker:latest

# Push to registry
docker push your-registry/fondation-worker:latest
```

### Deploying to Production

```bash
# On Scaleway Instance
cd /srv/fondation

# Pull latest image
docker pull your-registry/fondation-worker:latest
docker tag your-registry/fondation-worker:latest fondation-worker:latest

# Start service
sudo systemctl enable fondation-worker
sudo systemctl start fondation-worker

# Check status
sudo systemctl status fondation-worker
```

## Claude CLI Authentication

### ⚠️ IMPORTANT: Manual Authentication Required

The worker uses Claude CLI which requires interactive authentication. API keys (ANTHROPIC_API_KEY) are NOT used.

### First-Time Authentication

1. **Create credentials directory**
   ```bash
   sudo mkdir -p /srv/claude-creds
   sudo chown $USER:$USER /srv/claude-creds
   ```

2. **Run interactive authentication**
   ```bash
   # Using helper script
   cd /srv/fondation
   ./auth-claude.sh
   
   # Or manually
   docker run -it \
     -v /srv/claude-creds:/home/worker/.claude \
     fondation-worker:latest \
     /bin/sh -c "claude login"
   ```

3. **Follow Claude CLI prompts**
   - Open the provided URL in your browser
   - Authenticate with your Anthropic account
   - Copy the authorization code
   - Paste into the terminal

4. **Verify authentication**
   ```bash
   # Check credentials exist
   ls -la /srv/claude-creds/
   # Should see config/credentials files
   ```

### Credential Management

#### Backup Credentials
```bash
cd /srv/fondation
./backup-creds.sh
# Backups saved to /srv/backups/
```

#### Restore Credentials
```bash
# From backup
sudo tar -xzf /srv/backups/claude-creds-TIMESTAMP.tar.gz -C /srv/
```

#### Rotate Credentials
```bash
# Backup existing
./backup-creds.sh

# Re-authenticate
./auth-claude.sh

# Restart worker
sudo systemctl restart fondation-worker
```

### Troubleshooting Authentication

#### Credentials Not Found
```bash
# Check mount
docker exec worker-container ls -la /home/worker/.claude

# Verify permissions
ls -la /srv/claude-creds
# Should be readable by docker user
```

#### Authentication Expired
```bash
# Re-authenticate
cd /srv/fondation
./auth-claude.sh

# Restart worker
sudo systemctl restart fondation-worker
```

## Worker Management

### Starting/Stopping

```bash
# Start
sudo systemctl start fondation-worker

# Stop
sudo systemctl stop fondation-worker

# Restart
sudo systemctl restart fondation-worker

# Status
sudo systemctl status fondation-worker
```

### Updating Worker

```bash
cd /srv/fondation
./update-worker.sh
```

### Manual Operations

```bash
# Start manually
cd /srv/fondation
docker-compose -f docker-compose.prod.yml up

# Start in background
docker-compose -f docker-compose.prod.yml up -d

# Stop
docker-compose -f docker-compose.prod.yml down

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

## Monitoring

### Health Check
```bash
# Local health endpoint
curl http://localhost:8080/health | jq .

# Metrics
curl http://localhost:8080/metrics | jq .
```

### Monitoring Script
```bash
cd /srv/fondation
./monitor.sh
```

### Logs

#### System Logs
```bash
# Service logs
sudo journalctl -u fondation-worker -f

# Last 100 lines
sudo journalctl -u fondation-worker -n 100
```

#### Docker Logs
```bash
# Container logs
docker logs fondation-worker -f

# With timestamps
docker logs fondation-worker -f --timestamps

# Last hour
docker logs fondation-worker --since 1h
```

### Metrics to Monitor

| Metric | Command | Healthy Range |
|--------|---------|---------------|
| CPU Usage | `docker stats` | < 80% |
| Memory | `docker stats` | < 1.5GB |
| Disk Space | `df -h /` | > 20% free |
| Queue Depth | `curl localhost:8080/metrics` | < 100 |
| Active Jobs | `curl localhost:8080/health` | ≤ MAX_CONCURRENT_JOBS |

## Troubleshooting

### Common Issues

#### Worker Not Picking Up Jobs

1. **Check Convex connection**
   ```bash
   # Verify CONVEX_URL is correct
   grep CONVEX_URL /srv/fondation/.env
   
   # Test connectivity
   curl -I https://your-deployment.convex.cloud
   ```

2. **Check worker logs**
   ```bash
   docker logs fondation-worker --tail 100
   ```

3. **Verify jobs exist**
   - Check Convex dashboard for pending jobs
   - Ensure jobs have `status: "pending"`

#### High Memory Usage

```bash
# Check memory
docker stats fondation-worker

# Restart to clear memory
sudo systemctl restart fondation-worker

# Adjust limits in docker-compose.prod.yml
```

#### Repository Clone Failures

1. **Check disk space**
   ```bash
   df -h /
   # Clean if needed
   docker system prune -a
   ```

2. **Check GitHub access**
   ```bash
   # For public repos - should work
   # For private repos - check GitHub token in Convex
   ```

#### Claude CLI Errors

```bash
# Re-authenticate
cd /srv/fondation
./auth-claude.sh

# Check CLI version
docker exec fondation-worker claude --version
```

### Debug Mode

```bash
# Run with debug logging
docker run -it \
  -e NODE_ENV=development \
  -e DEBUG=* \
  -v /srv/claude-creds:/home/worker/.claude:ro \
  fondation-worker:latest
```

## Backup & Recovery

### Daily Backup Script
```bash
#!/bin/bash
# /srv/fondation/daily-backup.sh

# Backup credentials
./backup-creds.sh

# Backup configuration
tar -czf /srv/backups/config-$(date +%Y%m%d).tar.gz .env docker-compose.prod.yml

# Keep last 7 days
find /srv/backups -name "*.tar.gz" -mtime +7 -delete
```

### Recovery Procedure

1. **Restore configuration**
   ```bash
   cd /srv/fondation
   tar -xzf /srv/backups/config-YYYYMMDD.tar.gz
   ```

2. **Restore credentials**
   ```bash
   tar -xzf /srv/backups/claude-creds-TIMESTAMP.tar.gz -C /srv/
   ```

3. **Restart service**
   ```bash
   sudo systemctl restart fondation-worker
   ```

## Scaling

### Vertical Scaling

Increase instance resources:
```yaml
# docker-compose.prod.yml
deploy:
  resources:
    limits:
      memory: 4G  # Increased from 2G
      cpus: '2'   # Increased from 1
```

### Horizontal Scaling

Run multiple workers:

1. **Deploy second instance**
   ```bash
   # On new instance
   # Run setup script
   # Configure with different WORKER_ID
   WORKER_ID=scaleway-worker-2
   ```

2. **Load balance**
   - Workers automatically distribute load via Convex queue
   - Each worker claims jobs atomically

### Performance Tuning

```bash
# Increase concurrent jobs
MAX_CONCURRENT_JOBS=2

# Decrease poll interval for faster pickup
POLL_INTERVAL=2000

# Increase lease time for long jobs
LEASE_TIME=600000  # 10 minutes
```

## Security

### Network Security

```bash
# Firewall rules (ufw)
sudo ufw allow 22/tcp    # SSH
sudo ufw deny 8080       # Block external health check access
sudo ufw enable
```

### Secrets Management

- Never commit `.env` files
- Use read-only mounts for credentials
- Rotate credentials regularly
- Use Scaleway Secrets Manager for env vars (optional)

### Audit Logging

```bash
# Enable audit logging
docker run \
  --log-driver=syslog \
  --log-opt syslog-address=udp://syslog-server:514 \
  fondation-worker:latest
```

## Maintenance Windows

### Planned Maintenance

```bash
# Notify users (update Convex status)
# Stop accepting new jobs
sudo systemctl stop fondation-worker

# Perform maintenance
# - Update system packages
# - Docker updates
# - Credential rotation

# Start service
sudo systemctl start fondation-worker
```

### Zero-Downtime Updates

1. Deploy second worker
2. Stop first worker
3. Update first worker
4. Start first worker
5. Stop second worker

## Appendix

### Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| CONVEX_URL | Convex deployment URL | - | Yes |
| WORKER_ID | Unique worker identifier | auto-generated | No |
| POLL_INTERVAL | Job polling interval (ms) | 5000 | No |
| LEASE_TIME | Job lease duration (ms) | 300000 | No |
| HEARTBEAT_INTERVAL | Lease heartbeat (ms) | 60000 | No |
| MAX_CONCURRENT_JOBS | Parallel job limit | 1 | No |
| TEMP_DIR | Temp directory path | /tmp/fondation | No |

### Useful Commands

```bash
# Watch worker activity
watch -n 5 'docker logs fondation-worker --tail 20'

# Monitor resources
htop

# Check disk usage
ncdu /

# Test Convex connection
curl -X POST https://your-deployment.convex.cloud/version

# Clean Docker
docker system prune -a --volumes
```
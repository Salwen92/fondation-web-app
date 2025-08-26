# Runbook - Incident Response Procedures

## Table of Contents
- [Alert Response](#alert-response)
- [Common Incidents](#common-incidents)
- [Emergency Procedures](#emergency-procedures)
- [Recovery Procedures](#recovery-procedures)
- [Post-Incident](#post-incident)

## Alert Response

### Severity Levels

| Level | Response Time | Examples | Action |
|-------|--------------|----------|--------|
| **P1 - Critical** | < 15 min | Worker down, Queue stuck | Page on-call |
| **P2 - High** | < 1 hour | High error rate, Memory leak | Alert team |
| **P3 - Medium** | < 4 hours | Slow processing, Auth issues | Create ticket |
| **P4 - Low** | Next business day | Minor bugs | Log for review |

### On-Call Checklist

When paged:
1. Acknowledge alert within 5 minutes
2. Check `./monitor.sh` output
3. Review health endpoint
4. Check recent deployments
5. Follow incident-specific runbook

## Common Incidents

### 1. Worker Not Processing Jobs

**Symptoms:**
- Queue depth increasing
- No jobs transitioning from pending
- Health check failing

**Investigation:**
```bash
# Check worker status
sudo systemctl status fondation-worker

# Check health
curl localhost:8080/health

# Check logs for errors
docker logs fondation-worker --tail 100 | grep ERROR

# Check Convex connection
curl -I $CONVEX_URL
```

**Resolution:**
```bash
# Quick fix - restart worker
sudo systemctl restart fondation-worker

# If persists - check credentials
cd /srv/fondation
./auth-claude.sh

# If still failing - debug mode
docker-compose -f docker-compose.prod.yml down
docker run -it \
  -e DEBUG=* \
  -v /srv/claude-creds:/home/worker/.claude:ro \
  fondation-worker:latest
```

### 2. Jobs Stuck in Running State

**Symptoms:**
- Jobs in "running" state > 30 minutes
- Lease expired but status not updated
- Worker appears healthy

**Investigation:**
```bash
# Check for expired leases via Convex dashboard
# Look for leaseUntil < current time

# Check worker heartbeat logs
docker logs fondation-worker | grep heartbeat
```

**Resolution:**
```bash
# Manually reclaim expired leases
# In Convex dashboard, run:
# jobs.reclaimExpired()

# Or via API:
curl -X POST $CONVEX_URL/functions/jobs:reclaimExpired
```

### 3. High Memory Usage

**Symptoms:**
- Memory > 1.5GB
- OOM kills
- Slow processing

**Investigation:**
```bash
# Check memory usage
docker stats fondation-worker

# Check for memory leaks
docker logs fondation-worker | grep "heap"

# Check temp directory size
du -sh /tmp/fondation
```

**Resolution:**
```bash
# Clear temp directory
docker exec fondation-worker rm -rf /tmp/fondation/*

# Restart to clear memory
sudo systemctl restart fondation-worker

# Reduce concurrent jobs
# Edit .env: MAX_CONCURRENT_JOBS=1
sudo systemctl restart fondation-worker
```

### 4. Claude CLI Authentication Failed

**Symptoms:**
- "Unauthorized" errors in logs
- Jobs failing immediately
- CLI commands returning 401

**Investigation:**
```bash
# Check credentials exist
ls -la /srv/claude-creds/

# Test CLI directly
docker exec fondation-worker claude --version
```

**Resolution:**
```bash
# Re-authenticate
cd /srv/fondation
./auth-claude.sh

# Restore from backup if available
./backup-creds.sh  # First backup current
tar -xzf /srv/backups/claude-creds-LATEST.tar.gz -C /srv/

# Restart worker
sudo systemctl restart fondation-worker
```

### 5. Repository Clone Failures

**Symptoms:**
- Jobs failing at "cloning" stage
- "Repository not found" errors
- Timeout errors

**Investigation:**
```bash
# Check disk space
df -h /

# Check network connectivity
docker exec fondation-worker ping github.com

# Check GitHub status
curl https://www.githubstatus.com/api/v2/status.json
```

**Resolution:**
```bash
# Clear space if needed
docker system prune -a
rm -rf /tmp/fondation/*

# For private repos - check GitHub token in Convex
# Update user's GitHub token if expired

# Retry job manually
# Set job status to "pending" in Convex
```

### 6. Convex Connection Lost

**Symptoms:**
- "Failed to connect to Convex" errors
- No new jobs being claimed
- Health check shows degraded

**Investigation:**
```bash
# Check Convex URL
grep CONVEX_URL /srv/fondation/.env

# Test connectivity
curl -I $CONVEX_URL

# Check DNS
nslookup your-deployment.convex.cloud
```

**Resolution:**
```bash
# Update Convex URL if changed
nano /srv/fondation/.env
# Update CONVEX_URL

# Restart worker
sudo systemctl restart fondation-worker

# Check firewall rules
sudo ufw status
```

### 7. Disk Full

**Symptoms:**
- Write errors in logs
- Jobs failing randomly
- Cannot create temp files

**Investigation:**
```bash
# Check disk usage
df -h /
ncdu /

# Find large files
find / -type f -size +100M 2>/dev/null

# Check Docker space
docker system df
```

**Resolution:**
```bash
# Clean Docker
docker system prune -a --volumes

# Clean temp files
rm -rf /tmp/fondation/*
rm -rf /var/log/*.gz

# Clean old backups
ls -lht /srv/backups/ | tail -20 | xargs rm

# Increase disk if needed (Scaleway console)
```

## Emergency Procedures

### Complete System Failure

```bash
# 1. Stop everything
sudo systemctl stop fondation-worker

# 2. Backup current state
tar -czf /srv/emergency-backup-$(date +%Y%m%d-%H%M%S).tar.gz /srv/fondation

# 3. Reset Docker
docker system prune -a --volumes
sudo systemctl restart docker

# 4. Reinstall worker
cd /srv/fondation
docker pull fondation-worker:latest

# 5. Restore configuration
# Use backup or recreate .env

# 6. Re-authenticate Claude
./auth-claude.sh

# 7. Start service
sudo systemctl start fondation-worker
```

### Data Corruption

```bash
# 1. Stop worker
sudo systemctl stop fondation-worker

# 2. Clear corrupted data
rm -rf /tmp/fondation/*
docker volume rm fondation_worker-tmp

# 3. Reset failed jobs in Convex
# Set all "running" jobs to "pending"
# via Convex dashboard

# 4. Start fresh
sudo systemctl start fondation-worker
```

### Security Breach

```bash
# 1. IMMEDIATELY stop worker
sudo systemctl stop fondation-worker

# 2. Revoke credentials
rm -rf /srv/claude-creds/*
# Revoke GitHub tokens in Convex
# Rotate Convex deployment key

# 3. Audit logs
sudo journalctl -u fondation-worker > /srv/audit-$(date +%Y%m%d).log
docker logs fondation-worker > /srv/docker-audit-$(date +%Y%m%d).log

# 4. Update all credentials
# - New Claude auth
# - New Convex URL
# - New GitHub tokens

# 5. Deploy fresh worker image
docker pull fondation-worker:latest

# 6. Start with new credentials
./auth-claude.sh
sudo systemctl start fondation-worker
```

## Recovery Procedures

### Restore from Backup

```bash
# 1. List available backups
ls -lht /srv/backups/

# 2. Stop worker
sudo systemctl stop fondation-worker

# 3. Restore configuration
cd /srv/fondation
tar -xzf /srv/backups/config-YYYYMMDD.tar.gz

# 4. Restore credentials
tar -xzf /srv/backups/claude-creds-TIMESTAMP.tar.gz -C /srv/

# 5. Verify restoration
ls -la /srv/claude-creds/
cat .env

# 6. Start worker
sudo systemctl start fondation-worker

# 7. Monitor
./monitor.sh
```

### Failover to Secondary Instance

```bash
# On secondary instance:

# 1. Update configuration
cd /srv/fondation
nano .env
# Set WORKER_ID=scaleway-worker-backup

# 2. Copy credentials from primary
scp -r primary-ip:/srv/claude-creds /srv/

# 3. Start worker
sudo systemctl start fondation-worker

# 4. Verify processing
curl localhost:8080/metrics
```

### Rollback Deployment

```bash
# 1. Stop current version
sudo systemctl stop fondation-worker

# 2. List available images
docker images | grep fondation-worker

# 3. Tag previous version
docker tag fondation-worker:previous fondation-worker:latest

# 4. Start previous version
sudo systemctl start fondation-worker

# 5. Monitor for stability
watch -n 5 'curl -s localhost:8080/health | jq .'
```

## Post-Incident

### Incident Report Template

```markdown
# Incident Report - [Date]

## Summary
- **Duration**: Start - End time
- **Impact**: Number of jobs affected
- **Severity**: P1/P2/P3/P4

## Timeline
- HH:MM - Issue detected
- HH:MM - Investigation started
- HH:MM - Root cause identified
- HH:MM - Fix applied
- HH:MM - Service restored

## Root Cause
[Detailed explanation]

## Resolution
[Steps taken to resolve]

## Lessons Learned
- What went well
- What could be improved

## Action Items
- [ ] Task 1
- [ ] Task 2
```

### Post-Incident Checklist

- [ ] Create incident report
- [ ] Update runbook if new issue
- [ ] Review monitoring gaps
- [ ] Update alerting rules
- [ ] Schedule post-mortem meeting
- [ ] Implement preventive measures
- [ ] Test recovery procedures
- [ ] Update documentation

### Monitoring Improvements

After each incident:
1. Add new health check if gap found
2. Create alert for similar issues
3. Add metric to dashboard
4. Update runbook section
5. Share learnings with team

## Quick Reference

### Critical Commands

```bash
# Restart worker
sudo systemctl restart fondation-worker

# Emergency stop
docker kill fondation-worker

# Check health
curl localhost:8080/health

# View logs
docker logs fondation-worker -f

# Monitor resources
docker stats fondation-worker

# Reclaim jobs (in Convex)
jobs.reclaimExpired()

# Clear temp
rm -rf /tmp/fondation/*

# Re-auth Claude
./auth-claude.sh
```

### Important Files

| File | Purpose | Location |
|------|---------|----------|
| Configuration | Environment vars | `/srv/fondation/.env` |
| Credentials | Claude auth | `/srv/claude-creds/` |
| Logs | System logs | `journalctl -u fondation-worker` |
| Docker logs | Container logs | `docker logs fondation-worker` |
| Backups | Credential backups | `/srv/backups/` |
| Temp files | Cloned repos | `/tmp/fondation/` |

### Contact Information

- **On-Call**: Check PagerDuty
- **Escalation**: Team Lead → Engineering Manager → CTO
- **Convex Support**: support@convex.dev
- **Anthropic Support**: support@anthropic.com
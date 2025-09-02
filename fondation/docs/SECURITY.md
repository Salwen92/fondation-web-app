# Security Documentation

## Overview

This document outlines the security measures, best practices, and procedures for the Fondation platform.

## Authentication & Authorization

### User Authentication
- **Provider**: GitHub OAuth via NextAuth.js
- **Session**: Encrypted JWT tokens
- **Storage**: HTTP-only cookies
- **Expiry**: 30 days with sliding window

### Service Authentication

#### Claude CLI
- **Method**: Interactive browser-based authentication
- **Storage**: Credentials file in `/home/worker/.claude`
- **Access**: Read-only mount in production
- **Rotation**: Manual via `auth-claude.sh` script

#### GitHub API
- **Method**: OAuth tokens from user authentication
- **Storage**: Encrypted in Convex database
- **Scope**: Repository read access
- **Refresh**: Automatic via OAuth flow

#### Convex Database
- **Method**: Deployment URL with built-in authentication
- **Access**: Environment variable `CONVEX_URL`
- **Security**: HTTPS only, deployment-specific URL

## Secrets Management

### Environment Variables

#### Production Secrets
```bash
# Never commit these - Use environment variables only
CONVEX_URL                  # Convex deployment URL
AUTH_SECRET                 # NextAuth session encryption key
AUTH_GITHUB_SECRET          # GitHub OAuth secret
CLAUDE_CODE_OAUTH_TOKEN     # Claude Code OAuth token
GITHUB_TOKEN                # GitHub Personal Access Token
```

#### Development
- Use `.env.local` files (gitignored)
- Never use production secrets in development
- Use separate Convex deployments

### Secret Storage

| Secret Type | Storage Location | Access Method | Rotation Frequency |
|------------|------------------|---------------|-------------------|
| Claude OAuth Token | Environment variable | Process env | Yearly |
| GitHub Personal Access Token | Environment variable | Process env | Every 90 days |
| GitHub OAuth Secret | Environment variable | Process env | Yearly |
| Session Secret | Environment variable | Process env | Yearly |

### Secret Rotation Procedures

#### Rotating Claude OAuth Token
```bash
# 1. Generate new token
bunx claude auth

# 2. Update environment variables in docker-compose.worker.yml
CLAUDE_CODE_OAUTH_TOKEN="sk-ant-oat01-YOUR-TOKEN-HERE"

# 3. Restart worker
docker-compose -f docker-compose.worker.yml down
docker-compose -f docker-compose.worker.yml up -d
```

#### Rotating GitHub Personal Access Token
```bash
# 1. Create new token at https://github.com/settings/personal-access-tokens
# 2. Update environment variables
GITHUB_TOKEN=ghp_new-token-here

# 3. Restart services
docker-compose -f docker-compose.worker.yml restart
```

#### Rotating GitHub OAuth
1. Create new OAuth app in GitHub settings
2. Update environment variables
3. Redeploy application
4. Monitor for authentication issues

## Container Security

### Docker Security

#### Build-Time Security
```dockerfile
# Use minimal base image
FROM node:20-alpine

# Run as non-root user
USER worker:worker

# No sudo or privilege escalation
# No unnecessary packages
```

#### Runtime Security
- Non-root user (UID 1001)
- Read-only root filesystem where possible
- Minimal capabilities
- No privileged mode

### Volume Security
```yaml
volumes:
  # Read-only mounts for secrets
  - /srv/claude-creds:/home/worker/.claude:ro
  
  # Temporary directory with noexec
  - type: tmpfs
    target: /tmp/fondation
    tmpfs:
      size: 1G
```

## Network Security

### Firewall Rules

```bash
# Ubuntu UFW configuration
ufw allow 22/tcp     # SSH (restrict source IPs in production)
ufw allow 443/tcp    # HTTPS
ufw deny 8080        # Block external health check access
ufw enable
```

### Service Exposure
- Health check: localhost only (127.0.0.1:8080)
- No direct database access
- All external communication over HTTPS

### API Security
- Rate limiting via Convex
- Request validation with Zod schemas
- CORS configured for production domains only

## Data Security

### Encryption at Rest
- Convex database: Encrypted by default
- Local storage: Temporary files deleted after processing
- Logs: No sensitive data logged

### Encryption in Transit
- All API calls over HTTPS
- GitHub clones via HTTPS (not SSH)
- Convex connections via secure WebSocket

### Data Retention
- Job data: 90 days
- Logs: 30 days
- Temporary files: Deleted immediately after processing
- Backups: 7 days rolling

## Input Validation

### Repository URLs
```typescript
// Validate GitHub URLs only
const isValidGitHubUrl = (url: string): boolean => {
  const pattern = /^https:\/\/github\.com\/[\w-]+\/[\w-]+$/;
  return pattern.test(url);
};
```

### Job Parameters
- Prompt: Max 1000 characters
- Repository: Must exist in database
- Branch: Alphanumeric + dash only

### File Paths
- No path traversal allowed
- Restricted to temp directory
- Sanitized before use

## Vulnerability Management

### Dependency Updates
```bash
# Check for vulnerabilities
npm audit
bun audit

# Update dependencies
bun update --save

# Review changes
git diff package.json
```

### Security Headers
```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline';"
  }
];
```

## Logging & Auditing

### What to Log
✅ **Log These:**
- Authentication attempts
- Job creation/completion
- Error messages (without sensitive data)
- System health metrics

❌ **Never Log These:**
- Passwords or tokens
- Claude credentials
- Full repository contents
- User personal data

### Log Retention
```bash
# Configure log rotation
/etc/logrotate.d/fondation-worker
{
    rotate 30
    daily
    compress
    delaycompress
    missingok
    notifempty
}
```

### Audit Trail
- All job operations logged with user ID
- Status changes tracked with timestamps
- Failed authentication attempts recorded

## Incident Response

### Security Incident Checklist

1. **Immediate Actions**
   - [ ] Stop affected services
   - [ ] Preserve logs
   - [ ] Document timeline

2. **Investigation**
   - [ ] Review access logs
   - [ ] Check for unauthorized access
   - [ ] Identify scope of breach

3. **Containment**
   - [ ] Rotate all credentials
   - [ ] Revoke compromised tokens
   - [ ] Block malicious IPs

4. **Recovery**
   - [ ] Deploy patches
   - [ ] Restore from clean backup
   - [ ] Monitor for persistence

5. **Post-Incident**
   - [ ] Document lessons learned
   - [ ] Update security procedures
   - [ ] Notify affected users if required

### Contact Information
- Security Team: security@company.com
- On-Call: See PagerDuty
- External: Consider hiring incident response team

## Compliance

### Data Privacy
- No PII stored beyond GitHub username/email
- User can request data deletion
- GDPR compliance for EU users

### Security Standards
- OWASP Top 10 considerations
- Docker CIS benchmark
- GitHub security best practices

## Security Checklist

### Pre-Deployment
- [ ] All secrets in environment variables
- [ ] No hardcoded credentials
- [ ] Dependencies updated
- [ ] Security headers configured
- [ ] Input validation implemented

### Deployment
- [ ] Use HTTPS only
- [ ] Firewall configured
- [ ] Non-root user
- [ ] Read-only mounts for secrets
- [ ] Logging configured

### Post-Deployment
- [ ] Monitor for suspicious activity
- [ ] Regular security updates
- [ ] Periodic credential rotation
- [ ] Security audit annually

## Reporting Security Issues

If you discover a security vulnerability:

1. **Do NOT** create a public GitHub issue
2. Email security details to: security@company.com
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We aim to respond within 24 hours and provide a fix within 7 days for critical issues.
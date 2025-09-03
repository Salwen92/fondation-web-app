# Doppler Migration Plan for Fondation

## Executive Summary

This document outlines a comprehensive plan to migrate the Fondation project from scattered `.env` files to Doppler's centralized secrets management platform. The migration addresses critical security vulnerabilities (plain-text OAuth tokens), improves team collaboration, and establishes proper secret rotation procedures while maintaining zero downtime.

**Key Benefits:**
- Eliminate plain-text secrets in repository
- Centralized secret management across all environments
- Automatic secret injection for Docker containers
- Complete audit trail and version control
- Team synchronization without manual sharing

**Timeline:** 4-6 weeks for complete migration
**Risk Level:** Low to Medium
**Estimated Cost:** $99-299/month (Team plan recommended)

## Current State Analysis

### Environment Variable Inventory

#### Critical Secrets (HIGH PRIORITY)
```yaml
Authentication:
  - CLAUDE_CODE_OAUTH_TOKEN    # Plain text OAuth token - CRITICAL
  - GITHUB_CLIENT_SECRET        # GitHub OAuth secret
  - AUTH_SECRET                 # NextAuth secret
  - NEXTAUTH_SECRET            # Duplicate of AUTH_SECRET
  - GITHUB_TOKEN               # Personal access token
  - ENCRYPTION_KEY             # Data encryption key

Database:
  - CONVEX_DEPLOYMENT          # Convex deployment identifier
```

#### Configuration Variables (MEDIUM PRIORITY)
```yaml
URLs:
  - NEXT_PUBLIC_CONVEX_URL     # Public Convex URL
  - CONVEX_URL                 # Backend Convex URL
  - NEXTAUTH_URL               # Authentication URL
  - NEXT_PUBLIC_APP_URL        # Application URL
  - WORKER_GATEWAY_URL         # Worker service URL
  - SCALEWAY_GATEWAY_URL       # Cloud gateway URL

Service Config:
  - GITHUB_CLIENT_ID           # Public OAuth client ID
  - WORKER_ID                  # Worker identifier
  - WORKER_MODE                # Worker operation mode
```

#### Application Settings (LOW PRIORITY)
```yaml
Worker Settings:
  - POLL_INTERVAL              # Job polling interval (5000ms)
  - LEASE_TIME                 # Job lease duration (300000ms)
  - HEARTBEAT_INTERVAL         # Health check interval (60000ms)
  - MAX_CONCURRENT_JOBS        # Concurrent job limit (1)

Development:
  - NODE_ENV                   # Environment mode
  - FONDATION_ENV              # Application environment
  - FONDATION_EXECUTION_MODE   # Execution mode (local/docker)
  - DEBUG                      # Debug flags

Paths:
  - TEMP_DIR                   # Temporary directory path
  - CLI_PATH                   # CLI executable path
```

### Current Problems Identified

1. **Security Vulnerabilities**
   - Claude OAuth token exposed in plain text
   - Multiple `.env` files with duplicated secrets
   - No encryption for sensitive values
   - Secrets committed to repository history

2. **Operational Issues**
   - Manual token discovery required (recent incident)
   - Docker requires explicit `-e` flags for each secret
   - No synchronization between team members
   - Difficult secret rotation process

3. **Development Friction**
   - Multiple `.env` files to maintain
   - Environment setup complexity for new developers
   - Inconsistent configurations across environments

## Proposed Doppler Architecture

### Project Structure

```
fondation/
├── development/
│   ├── dev_local     # Local development
│   ├── dev_docker    # Docker development
│   └── dev_ci        # CI testing
├── staging/
│   ├── stg_web       # Staging web app
│   ├── stg_worker    # Staging worker
│   └── stg_preview   # PR previews
└── production/
    ├── prod_web      # Production web
    ├── prod_worker   # Production worker
    └── prod_cli      # Production CLI
```

### Secret Hierarchy

```yaml
Global Secrets (inherited by all):
  - CLAUDE_CODE_OAUTH_TOKEN
  - GITHUB_CLIENT_ID
  - GITHUB_CLIENT_SECRET
  - CONVEX_URL
  - CONVEX_DEPLOYMENT

Service-Specific:
  web:
    - AUTH_SECRET
    - NEXTAUTH_URL
    - NEXT_PUBLIC_CONVEX_URL
    - ENCRYPTION_KEY
    
  worker:
    - WORKER_ID
    - POLL_INTERVAL
    - LEASE_TIME
    - MAX_CONCURRENT_JOBS
    
  cli:
    - CLI_PATH
    - TEMP_DIR
```

### Access Control Matrix

| Role | Development | Staging | Production |
|------|------------|---------|------------|
| Developer | Read/Write | Read | No Access |
| DevOps | Read/Write | Read/Write | Read |
| Admin | Full Access | Full Access | Full Access |
| CI/CD | Read | Read | Read |

## Migration Strategy

### Phase 1: Preparation (Week 1)

#### 1.1 Doppler Setup
```bash
# Install Doppler CLI
curl -Ls --tlsv1.2 --proto "=https" --retry 3 \
  https://cli.doppler.com/install.sh | sudo sh

# Authenticate
doppler login

# Create project
doppler projects create fondation

# Create environments
doppler environments create development
doppler environments create staging
doppler environments create production

# Create configs
doppler configs create --project fondation --environment development dev_local
doppler configs create --project fondation --environment development dev_docker
doppler configs create --project fondation --environment staging stg_web
doppler configs create --project fondation --environment production prod_web
```

#### 1.2 Initial Secret Import
```bash
# Export current secrets (for backup)
cat .env > .env.backup.$(date +%Y%m%d)

# Import to Doppler (development)
doppler secrets upload --project fondation --config dev_local .env

# Verify secrets
doppler secrets --project fondation --config dev_local
```

#### 1.3 Team Onboarding
- Create Doppler accounts for team members
- Configure access permissions
- Document emergency access procedures

### Phase 2: Development Environment (Week 2)

#### 2.1 Local Development Integration

**package.json updates:**
```json
{
  "scripts": {
    "dev": "doppler run -- bun run dev:services",
    "dev:services": "concurrently \"bun run dev:convex\" \"bun run dev:web\" \"bun run dev:worker\"",
    "dev:web": "doppler run --config dev_local -- cd packages/web && bun run dev",
    "dev:worker": "doppler run --config dev_local -- cd packages/worker && bun run dev",
    "dev:cli": "doppler run --config dev_local -- cd packages/cli && bun run dev"
  }
}
```

**Developer workflow:**
```bash
# One-time setup
doppler setup --project fondation --config dev_local

# Run development
bun run dev  # Automatically injects secrets from Doppler
```

#### 2.2 CLI Integration

**Updated CLI execution:**
```bash
# Source execution with Doppler
doppler run -- bun run cli:source analyze /path/to/repo

# Distribution execution
doppler run -- bun dist/cli.bundled.mjs analyze /path/to/repo
```

### Phase 3: Docker Integration (Week 3)

#### 3.1 Docker Compose Integration

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  web:
    image: fondation/web:latest
    env_file:
      - .env.docker  # Generated by Doppler
    command: sh -c "doppler run --mount .env -- bun run start"
    
  worker:
    image: fondation/cli:latest
    environment:
      DOPPLER_TOKEN: ${DOPPLER_TOKEN_WORKER}
    command: doppler run -- bun run worker
    
  cli:
    image: fondation/cli:latest
    environment:
      DOPPLER_TOKEN: ${DOPPLER_TOKEN_CLI}
    volumes:
      - ./workspace:/workspace
      - ./output:/output
    command: doppler run -- analyze /workspace
```

#### 3.2 Dockerfile Updates

**Dockerfile.production:**
```dockerfile
# Add Doppler CLI to production image
FROM oven/bun:1.2.5-slim AS runtime

# Install Doppler
RUN apt-get update && apt-get install -y \
  curl \
  gnupg \
  && curl -Ls --tlsv1.2 --proto "=https" --retry 3 \
    https://cli.doppler.com/install.sh | sh \
  && apt-get clean

# Rest of Dockerfile...

# Use Doppler to run the application
CMD ["doppler", "run", "--", "bun", "/app/cli/dist/cli.bundled.mjs"]
```

#### 3.3 Docker Run Commands

```bash
# Development
docker run --rm \
  -e DOPPLER_TOKEN="$(doppler configs tokens create --plain)" \
  -v /tmp/test-repo:/workspace \
  fondation/cli:latest

# Production (with service token)
docker run --rm \
  -e DOPPLER_TOKEN="${DOPPLER_SERVICE_TOKEN_CLI}" \
  -v /tmp/test-repo:/workspace \
  fondation/cli:latest
```

### Phase 4: CI/CD Integration (Week 4)

#### 4.1 GitHub Actions

**.github/workflows/deploy.yml:**
```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Doppler CLI
        uses: dopplerhq/cli-action@v2
        
      - name: Setup secrets
        run: |
          doppler run --token ${{ secrets.DOPPLER_TOKEN_CI }} -- \
            echo "Secrets loaded"
      
      - name: Build and test
        run: |
          doppler run --token ${{ secrets.DOPPLER_TOKEN_CI }} -- \
            bun run build
            
      - name: Deploy to Vercel
        run: |
          doppler run --token ${{ secrets.DOPPLER_TOKEN_CI }} -- \
            vercel deploy --prod
```

#### 4.2 Vercel Integration

**vercel.json:**
```json
{
  "build": {
    "env": {
      "DOPPLER_TOKEN": "@doppler-token-vercel"
    }
  },
  "functions": {
    "packages/web/api/*": {
      "runtime": "nodejs18.x"
    }
  }
}
```

**Build command:**
```bash
doppler run -- bun run build
```

### Phase 5: Production Deployment (Week 5)

#### 5.1 Service Tokens

```bash
# Create service tokens for each service
doppler configs tokens create \
  --project fondation \
  --config prod_web \
  --name "Production Web Token" \
  --plain > .doppler-token-web

doppler configs tokens create \
  --project fondation \
  --config prod_worker \
  --name "Production Worker Token" \
  --plain > .doppler-token-worker

doppler configs tokens create \
  --project fondation \
  --config prod_cli \
  --name "Production CLI Token" \
  --plain > .doppler-token-cli
```

#### 5.2 Production Deployment

**Web (Vercel):**
```bash
# Add token to Vercel
vercel env add DOPPLER_TOKEN production < .doppler-token-web

# Deploy
vercel deploy --prod
```

**Worker (VPS/Cloud):**
```bash
# Deploy with Docker
docker run -d \
  --name fondation-worker \
  --restart unless-stopped \
  -e DOPPLER_TOKEN="${DOPPLER_TOKEN_WORKER}" \
  fondation/cli:latest \
  doppler run -- worker
```

### Phase 6: Cleanup (Week 6)

#### 6.1 Remove .env Files

```bash
# Backup existing .env files
tar -czf env-backup-$(date +%Y%m%d).tar.gz .env*

# Remove from repository
git rm .env .env.local .env.example
git rm packages/*/.env*

# Add to .gitignore
echo "# Doppler local config" >> .gitignore
echo ".doppler.yaml" >> .gitignore
echo ".env*" >> .gitignore

# Commit changes
git add .
git commit -m "chore: migrate to Doppler secrets management"
```

#### 6.2 Update Documentation

Create new documentation files:
- `docs/DOPPLER_SETUP.md` - Developer onboarding
- `docs/SECRET_MANAGEMENT.md` - Secret rotation procedures
- `docs/EMERGENCY_ACCESS.md` - Fallback procedures

## Technical Integration Details

### Local Development Workflow

```bash
# Developer setup (one-time)
doppler login
doppler setup --project fondation --config dev_local

# Daily workflow
bun run dev                    # Starts all services with secrets
doppler run -- bun test        # Run tests with secrets
doppler secrets                # View available secrets
doppler secrets set KEY value  # Update a secret
```

### Docker Container Secret Injection

**Method 1: Service Token (Recommended)**
```bash
# Production
docker run -e DOPPLER_TOKEN="${SERVICE_TOKEN}" image:tag

# Secrets automatically available as environment variables
```

**Method 2: Mount Secrets**
```bash
# Generate .env file
doppler secrets download --no-file --format env > .env.docker

# Use with Docker
docker run --env-file .env.docker image:tag
```

**Method 3: Direct Injection**
```bash
# For debugging only
docker run \
  $(doppler secrets download --no-file --format docker) \
  image:tag
```

### Package.json Script Updates

```json
{
  "scripts": {
    // Development
    "dev": "doppler run -- concurrently \"bun run dev:*\"",
    "dev:web": "cd packages/web && bun run dev",
    "dev:worker": "cd packages/worker && bun run dev",
    "dev:cli": "cd packages/cli && bun run dev",
    
    // Testing
    "test": "doppler run --config dev_local -- bun test",
    "test:ci": "doppler run --config dev_ci -- bun test",
    
    // Production
    "start": "doppler run -- bun run start:services",
    "build": "doppler run -- bun run build:all",
    
    // Docker
    "docker:build": "doppler run -- docker build .",
    "docker:run": "doppler run -- docker-compose up"
  }
}
```

### Secret Rotation Procedures

#### Automated Rotation (Recommended)

```bash
# Setup rotation for Claude token (monthly)
doppler secrets rotations create \
  --project fondation \
  --config production \
  --secret CLAUDE_CODE_OAUTH_TOKEN \
  --interval 30d

# Setup webhook for notification
doppler webhooks create \
  --project fondation \
  --url https://fondation.app/api/webhooks/secret-rotation \
  --secret $WEBHOOK_SECRET
```

#### Manual Rotation

```bash
# 1. Generate new token
NEW_TOKEN=$(generate_new_token)

# 2. Update in Doppler
doppler secrets set CLAUDE_CODE_OAUTH_TOKEN=$NEW_TOKEN

# 3. Restart services (automatic with Doppler)
# Services pick up new value on next run
```

### Emergency Access Procedures

#### Doppler Outage Fallback

```bash
# Export secrets to encrypted file (daily backup)
doppler secrets download \
  --no-file \
  --format env | \
  gpg --encrypt --recipient emergency@fondation.io \
  > secrets.$(date +%Y%m%d).env.gpg

# Restore in emergency
gpg --decrypt secrets.20240102.env.gpg > .env.emergency
source .env.emergency
```

#### Break-Glass Access

```yaml
Emergency Procedure:
  1. Access emergency vault (1Password/Vault)
  2. Retrieve Doppler admin credentials
  3. Login to Doppler web interface
  4. Access required secrets
  5. Document access in incident log
```

## Implementation Timeline

### Week 1: Foundation
- [ ] Day 1-2: Doppler account setup and team onboarding
- [ ] Day 3-4: Create project structure and import secrets
- [ ] Day 5: Document procedures and train team

### Week 2: Development Environment
- [ ] Day 1-2: Update package.json scripts
- [ ] Day 3-4: Test local development workflow
- [ ] Day 5: Team testing and feedback

### Week 3: Docker Integration
- [ ] Day 1-2: Update Dockerfiles
- [ ] Day 3-4: Test Docker workflows
- [ ] Day 5: Document Docker procedures

### Week 4: CI/CD Pipeline
- [ ] Day 1-2: GitHub Actions integration
- [ ] Day 3-4: Vercel deployment setup
- [ ] Day 5: Test automated deployments

### Week 5: Production Migration
- [ ] Day 1: Create service tokens
- [ ] Day 2-3: Deploy to staging
- [ ] Day 4-5: Production deployment

### Week 6: Cleanup & Documentation
- [ ] Day 1-2: Remove .env files
- [ ] Day 3-4: Update all documentation
- [ ] Day 5: Final testing and verification

## Risk Assessment & Mitigation

### Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Doppler service outage | Low | High | Daily encrypted backups, fallback procedures |
| Secret exposure during migration | Medium | High | Phased migration, audit logs, immediate rotation |
| Team adoption resistance | Medium | Medium | Training, documentation, gradual rollout |
| Integration complexity | Medium | Low | Extensive testing, rollback procedures |
| Cost overrun | Low | Low | Start with Team plan, monitor usage |

### Rollback Procedures

```bash
# Phase 1 Rollback (return to .env files)
git checkout main -- .env*
docker-compose down
docker-compose up

# Phase 2 Rollback (hybrid mode)
# Keep Doppler but generate .env files
doppler secrets download --no-file --format env > .env
source .env
bun run dev

# Complete Rollback
git revert --no-commit HEAD~5..HEAD
git commit -m "revert: rollback Doppler migration"
```

## Success Criteria

### Technical Success Metrics
- [ ] Zero downtime during migration
- [ ] All services running with Doppler secrets
- [ ] Automated secret rotation implemented
- [ ] CI/CD pipeline fully integrated
- [ ] Docker containers receiving secrets automatically

### Security Success Metrics
- [ ] No plain-text secrets in repository
- [ ] Complete audit trail for all secret access
- [ ] Successful secret rotation test
- [ ] Team members using individual access tokens
- [ ] Emergency access procedures tested

### Operational Success Metrics
- [ ] Developer setup time < 10 minutes
- [ ] Secret update propagation < 1 minute
- [ ] 100% team adoption
- [ ] Documentation complete and accurate
- [ ] Support tickets related to secrets reduced by 80%

## Post-Migration Validation

### Validation Checklist

#### Week 1 Post-Migration
- [ ] All services running normally
- [ ] No secret-related errors in logs
- [ ] Team feedback collected
- [ ] Performance metrics normal

#### Month 1 Post-Migration
- [ ] First secret rotation completed
- [ ] Audit logs reviewed
- [ ] Cost analysis performed
- [ ] Team satisfaction survey

#### Quarter 1 Post-Migration
- [ ] Security audit passed
- [ ] Disaster recovery test completed
- [ ] ROI analysis documented
- [ ] Process improvements identified

## Budget Considerations

### Doppler Pricing Analysis

**Current Needs:**
- 5 team members
- 4 services (web, worker, cli, convex)
- 3 environments (dev, staging, prod)
- ~50 secrets

**Recommended Plan: Team ($99/month)**
- Up to 5 users
- Unlimited secrets
- Unlimited environments
- Audit logs
- Webhooks
- Secret rotation

**Alternative: Business ($299/month)**
- If team grows > 5 members
- Advanced RBAC
- SAML SSO
- Priority support

### Cost-Benefit Analysis

**Current Hidden Costs:**
- Developer time for secret management: ~10 hours/month @ $100/hr = $1,000
- Security incident risk: Potential $10,000+ in damages
- Onboarding time: 4 hours per developer @ $100/hr = $400

**Doppler ROI:**
- Monthly cost: $99
- Monthly savings: $1,000+ in developer time
- Risk mitigation: Invaluable
- **Payback period: < 1 month**

## Answers to Specific Questions

### Q: How will developers run `bun run dev` with Doppler?

```bash
# After one-time setup
doppler setup --project fondation --config dev_local

# Daily usage (secrets auto-injected)
bun run dev  # package.json updated to use: doppler run -- [original command]
```

### Q: How will Docker containers receive secrets at runtime?

```bash
# Option 1: Service token (production)
docker run -e DOPPLER_TOKEN="${DOPPLER_SERVICE_TOKEN}" image:tag

# Option 2: Dynamic token (development)
docker run -e DOPPLER_TOKEN="$(doppler configs tokens create --plain)" image:tag

# Option 3: Pre-generated .env (CI/CD)
doppler secrets download --no-file --format env > .env.docker
docker run --env-file .env.docker image:tag
```

### Q: What changes are needed in package.json scripts?

```json
// Before
"dev": "concurrently \"bun run dev:convex\" \"bun run dev:web\""

// After
"dev": "doppler run -- concurrently \"bun run dev:convex\" \"bun run dev:web\""
```

### Q: How will secret rotation be handled?

```bash
# Automated (via Doppler dashboard or API)
doppler secrets set CLAUDE_CODE_OAUTH_TOKEN="new-token-value"
# Services automatically receive new value on next restart

# Manual with zero downtime
1. Update secret in Doppler
2. Rolling restart of services
3. Verify all services using new secret
4. Revoke old secret
```

### Q: What's the emergency access procedure if Doppler is down?

```bash
# Option 1: Use daily backup
gpg --decrypt secrets.backup.gpg > .env.emergency
source .env.emergency
bun run dev

# Option 2: Cached secrets (if Doppler CLI has cached copy)
doppler run --fallback-only -- bun run dev

# Option 3: Emergency vault access
# Access 1Password/Vault for critical secrets
# Manually export as environment variables
```

## Conclusion

The migration to Doppler represents a critical security upgrade for the Fondation project. By centralizing secret management, we eliminate the current vulnerability of plain-text OAuth tokens while significantly improving developer experience and operational efficiency.

The phased approach ensures zero downtime, comprehensive testing at each stage, and the ability to rollback if issues arise. With an estimated 4-6 week timeline and a monthly cost of $99, the migration offers immediate ROI through reduced developer overhead and eliminated security risks.

**Next Steps:**
1. Approve migration plan
2. Create Doppler account
3. Schedule Phase 1 kickoff meeting
4. Begin team training

**Point of Contact:** [DevOps Team Lead]
**Approval Required By:** [CTO/Security Officer]
**Target Start Date:** [To be determined]
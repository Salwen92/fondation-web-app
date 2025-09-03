# Doppler Setup & Configuration Guide

## Table of Contents
1. [Initial Setup](#initial-setup)
2. [Environment Configuration](#environment-configuration)
3. [Daily Usage](#daily-usage)
4. [Switching Environments](#switching-environments)
5. [Team Onboarding](#team-onboarding)
6. [Troubleshooting](#troubleshooting)
7. [Emergency Procedures](#emergency-procedures)

---

## Initial Setup

### Step 1: Install Doppler CLI

#### macOS
```bash
# Using Homebrew (recommended)
brew install dopplerhq/cli/doppler

# Or using the install script
curl -Ls https://cli.doppler.com/install.sh | sudo sh
```

#### Linux/WSL
```bash
# Debian/Ubuntu
curl -Ls https://cli.doppler.com/install.sh | sudo sh

# Or using apt
sudo apt-get update && sudo apt-get install -y apt-transport-https ca-certificates curl gnupg
curl -sLf --retry 3 --tlsv1.2 --proto "=https" 'https://packages.doppler.com/public/cli/gpg.DE2A7741A397C129.key' | sudo apt-key add -
echo "deb https://packages.doppler.com/public/cli/deb/debian any-version main" | sudo tee /etc/apt/sources.list.d/doppler-cli.list
sudo apt-get update && sudo apt-get install doppler
```

#### Verify Installation
```bash
doppler --version
# Expected: v3.75.1 or higher
```

### Step 2: Authenticate with Doppler

```bash
# Login to Doppler (opens browser)
doppler login

# Verify authentication
doppler configure get token
```

### Step 3: Configure Project

```bash
# Navigate to project root
cd /path/to/fondation-web-app/fondation

# Set up project and config
doppler setup

# You'll be prompted to select:
# Project: fondation
# Config: dev_local (for development)
```

### Step 4: Verify Setup

```bash
# Check configuration
doppler configure

# View available secrets
doppler secrets

# Test secret injection
doppler run -- echo "Convex URL: $CONVEX_URL"
```

---

## Environment Configuration

### Available Environments

| Environment | Config Name | Purpose | Who Can Access |
|------------|------------|---------|----------------|
| Development | `dev_local` | Local development | All developers |
| Development | `dev_personal` | Personal dev config | Individual developer |
| Staging | `stg` | Staging environment | DevOps + Senior devs |
| Production | `prd` | Production environment | DevOps only |

### Project Structure in Doppler

```
fondation/
├── dev (Development Environment)
│   ├── dev_local     # Shared development config
│   └── dev_personal  # Personal overrides
├── stg (Staging Environment)
│   └── stg          # Staging config
└── prd (Production Environment)
    └── prd          # Production config
```

---

## Daily Usage

### Running Development Server

```bash
# Standard development (uses dev_local by default)
bun run dev

# This internally runs:
# doppler run --project fondation --config dev_local -- [actual command]
```

### Running Individual Services

```bash
# Web application only
bun run dev:web

# Worker service only
bun run dev:worker

# CLI development
bun run dev:cli
```

### Manual Commands with Doppler

```bash
# Run any command with secrets injected
doppler run -- bun test
doppler run -- npm run build
doppler run -- curl "$API_ENDPOINT"

# Run with specific config
doppler run --config stg -- bun run build
```

---

## Switching Environments

### Method 1: Temporary Switch (Recommended)

```bash
# Use --config flag for one-off commands
doppler run --config stg -- bun run test
doppler run --config prd -- bun run build
```

### Method 2: Change Default Config

```bash
# Switch default config for current directory
doppler setup
# Select: fondation → stg

# Verify current config
doppler configure get config
```

### Method 3: Environment-Specific Scripts

```bash
# Development
npm run dev                    # Uses dev_local

# Staging
DOPPLER_CONFIG=stg npm run dev # Uses staging config

# Production
DOPPLER_CONFIG=prd npm run dev # Uses production config
```

### Method 4: Using Service Tokens (CI/CD)

```bash
# Generate service token for specific config
doppler configs tokens create --config prd --name "Production Token" --plain

# Use token in environment
export DOPPLER_TOKEN="dp.st.prd.xxxxxxxxxxxx"
bun run start  # Will use production config
```

---

## Team Onboarding

### For New Developers

1. **Install Doppler CLI**
   ```bash
   brew install dopplerhq/cli/doppler
   ```

2. **Authenticate**
   ```bash
   doppler login
   ```

3. **Clone Repository**
   ```bash
   git clone https://github.com/org/fondation-web-app
   cd fondation-web-app/fondation
   ```

4. **Configure Doppler**
   ```bash
   doppler setup
   # Select: fondation → dev_local
   ```

5. **Verify Setup**
   ```bash
   bun run doppler:validate
   ```

6. **Start Development**
   ```bash
   bun install
   bun run dev
   ```

### Access Permissions

| Role | Development | Staging | Production |
|------|------------|---------|------------|
| Junior Developer | Read/Write | No Access | No Access |
| Senior Developer | Read/Write | Read | No Access |
| DevOps Engineer | Read/Write | Read/Write | Read/Write |
| Team Lead | Read/Write | Read/Write | Read |

---

## Common Commands Reference

### Viewing Secrets

```bash
# List all secrets in current config
doppler secrets

# View specific secret
doppler secrets get CLAUDE_CODE_OAUTH_TOKEN

# Download as .env file (for debugging)
doppler secrets download --no-file --format env > .env.debug
```

### Updating Secrets

```bash
# Update a single secret
doppler secrets set WORKER_ID="worker-dev-2"

# Update multiple secrets
doppler secrets upload .env.new

# Delete a secret
doppler secrets delete DEPRECATED_KEY
```

### Config Management

```bash
# List all configs
doppler configs --project fondation

# View current config
doppler configure get config

# Create new config
doppler configs create --project fondation --environment dev --name dev_feature
```

---

## Docker Integration

### Using Doppler with Docker

```bash
# Build with Doppler
docker build -f packages/cli/Dockerfile.production -t fondation/cli:latest .

# Run with service token
docker run -e DOPPLER_TOKEN="$(doppler configs tokens create --plain --max-age=1h)" \
  fondation/cli:latest analyze /workspace

# Docker Compose
DOPPLER_TOKEN_WORKER="$(doppler configs tokens create --config prd --plain)" \
  docker-compose -f docker-compose.doppler.yml up
```

### Docker Compose Configuration

```yaml
# docker-compose.doppler.yml
services:
  worker:
    image: fondation/cli:latest
    environment:
      - DOPPLER_TOKEN=${DOPPLER_TOKEN_WORKER}
```

---

## Troubleshooting

### Issue: "Doppler Error: Could not find requested config"

**Solution:**
```bash
# Check available configs
doppler configs --project fondation

# Reset configuration
doppler setup --project fondation --config dev_local
```

### Issue: "Authentication failed"

**Solution:**
```bash
# Re-authenticate
doppler login

# Check token status
doppler configure get token
```

### Issue: "Secrets not available in Docker"

**Solution:**
```bash
# Ensure token is passed correctly
docker run -e DOPPLER_TOKEN="$DOPPLER_TOKEN" image:tag

# Or generate fresh token
docker run -e DOPPLER_TOKEN="$(doppler configs tokens create --plain)" image:tag
```

### Issue: "Wrong environment secrets"

**Solution:**
```bash
# Check current config
doppler configure get config

# Explicitly specify config
doppler run --config dev_local -- bun run dev
```

### Issue: "Permission denied"

**Solution:**
```bash
# Check your access level
doppler projects

# Request access from admin
# Contact: devops@company.com
```

---

## Emergency Procedures

### Doppler Service Outage

```bash
# Use fallback .env file (if available)
doppler secrets download --no-file --format env > .env.emergency
source .env.emergency
bun run dev

# Or use cached secrets
doppler run --fallback-only -- bun run dev
```

### Lost Access to Doppler

```bash
# Contact admin for emergency access
# Emergency contact: security@company.com

# Use backup service token (stored in 1Password)
export DOPPLER_TOKEN="dp.st.emergency.xxxxx"
bun run dev
```

### Rotating Compromised Secrets

```bash
# 1. Update secret in Doppler
doppler secrets set CLAUDE_CODE_OAUTH_TOKEN="new-token-value"

# 2. Restart all services
docker-compose restart
pm2 restart all

# 3. Verify services are using new secret
doppler audit-logs --limit 10
```

---

## Best Practices

### DO's ✅
- Always use Doppler for secret management
- Keep dev_local config for shared development
- Use service tokens for CI/CD
- Regularly rotate sensitive tokens
- Check audit logs for unusual access

### DON'Ts ❌
- Never commit secrets to git
- Don't share your personal Doppler token
- Avoid creating .env files with real secrets
- Don't use production config for development
- Never log or print sensitive secrets

---

## Quick Reference Card

```bash
# Essential Commands
doppler login                          # Authenticate
doppler setup                          # Configure project
doppler secrets                        # View all secrets
doppler run -- [command]              # Run with secrets
doppler configure get config          # Check current config

# Package.json Scripts
bun run dev                           # Start with Doppler
bun run doppler:setup                 # Initial setup
bun run doppler:secrets               # View secrets
bun run doppler:validate              # Validate secrets
bun run dev:nodoppler                 # Fallback without Doppler

# Environment Switching
doppler run --config dev_local        # Development
doppler run --config stg              # Staging
doppler run --config prd              # Production
```

---

## Support & Resources

- **Doppler Dashboard**: https://dashboard.doppler.com
- **Doppler Docs**: https://docs.doppler.com
- **Internal Wiki**: [Link to internal documentation]
- **DevOps Team**: devops@company.com
- **Emergency Contact**: security@company.com

---

## Appendix: Complete Secret List

| Secret Name | Description | Required | Environments |
|------------|-------------|----------|--------------|
| `CLAUDE_CODE_OAUTH_TOKEN` | Claude API authentication | Yes | All |
| `CONVEX_URL` | Database connection | Yes | All |
| `GITHUB_CLIENT_SECRET` | OAuth secret | Yes | All |
| `AUTH_SECRET` | NextAuth encryption | Yes | All |
| `ENCRYPTION_KEY` | Token encryption key | Yes | All services |
| `WORKER_ID` | Worker identifier | Yes | Worker only |
| `NODE_ENV` | Environment mode | Yes | All |
| `POLL_INTERVAL` | Job polling rate | No | Worker only |
| `LEASE_TIME` | Job lease duration | No | Worker only |

---

*Last Updated: January 2025*
*Version: 1.0.0*
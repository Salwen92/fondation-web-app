# Doppler Configuration Guide for Fondation

## Quick Start

### 1. Install Doppler CLI
```bash
# macOS
brew install dopplerhq/cli/doppler

# Linux/WSL
curl -Ls https://cli.doppler.com/install.sh | sudo sh
```

### 2. Authenticate & Setup
```bash
# Login (opens browser)
doppler login

# Configure project (run in fondation directory)
cd fondation
doppler setup
# Select: Project → fondation
# Select: Config → dev_local
```

### 3. Start Development
```bash
# All secrets are automatically injected
bun run dev
```

---

## Environment Switching

### Available Environments
- **dev_local** - Local development (default)
- **stg** - Staging environment
- **prd** - Production environment

### Switch Between Environments
```bash
# Temporary switch for one command
doppler run --config stg -- bun run test
doppler run --config prd -- bun run build

# Change default environment
doppler setup
# Select new config
```

---

## Common Commands

```bash
# View all secrets
doppler secrets

# View specific secret
doppler secrets get CLAUDE_CODE_OAUTH_TOKEN

# Update a secret
doppler secrets set WORKER_ID="worker-dev-2"

# Download secrets as .env (debugging only)
doppler secrets download --no-file --format env > .env.debug

# Validate secrets
bun run doppler:validate
```

---

## Docker Integration

```bash
# Generate token for Docker
DOPPLER_TOKEN=$(doppler configs tokens create --plain --max-age=1h)

# Run Docker with Doppler
docker run -e DOPPLER_TOKEN="$DOPPLER_TOKEN" \
  fondation/cli:latest analyze /workspace

# Docker Compose
DOPPLER_TOKEN_WORKER="$DOPPLER_TOKEN" \
  docker-compose -f docker-compose.doppler.yml up
```

---

## Troubleshooting

### "Could not find requested config"
```bash
doppler setup --project fondation --config dev_local
```

### "Authentication failed"
```bash
doppler login
```

### "Secrets not available in Docker"
Ensure DOPPLER_TOKEN is passed:
```bash
docker run -e DOPPLER_TOKEN="$(doppler configs tokens create --plain)" image:tag
```

### Emergency Fallback (No Doppler)
```bash
# Use traditional .env file
bun run dev:nodoppler
```

---

## Team Access

| Role | Development | Staging | Production |
|------|------------|---------|------------|
| Developer | Read/Write | No Access | No Access |
| Senior Dev | Read/Write | Read | No Access |
| DevOps | Read/Write | Read/Write | Read/Write |

---

## Required Secrets

| Secret | Description | Required |
|--------|-------------|----------|
| `CLAUDE_CODE_OAUTH_TOKEN` | Claude API auth | Yes |
| `CONVEX_URL` | Database URL | Yes |
| `GITHUB_CLIENT_SECRET` | OAuth secret | Yes |
| `AUTH_SECRET` | NextAuth key | Yes |
| `WORKER_ID` | Worker identifier | Worker only |

---

For detailed setup instructions, see [DOPPLER_SETUP_GUIDE.md](../fondation/docs/DOPPLER_SETUP_GUIDE.md)
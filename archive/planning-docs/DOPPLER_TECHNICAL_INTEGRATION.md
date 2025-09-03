# Doppler Technical Integration Guide

## Quick Start for Developers

### Initial Setup (5 minutes)
```bash
# 1. Install Doppler CLI
curl -Ls https://cli.doppler.com/install.sh | sudo sh

# 2. Authenticate
doppler login

# 3. Configure project (one-time)
doppler setup --project fondation --config dev_local

# 4. Run development normally
bun run dev  # Secrets auto-injected!
```

## Integration Points

### 1. CLI Package Integration

#### Source Execution
```typescript
// packages/cli/src/cli.ts
// Before: Reads from process.env directly
const token = process.env.CLAUDE_CODE_OAUTH_TOKEN;

// After: No changes needed! Doppler injects at runtime
const token = process.env.CLAUDE_CODE_OAUTH_TOKEN; // Works seamlessly
```

#### Bundle Execution
```bash
# Development
doppler run -- bun dist/cli.bundled.mjs analyze /repo

# Production (with service token)
DOPPLER_TOKEN=$PROD_TOKEN bun dist/cli.bundled.mjs analyze /repo
```

### 2. Worker Package Integration

#### Environment Detection Update
```typescript
// packages/shared/src/environment.ts
export interface EnvironmentInfo {
  isDoppler: boolean;  // Add Doppler detection
  // ... existing fields
}

export function detectEnvironment(): EnvironmentInfo {
  return {
    isDoppler: !!process.env.DOPPLER_ENVIRONMENT,
    isDocker: !!process.env.DOCKER_CONTAINER || fs.existsSync('/.dockerenv'),
    isProduction: process.env.NODE_ENV === 'production',
    // ... rest of detection logic
  };
}
```

#### Worker Startup Script
```typescript
// packages/worker/src/index.ts
async function startWorker() {
  // Validate Doppler secrets are present
  if (process.env.DOPPLER_ENVIRONMENT) {
    console.log('[Worker] Running with Doppler secrets from:', process.env.DOPPLER_CONFIG);
  }
  
  // Existing validation
  if (!process.env.CONVEX_URL) {
    throw new Error('CONVEX_URL is required');
  }
  
  // Continue with normal startup
  await worker.start();
}
```

### 3. Docker Integration

#### Development Dockerfile
```dockerfile
# packages/cli/Dockerfile.development
FROM oven/bun:1.2.5-slim AS development

# Install Doppler CLI
RUN apt-get update && apt-get install -y curl gnupg \
  && curl -Ls https://cli.doppler.com/install.sh | sh \
  && apt-get clean

WORKDIR /app

# Copy application files
COPY package.json bun.lockb ./
RUN bun install

COPY . .

# Use Doppler to run the application
ENTRYPOINT ["doppler", "run", "--fallback-only", "--"]
CMD ["bun", "run", "dev"]
```

#### Production Dockerfile
```dockerfile
# packages/cli/Dockerfile.production
FROM oven/bun:1.2.5-slim AS runtime

# Install Doppler CLI (minimal dependencies)
RUN apt-get update && apt-get install -y ca-certificates curl \
  && curl -Ls https://cli.doppler.com/install.sh | sh \
  && apt-get remove -y curl && apt-get autoremove -y \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1001 -s /bin/bash worker

WORKDIR /app

# Copy built application
COPY --from=builder --chown=worker:worker /app/dist ./dist
COPY --chown=worker:worker package.json ./

USER worker

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Run with Doppler
ENTRYPOINT ["doppler", "run", "--"]
CMD ["bun", "/app/dist/worker.js"]
```

#### Docker Compose Updates
```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    image: fondation/web:latest
    environment:
      - DOPPLER_TOKEN=${DOPPLER_TOKEN_WEB:-}
    command: doppler run -- bun run start
    ports:
      - "3000:3000"
    depends_on:
      - convex

  worker:
    image: fondation/worker:latest
    environment:
      - DOPPLER_TOKEN=${DOPPLER_TOKEN_WORKER:-}
    volumes:
      - /tmp/fondation:/tmp/fondation
    command: doppler run -- bun run worker
    restart: unless-stopped

  cli:
    image: fondation/cli:latest
    environment:
      - DOPPLER_TOKEN=${DOPPLER_TOKEN_CLI:-}
    volumes:
      - ./workspace:/workspace:ro
      - ./output:/output
    command: doppler run -- analyze /workspace --output /output
```

### 4. Package.json Updates

#### Root package.json
```json
{
  "scripts": {
    // Development with Doppler
    "dev": "doppler run -- concurrently \"bun run dev:*\"",
    "dev:web": "cd packages/web && bun run dev",
    "dev:worker": "cd packages/worker && bun run dev",
    "dev:convex": "cd packages/web && bunx convex dev",
    
    // Testing with Doppler
    "test": "doppler run --config dev_local -- bun test",
    "test:ci": "doppler run --config dev_ci -- bun test",
    
    // Building (doesn't need secrets)
    "build": "bun run build:all",
    
    // Production
    "start": "doppler run -- bun run start:all",
    
    // Docker operations
    "docker:dev": "doppler run -- docker-compose up",
    "docker:prod": "DOPPLER_TOKEN=$DOPPLER_SERVICE_TOKEN docker-compose -f docker-compose.prod.yml up",
    
    // Doppler utilities
    "secrets": "doppler secrets",
    "secrets:download": "doppler secrets download --no-file --format env",
    "secrets:validate": "doppler run -- node scripts/validate-secrets.js"
  }
}
```

#### Worker package.json
```json
{
  "scripts": {
    "dev": "doppler run --fallback -- tsx watch src/index.ts",
    "dev:local": "FONDATION_EXECUTION_MODE=local doppler run -- tsx watch src/index.ts",
    "dev:docker": "FONDATION_EXECUTION_MODE=docker doppler run -- tsx watch src/index.ts",
    "dev:debug": "DEBUG=* doppler run -- tsx watch src/index.ts",
    "start": "doppler run -- bun dist/index.js",
    "health": "curl -f http://localhost:8080/health || exit 1"
  }
}
```

### 5. CI/CD Integration

#### GitHub Actions
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  DOPPLER_TOKEN: ${{ secrets.DOPPLER_TOKEN_CI }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Doppler CLI
        uses: dopplerhq/cli-action@v2
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Install dependencies
        run: bun install
      
      - name: Run tests with secrets
        run: doppler run -- bun test
      
      - name: Build
        run: doppler run -- bun run build

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Doppler CLI
        uses: dopplerhq/cli-action@v2
      
      - name: Deploy to staging
        env:
          DOPPLER_TOKEN: ${{ secrets.DOPPLER_TOKEN_STAGING }}
        run: |
          doppler run -- vercel deploy --env=preview
          
  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Doppler CLI
        uses: dopplerhq/cli-action@v2
      
      - name: Deploy to production
        env:
          DOPPLER_TOKEN: ${{ secrets.DOPPLER_TOKEN_PRODUCTION }}
        run: |
          doppler run -- vercel deploy --prod
```

#### Vercel Configuration
```json
// vercel.json
{
  "buildCommand": "doppler run -- bun run build",
  "outputDirectory": "packages/web/.next",
  "framework": "nextjs",
  "env": {
    "DOPPLER_TOKEN": "@doppler-token-vercel"
  }
}
```

### 6. Secret Validation Script

```javascript
// scripts/validate-secrets.js
const required = {
  // Critical secrets
  CLAUDE_CODE_OAUTH_TOKEN: {
    pattern: /^sk-ant-oat\d+-/,
    description: 'Claude OAuth token'
  },
  CONVEX_URL: {
    pattern: /^https:\/\/.*\.convex\.cloud$/,
    description: 'Convex deployment URL'
  },
  GITHUB_CLIENT_SECRET: {
    pattern: /^[a-f0-9]{40}$/,
    description: 'GitHub OAuth secret'
  },
  AUTH_SECRET: {
    pattern: /^.{32,}$/,
    description: 'NextAuth secret (min 32 chars)'
  },
  
  // Configuration
  WORKER_ID: {
    pattern: /^worker-/,
    description: 'Worker identifier'
  }
};

const warnings = [];
const errors = [];

for (const [key, config] of Object.entries(required)) {
  const value = process.env[key];
  
  if (!value) {
    errors.push(`Missing required secret: ${key} (${config.description})`);
  } else if (!config.pattern.test(value)) {
    warnings.push(`Invalid format for ${key}: expected ${config.pattern}`);
  }
}

// Environment-specific validation
const env = process.env.DOPPLER_ENVIRONMENT || 'development';

if (env === 'production') {
  if (!process.env.SENTRY_DSN) {
    warnings.push('SENTRY_DSN recommended for production monitoring');
  }
  if (process.env.DEBUG) {
    errors.push('DEBUG must not be set in production');
  }
}

// Report results
if (errors.length > 0) {
  console.error('❌ Secret validation failed:');
  errors.forEach(e => console.error(`  - ${e}`));
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn('⚠️  Warnings:');
  warnings.forEach(w => console.warn(`  - ${w}`));
}

console.log('✅ All required secrets are present and valid');
console.log(`📍 Environment: ${env}`);
console.log(`🔑 Config: ${process.env.DOPPLER_CONFIG}`);
```

### 7. Development Utilities

#### Doppler CLI Helpers
```bash
# ~/.bashrc or ~/.zshrc aliases
alias ds='doppler secrets'                      # View secrets
alias dsu='doppler secrets upload'              # Upload .env file
alias dsd='doppler secrets download --no-file'  # Download as env vars
alias dsr='doppler run --'                      # Run command with secrets
alias dsc='doppler configs'                     # List configs
```

#### Development Scripts
```bash
#!/bin/bash
# scripts/dev-with-doppler.sh

# Check if Doppler is configured
if ! doppler configure get token &>/dev/null; then
  echo "🔑 Setting up Doppler for first time..."
  doppler login
  doppler setup --project fondation --config dev_local
fi

# Start development with secrets
echo "🚀 Starting development with Doppler secrets..."
doppler run -- bun run dev
```

### 8. Troubleshooting Common Issues

#### Issue: Doppler CLI not found in Docker
```dockerfile
# Fix: Ensure Doppler is installed in final stage
FROM node:20-alpine AS runtime
RUN apk add --no-cache curl \
  && curl -Ls https://cli.doppler.com/install.sh | sh
```

#### Issue: Secrets not available in build stage
```dockerfile
# Fix: Use build args for build-time secrets
ARG DOPPLER_TOKEN
RUN --mount=type=secret,id=doppler_token \
  DOPPLER_TOKEN=$(cat /run/secrets/doppler_token) \
  doppler run -- bun run build
```

#### Issue: Local development without internet
```bash
# Fix: Use fallback mode
doppler run --fallback-only -- bun run dev

# Or download secrets for offline use
doppler secrets download --no-file --format env > .env.offline
source .env.offline && bun run dev
```

#### Issue: Service token expired
```bash
# Fix: Regenerate service token
doppler configs tokens create \
  --project fondation \
  --config prod_web \
  --name "New Production Token" \
  --max-age 365d
```

### 9. Security Best Practices

#### Token Scoping
```bash
# Create minimal scope tokens for each service
doppler configs tokens create \
  --project fondation \
  --config prod_web \
  --name "Web Service Token" \
  --access "read"  # Read-only access
```

#### Audit Logging
```bash
# Enable audit logging
doppler settings update --enable-audit-log

# View audit logs
doppler audit-logs --limit 100
```

#### Secret Rotation Automation
```bash
#!/bin/bash
# scripts/rotate-claude-token.sh

# Get new token from Claude
NEW_TOKEN=$(bunx claude auth --json | jq -r '.token')

# Update in Doppler
doppler secrets set CLAUDE_CODE_OAUTH_TOKEN="$NEW_TOKEN"

# Trigger service restart
kubectl rollout restart deployment/fondation-worker

# Verify services are healthy
sleep 30
curl -f http://worker.fondation.io/health || exit 1

echo "✅ Token rotation complete"
```

### 10. Migration Validation Tests

```typescript
// tests/doppler-integration.test.ts
import { describe, it, expect } from 'bun:test';

describe('Doppler Integration', () => {
  it('should have Doppler environment set', () => {
    expect(process.env.DOPPLER_ENVIRONMENT).toBeDefined();
  });
  
  it('should have all required secrets', () => {
    const required = [
      'CLAUDE_CODE_OAUTH_TOKEN',
      'CONVEX_URL',
      'GITHUB_CLIENT_SECRET',
      'AUTH_SECRET'
    ];
    
    for (const key of required) {
      expect(process.env[key]).toBeDefined();
      expect(process.env[key]).not.toBe('');
    }
  });
  
  it('should match expected environment', () => {
    const config = process.env.DOPPLER_CONFIG;
    const nodeEnv = process.env.NODE_ENV;
    
    if (config?.includes('dev')) {
      expect(nodeEnv).toBe('development');
    } else if (config?.includes('prod')) {
      expect(nodeEnv).toBe('production');
    }
  });
});
```

## Quick Reference

### Essential Commands
```bash
# View current secrets
doppler secrets

# Update a secret
doppler secrets set KEY="value"

# Run any command with secrets
doppler run -- <command>

# Download secrets as .env
doppler secrets download --no-file --format env > .env

# Switch between configs
doppler configure set config dev_local
doppler configure set config staging
```

### Environment Detection
```javascript
// Check if running with Doppler
const isDoppler = !!process.env.DOPPLER_ENVIRONMENT;

// Get current config
const config = process.env.DOPPLER_CONFIG; // e.g., "dev_local"

// Get project name
const project = process.env.DOPPLER_PROJECT; // e.g., "fondation"
```

### Docker Quick Start
```bash
# Development
docker run -it \
  -e DOPPLER_TOKEN="$(doppler configs tokens create --plain --max-age=1h)" \
  fondation/cli:latest

# Production
docker run -d \
  -e DOPPLER_TOKEN="${DOPPLER_SERVICE_TOKEN}" \
  fondation/cli:latest
```

This technical integration guide provides all the implementation details needed to successfully migrate Fondation to Doppler secrets management.
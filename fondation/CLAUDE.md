# Fondation Project Context

## Quick Start
You're working on Fondation, an AI-powered course generation system that analyzes codebases and creates tutorials.

**Location**: `/Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation`
**Branch**: `feat/audit-enhancements-production`

## Architecture
```
packages/
├── web/       # Next.js UI
├── worker/    # Job processor  
├── cli/       # Fondation analyzer (uses Claude SDK with OAuth)
└── shared/    # Shared types (TypeScript project references)
```

## Key Facts
- **Monorepo with TypeScript Project References** - Build order matters!
- **NO API KEYS** - Uses Claude SDK OAuth authentication
- **External SDK Architecture** - Claude SDK is NOT bundled (preserves spawn functionality)
- CLI bundle size: ~476KB
- Docker image: `fondation/cli:authenticated`

## Docker Build & Deployment
**IMPORTANT**: See `DOCKER_BUILD_GUIDE.md` for the complete, tested build process.

Quick reference:
```bash
# Build from monorepo root (correct order)
cd fondation && npx tsc --build --force
cd packages/cli && node scripts/bundle-cli.js --production

# Docker build & auth
docker build -f Dockerfile.production -t fondation/cli:latest .
docker run -d --name auth fondation/cli:latest tail -f /dev/null
docker exec -it auth npx claude auth
docker commit auth fondation/cli:authenticated

# Run analyze
docker run --rm -v /code:/workspace fondation/cli:authenticated \
  bash -c "cd /app/cli && node dist/cli.bundled.cjs analyze /workspace --output-dir /workspace"
```

## Current Status
✅ Monorepo build process documented
✅ Docker build working with external SDK
✅ CLI analyze command fully functional in Docker
✅ Authentication persists in image
✅ All prompts correctly resolved
# Fondation Project Context

## Quick Start
You're working on Fondation, an AI-powered course generation system that analyzes codebases and creates tutorials.

**Location**: `/Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation`
**Branch**: `feat/audit-enhancements-production`

## Architecture
```
packages/
├── web/       # Next.js UI
├── worker/    # Job processor (runs in Docker)  
├── cli/       # Fondation analyzer (uses Claude SDK)
└── shared/    # Shared types
```

## Key Facts
- **NO API KEYS** - Uses Claude SDK OAuth authentication
- Docker image ready: `fondation-worker:authenticated`
- Worker polls Convex → Claims job → Runs CLI → Parses output → Saves to Convex
- CLI generates to `.claude-tutorial-output/` directory

## Common Commands
```bash
# Build TypeScript
cd packages/worker && npx tsc --build

# Test CLI locally
cd packages/cli && bun run src/analyze-all.ts /path/to/repo

# Run worker
docker run -e CONVEX_URL=<url> fondation-worker:authenticated
```

## Current Status
✅ Monorepo integrated
✅ Docker authenticated  
✅ CLI working
❌ Output parsing not implemented (worker returns empty documents array)

## Memory Access
Use `mcp__memory__search_nodes` with query "Fondation" to get detailed architecture info.
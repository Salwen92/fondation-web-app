# Fondation Project Context

## Quick Start
You're working on Fondation, an AI-powered course generation system that analyzes codebases and creates tutorials.

**Location**: `/Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation`
**Branch**: `feat/audit-enhancements-production`

## Architecture
```
convex/         # Shared Convex database functions (consolidated)
├── _generated/ # Auto-generated API types
├── jobs.ts     # Job management
├── queue.ts    # Job queue operations
└── schema.ts   # Database schema

packages/
├── web/        # Next.js UI (imports from ../../../../../../../../convex/_generated/api.js)
├── worker/     # Job processor (imports from ../../../convex/_generated/api.js)
├── cli/        # Fondation analyzer (uses Claude SDK with OAuth)
└── shared/     # Shared types (TypeScript project references)
```

## Key Facts
- **Monorepo with TypeScript Project References** - Build order matters!
- **Consolidated Convex Structure** - Single `/convex` folder shared by all packages
- **NO API KEYS** - Uses Claude SDK OAuth authentication
- **External SDK Architecture** - Claude SDK is NOT bundled (preserves spawn functionality)
- CLI bundle size: ~476KB
- Docker image: `fondation/cli:authenticated`

---

# 📋 Fondation CLI Docker Authentication & E2E Testing Guide

## ✅ What Works Now

- **Docker Image**: `fondation/cli:authenticated`
- **All 6 CLI steps** complete successfully
- **OAuth authentication** is valid and persists
- **Complete E2E workflow** from UI → Worker → Convex → Generated Course

## 🚀 Quick Start Commands

### Test CLI Directly
```bash
# Quick test to verify authentication
docker run --rm fondation/cli:authenticated sh -c 'npx claude -p "Hello"'

# Full analysis test
docker run --rm \
  -v /path/to/code:/workspace \
  -v /tmp/output:/output \
  fondation/cli:authenticated \
  bash -c "cd /app/cli && node dist/cli.bundled.cjs analyze /workspace --output-dir /output"
```

### Start Worker with Authenticated Image
```bash
cd packages/worker
FONDATION_WORKER_IMAGE=fondation/cli:authenticated \
CONVEX_URL=https://basic-stoat-666.convex.cloud \
npm run dev
```

## ⚠️ Critical Issues & Solutions

### Issue 1: OAuth Token Expiration
**Symptom**: `Error: OAuth token has expired`
**Solution**:
```bash
# Create container for re-authentication
docker run -d --name auth fondation/cli:latest tail -f /dev/null

# Authenticate interactively (user must complete browser auth)
docker exec -it auth npx claude auth

# Commit and replace old authenticated image
docker commit auth fondation/cli:authenticated
docker stop auth && docker rm auth
```

### Issue 2: Step 4 Failure
**Symptom**: Steps 1-3 work, Step 4 fails with "Analysis failed"
**Root Cause**: Docker image built before code fixes
**Solution**:

1. Rebuild CLI bundle with fixes:
```bash
cd packages/cli
npm run build:cli
```

2. Rebuild Docker image:
```bash
docker build -f Dockerfile.production -t fondation/cli:latest .
```

3. Re-authenticate (see Issue 1 solution)

### Issue 3: Bundle Missing Prompts
**Symptom**: Step 4+ fail to find prompt files
**Solution**: Ensure bundle script copies ALL prompts:
```bash
# Check prompts are in dist/
ls -la packages/cli/dist/prompts/
# Should show: 1-abstractions.md, 2-analyze-relationships.md, etc.
```

### Issue 4: Course Page Import Paths
**Symptom**: Build error "Module not found: Can't resolve convex/_generated/api"
**Solution**: Course pages need **8 levels up** from `[jobId]` directory:
```typescript
// ❌ WRONG (too few levels)
import { api } from '../../../../../../convex/_generated/api';

// ✅ CORRECT (8 levels from packages/web/src/app/course/[owner]/[repo]/[jobId]/)
import { api } from '../../../../../../../../convex/_generated/api';
```

## 🚫 DO NOT Do These Things

### NEVER copy OAuth files between containers
```bash
# ❌ WRONG - This corrupts authentication
docker cp container1:/root/.claude container2:/root/.claude
```

### NEVER use API keys when OAuth is configured
- The CLI is set up for OAuth, not API keys
- Don't try `ANTHROPIC_API_KEY` environment variables

### NEVER test with minimal files
- Use proper JavaScript/TypeScript files with real code
- Empty or single-line files will fail analysis

### NEVER create multiple authenticated images
- Keep only: `fondation/cli:latest` and `fondation/cli:authenticated`
- Remove old images to save disk space: `docker rmi <old-image-id>`

### NEVER bundle the Claude SDK
- Keep `@anthropic-ai/claude-code` as external dependency
- It must be installed separately in Docker

## ✓ Correct E2E Test Process

### 1. Prepare Test Repository
```bash
mkdir -p /tmp/test-code
cat > /tmp/test-code/index.js << 'EOF'
// Test file with enough content for analysis
export function calculateSum(a, b) {
  return a + b;
}

export function processData(input) {
  if (!input || !Array.isArray(input)) {
    throw new Error('Invalid input');
  }
  
  return input.map(item => ({
    ...item,
    processed: true,
    timestamp: Date.now()
  }));
}

export class DataManager {
  constructor(config) {
    this.config = config;
    this.data = [];
  }
  
  add(item) {
    this.data.push(item);
    return this;
  }
  
  getAll() {
    return [...this.data];
  }
}

module.exports = { calculateSum, processData, DataManager };
EOF
```

### 2. Start All Services
```bash
# From monorepo root
npx convex dev &

cd packages/web && npm run dev &

cd packages/worker && \
  FONDATION_WORKER_IMAGE=fondation/cli:authenticated \
  CONVEX_URL=https://basic-stoat-666.convex.cloud \
  npm run dev &
```

### 3. Test Through UI
1. Navigate to http://localhost:3000/dashboard
2. Find "test" repository
3. Click "Générer le Cours"
4. Monitor all 6 steps complete
5. Verify "Voir le cours" button appears
6. Click button to view generated course

## 📊 Expected Timeline

- **Step 1**: Extract abstractions (~60s)
- **Step 2**: Analyze relationships (~60s)
- **Step 3**: Determine order (~30s)
- **Step 4**: Generate chapters (~60s) ⚠️ Previously failing - now fixed!
- **Step 5**: Review chapters (~40s)
- **Step 6**: Create tutorials (~40s)
- **Total**: ~4-6 minutes (varies by codebase size)

## 🔍 Verification Checklist

- [ ] `docker run --rm fondation/cli:authenticated sh -c 'npx claude -p "test"'` works
- [ ] All 6 steps complete without errors
- [ ] Output files generated: `step1_abstractions.yaml`, `step2_relationships.yaml`, etc.
- [ ] Worker uses `fondation/cli:authenticated` image
- [ ] "Voir le cours" button appears in UI
- [ ] Course page loads with all content visible

## 🛠 Troubleshooting Commands

```bash
# Check OAuth status
docker run --rm fondation/cli:authenticated sh -c 'npx claude auth status'

# Test specific step
docker run --rm -v /tmp/test:/workspace \
  fondation/cli:authenticated \
  bash -c "cd /app/cli && node dist/cli.bundled.cjs analyze /workspace --steps extract --verbose"

# Check Docker images
docker images | grep fondation

# Monitor worker logs
tail -f /tmp/worker.log | grep -E "Step [0-9]/6"

# Verify convex import paths from course directory
cd "packages/web/src/app/course/[owner]/[repo]/[jobId]"
ls ../../../../../../../../convex/_generated/  # Should show api.js, etc.
```

## 📝 Key Insights

- **OAuth tokens expire** after ~90 days - re-authenticate when needed
- **Docker images must be rebuilt** after code changes
- **Each analysis step takes 30-90 seconds** depending on codebase size
- **The CLI requires real code files**, not minimal examples
- **Worker must use exact image name**: `fondation/cli:authenticated`
- **Course page imports need 8 levels up** to reach convex at monorepo root

---

# 📚 Key Documentation Files

## Root Level
- `README.md` - Main project documentation
- `DOCKER_BUILD_GUIDE.md` - Complete Docker build process
- `CONTRIBUTING.md` - Development guidelines
- `E2E_TEST_NEW_SESSION_PROMPT.md` - E2E testing procedures
- `CLAUDE.md` - This file (project context & testing guide)

## Worker Package (`packages/worker/`)
- `README.md` - Worker service documentation
- `src/cli-executor.ts` - Core CLI execution logic
- `src/index.ts` - Worker main entry point

## Convex Database (`convex/`)
- `jobs.ts` - Job management functions
- `queue.ts` - Job queue operations  
- `docs.ts` - Document storage and retrieval
- `schema.ts` - Database schema definitions
- `_generated/api.js` - Auto-generated API types (imported by all packages)

## CLI Package (`packages/cli/`)
- `src/prompts/` - Analysis prompt templates (critical for Step 4+)
- `scripts/bundle-cli.js` - CLI bundling script
- `Dockerfile.production` - Production Docker image

## Web Package (`packages/web/`)
- `src/app/course/[owner]/[repo]/[jobId]/` - Course viewing pages
- `src/components/repos/` - Repository management UI
- `src/hooks/use-job-management.ts` - Job status management

## Current Status
✅ **FULLY OPERATIONAL END-TO-END**
- Monorepo build process documented and working
- Docker build working with external SDK architecture  
- CLI analyze command fully functional in authenticated Docker container
- OAuth authentication persists correctly in Docker images
- All 6-step analysis workflow completes successfully
- **Convex API integration working** - Consolidated to single root `/convex` folder
- **Worker-Convex communication operational** - Real API calls throughout pipeline
- **Complete E2E job processing verified** - UI → Worker → Convex → Generated Course
- **Course page import paths fixed** - Correct 8-level relative imports to convex
- **"Voir le cours" functionality working** - Full course viewing experience

The entire Fondation system is production-ready! 🚀
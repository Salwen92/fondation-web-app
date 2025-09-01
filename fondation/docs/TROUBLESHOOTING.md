# Troubleshooting Guide

This guide covers common issues and their solutions, including the problems we recently fixed during the monorepo standardization.

## Table of Contents
1. [Build Issues](#build-issues)
2. [Development Issues](#development-issues)
3. [Authentication Issues](#authentication-issues)
4. [Docker Issues](#docker-issues)
5. [Database Issues](#database-issues)
6. [Recent Fixes Reference](#recent-fixes-reference)

## Build Issues

### TypeScript Compilation Errors

#### Problem: "Cannot find module 'ink'" in CLI package
```
Error: Cannot find module 'ink' or its corresponding type declarations
```

**Solution**: Update CLI tsconfig.json to use bundler resolution:
```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "jsx": "react-jsx"
  }
}
```

#### Problem: "Module not found: Can't resolve '@/env'"
**Solution**: Create missing env.js file:
```javascript
// packages/web/src/env.js
export const env = {
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || "",
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || "",
  // ... other variables
};
```

#### Problem: Deep relative import paths
```typescript
// Bad
import { api } from '../../../../../../../../convex/_generated/api';
```

**Solution**: Use standardized aliases:
```typescript
// Good
import { api } from '@convex/generated/api';
```

### Build Order Issues

#### Problem: "Could not resolve dist/cli.js"
**Cause**: TypeScript didn't build packages in correct order

**Solution**:
```bash
# Build from root with project references
cd fondation
npx tsc --build --force

# Or build in dependency order
cd packages/shared && bun run build
cd ../cli && bun run build
cd ../web && bun run build
cd ../worker && bun run build
```

### Bundle Size Issues

#### Problem: CLI bundle too large (>1MB)
**Solution**: Keep Claude SDK external in bundle-cli.js:
```javascript
external: [
  '@anthropic-ai/claude-code',  // MUST be external
  '@anthropic-ai/*',
]
```

## Development Issues

### Port Already in Use

#### Problem: "Port 3000 is already in use"
**Solution**:
```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 bun run dev:web
```

### Convex Connection Issues

#### Problem: "Cannot connect to Convex"
**Solution**:
1. Delete Convex lines from .env.local
2. Run `bun run dev` to auto-create new deployment
3. Wait for "✓ Connected to Convex deployment"

### Hot Reload Not Working

#### Problem: Changes not reflecting in browser
**Solution**:
```bash
# Clear Next.js cache
rm -rf packages/web/.next
bun run dev:web
```

## Authentication Issues

### GitHub OAuth Failures

#### Problem: "Callback URL mismatch"
**Solution**: Ensure exact match in GitHub OAuth app:
```
Homepage URL: http://localhost:3000
Authorization callback URL: http://localhost:3000/api/auth/callback/github
```

### Claude Authentication Issues

#### Problem: "OAuth token has expired" in Docker
**Solution**: Re-authenticate the container:
```bash
docker run -d --name auth fondation/cli:latest tail -f /dev/null
docker exec -it auth npx claude auth
# Complete browser flow
docker commit auth fondation/cli:authenticated
docker stop auth && docker rm auth
```

### Session Issues

#### Problem: "Session expired" or login loops
**Solution**: Generate new AUTH_SECRET:
```bash
openssl rand -base64 32
# Update in .env.local
```

## Docker Issues

### Build Failures

#### Problem: "No suitable shell found"
**Cause**: Alpine doesn't have bash by default

**Solution**: Install bash in Dockerfile:
```dockerfile
FROM node:20-alpine
RUN apk add --no-cache bash git curl
```

### Container Can't Find Prompts

#### Problem: "Prompt file not found"
**Solution**: Ensure prompts are copied in bundle script:
```javascript
const promptFiles = readdirSync(promptsSrc).filter(f => f.endsWith('.md'));
for (const file of promptFiles) {
  copyFileSync(join(promptsSrc, file), join(promptsDest, file));
}
```

### Analysis Hangs

#### Problem: Analyze command hangs in Docker
**Checklist**:
```bash
# 1. Check authentication
docker exec <container> ls /root/.claude.json

# 2. Check bash installed
docker exec <container> bash --version

# 3. Check SDK installed
docker exec <container> ls node_modules/@anthropic-ai/
```

## Database Issues

### Convex Function Errors

#### Problem: "Property 'jobs' does not exist on type"
**Solution**: Use typed references instead of strings:
```typescript
// Wrong
await ctx.scheduler.runAfter(0, "jobs.runWorker", { jobId });

// Correct
import { internal } from "./_generated/api";
await ctx.scheduler.runAfter(0, internal.jobs.runWorker, { jobId });
```

### Job Stuck in Pending

#### Problem: Jobs stay "pending" forever
**Solution**: Clear stuck jobs:
```bash
# From web UI console
const result = await ctx.runMutation(api.jobs.clearStuckJobs, {
  repositoryId: repoId
});
```

### Real-time Updates Not Working

#### Problem: UI not updating when job status changes
**Solution**: Check subscription in React component:
```typescript
const job = useQuery(api.jobs.getJob, { jobId });
// Should auto-update when job changes
```

## Recent Fixes Reference

### **Phase 2 CLI Execution Testing Fixes (Latest)**

**Primary Issue**: Worker crashes with exit code 158  
**Root Cause**: Missing CONVEX_URL environment variable  
**Impact**: Prevented all CLI execution in development mode  
**Solution**: Explicit environment variable configuration

**Secondary Issue**: Invalid CLI profile configuration  
**Root Cause**: Using "development" profile instead of "dev"  
**Impact**: CLI execution failures even when worker started  
**Solution**: Corrected profile name in development-strategy.ts

**Additional Findings**:
- Timeout removal improved reliability (per user request)
- Silent error handling masked actual issues
- Development mode works better with local execution
- French step progression ("Étape X/6") functions correctly
- Real-time UI updates work when worker properly connects

### **Phase 1 Monorepo Standardization Fixes**

1. **CLI Module Resolution** (25+ TypeScript errors)
   - Changed to "bundler" moduleResolution
   - Added JSX support

2. **Missing env.js Module**
   - Created environment configuration file
   - Fixed web build failures

3. **Convex Type Errors** (13+ errors)
   - Added internal API imports
   - Changed actions to internalActions
   - Replaced string literals with typed references

4. **Next.js 15 Compatibility**
   - Updated async params handling
   - Fixed type-only imports

5. **Import Path Standardization** (47 imports)
   - Eliminated deep relative imports
   - Established @convex/* aliases

6. **French Progress Tracking** (Step Display Issues)
   - Fixed "Étape 0 sur 6" display (now shows "Étape 1 sur 6")
   - Updated regex patterns to match French "Étape" instead of English "Step"
   - Standardized to 6 steps throughout system (was inconsistently 7)
   - Implemented 1-based display indexing while keeping internal 0-based

## Environment Variable Issues

### Missing Variables

#### Problem: "GITHUB_CLIENT_ID is not defined"
**Solution**: Copy and configure .env.example:
```bash
cp .env.example .env.local
# Edit with your values
```

### Convex Auto-configuration

#### Problem: Convex URLs not set
**Solution**: Let Convex auto-configure:
```bash
# Just run dev, it creates everything
bun run dev
# URLs saved to .env.local automatically
```

## Performance Issues

### Slow Builds

#### Problem: Builds taking too long
**Solutions**:
```bash
# Use incremental compilation
bun run typecheck  # Creates .tsbuildinfo cache

# Build specific package
bun run build:web  # Just web, not everything

# Clean if corrupted
bun run clean:cache
```

### High Memory Usage

#### Problem: Node running out of memory
**Solution**:
```bash
# Increase Node memory
NODE_OPTIONS="--max-old-space-size=4096" bun run build
```

## Progress Tracking Issues

### **Phase 2 Issue: CLI Profile Configuration Error (FIXED)**

#### Problem: CLI execution fails with "profile not found"
**Root Cause**: Worker using invalid profile "development" instead of "dev"  
**Fixed In**: `packages/worker/src/cli-strategies/development-strategy.ts`  
**Status**: ✅ **RESOLVED** during Phase 2 testing

**Before (incorrect):**
```bash
bun src/cli.ts analyze /path --profile development  # ❌ Invalid profile
```

**After (correct):**
```bash
bun src/cli.ts analyze /path --profile dev  # ✅ Valid profile
```

### Problem: Shows "Étape 0 sur 6" Instead of "Étape 1 sur 6"
**Cause**: Display logic not implementing 1-based indexing

**Solution**: Update progress-bar.tsx to use 1-based display:
```typescript
// packages/web/src/components/repos/progress-bar.tsx
const displayStep = Math.max(1, currentStep);
const percentage = Math.round((displayStep / totalSteps) * 100);
```

### Problem: Progress Not Extracting from French Messages
**Cause**: Worker regex pattern looking for English "Step" instead of French "Étape"

**Solution**: Update worker regex pattern:
```typescript
// packages/worker/src/worker.ts
const stepMatch = progress.match(/Étape (\d+)\/(\d+):/);
```

### Problem: Total Steps Shows 7 Instead of 6
**Cause**: Inconsistent step count initialization

**Solution**: Update all occurrences to use 6 steps:
```typescript
// convex/jobs.ts
totalSteps: 6,  // Not 7

// convex/queue.ts
totalSteps: 6,
```

## Worker Issues

### **CRITICAL: Worker Crashes with Exit Code 158 (Phase 2 Finding)**

#### Problem: Worker appears to start but immediately crashes
**Root Cause**: Missing `CONVEX_URL` environment variable  
**Discovery**: This was the primary issue preventing Phase 2 CLI execution

**Symptoms:**
- Worker process exits with code 158
- No jobs are processed
- Silent failure with minimal error logs
- Worker restarts in endless loop

**Solution (Phase 2 Validated):**
```bash
# Development mode (recommended)
cd packages/worker
NODE_ENV=development \
FONDATION_EXECUTION_MODE=local \
CONVEX_URL=https://basic-stoat-666.convex.cloud \
bun run dev

# Verify environment variable is set
echo $CONVEX_URL  # Should show URL, not empty
```

### Worker Not Processing Jobs

#### Problem: Jobs stay pending, worker not claiming
**Phase 2 Updated Checklist**:
1. **MOST IMPORTANT**: Check `CONVEX_URL` is set: `echo $CONVEX_URL`
2. Check worker is running: `bun run dev:worker`
3. Check Convex connection in logs (look for "Connected to Convex deployment")
4. Check CLI profile is "dev" not "development" (fixed in Phase 2)
5. Check Docker image is authenticated (production only)

### Docker Spawn Failures

#### Problem: "Failed to spawn Docker container"
**Solutions**:
```bash
# Check Docker is running
docker ps

# Check image exists
docker images | grep fondation

# Check authentication
docker run --rm fondation/cli:authenticated --version
```

## Quick Fixes

### Nuclear Reset
When nothing else works:
```bash
# Complete reset
bun run clean:all
bun install
bun run build
```

### Clear All Caches
```bash
rm -rf node_modules/.cache
rm -rf packages/*/.next
rm -rf packages/*/dist
rm -rf packages/*/*.tsbuildinfo
rm -rf .turbo
```

### Fresh Convex Deployment
```bash
# Delete Convex lines from .env.local
grep -v CONVEX .env.local > .env.local.tmp
mv .env.local.tmp .env.local

# Restart to create new deployment
bun run dev
```

## Getting Help

If these solutions don't work:

1. **Check logs carefully** - The error message usually hints at the solution
2. **Search existing issues** - Someone may have had the same problem
3. **Create minimal reproduction** - Isolate the problem
4. **Ask for help** with:
   - Error message
   - What you tried
   - Environment details
   - Relevant code

---

For architecture details, see [Architecture Guide](./ARCHITECTURE.md).
For development workflow, see [Development Guide](./DEVELOPMENT.md).
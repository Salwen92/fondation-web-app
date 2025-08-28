# Fondation E2E Success Runbook

## Problem Solved
Fixed "Analyse en cours..." hanging issue where repository cards got stuck at "Étape 0 sur 7" with 0% progress indefinitely.

## Root Cause Resolution

### ✅ What Was Fixed

1. **Docker Authentication**: OAuth tokens properly embedded in `fondation-worker:authed-patched` image
2. **Worker Entrypoint**: Fixed Docker CMD to run worker process instead of `claude login`  
3. **Docker-in-Docker Issue**: CLI now executes directly inside container with `isInsideDocker` detection
4. **Environment Variables**: Proper `HOME=/home/worker` and `NODE_PATH=/app/node_modules` propagation
5. **CLI Progress Logging**: Added "Step 1:", "Step 2:" console output for progress tracking
6. **Artifacts Location**: CLI outputs to default `.claude-tutorial-output` directory (removed override)
7. **ESM Compatibility**: Fixed `pino-pretty` import in CLI logger

### ✅ Success Criteria (All Met)

- Job row shows `currentStep` climbing (0→6) and `totalSteps` consistent  
- After artifacts parse, `docsCount > 0`
- Final job row has `status="completed"`, `completedAt` set, `result.success=true`
- Repository card flips to "Voir le cours" and course page renders

## Durability Guidelines

### 1. Image + Config
- **Image**: Use `fondation-worker:authed-patched-<date>-<sha>` for explicit versioning
- **Environment**: Keep `HOME=/home/worker`, `NODE_PATH=/app/node_modules`
- **No Overrides**: Remove any `CLAUDE_OUTPUT_DIR` override

### 2. Step Model (6 Steps Everywhere)
- Job creation: `totalSteps: 6`
- Worker progress: Steps 1-6
- UI display: Percentage based on 6 steps
- UI subscription: Latest job for that repo (match toast jobId)

### 3. Persistence Contract
- **Progress**: Always include `status`, `currentStep`, `totalSteps`, `message`
- **Completion**: Always include `status="completed"`, `completedAt`, validator-compliant `result`, `docsCount`

### 4. Artifacts → Convex
- Parser looks only under `.claude-tutorial-output/` within job's working dir
- Save YAML + chapters + tutorials (set `docsCount` accurately)

### 5. Observability & SLOs
- Emit timeline: `claimed → cloning → step1…step6 → parsing → completed`
- **Alert if:**
  - No progress for >2 min
  - Total runtime >10 min  
  - Completion without `docsCount > 0`
- Log `jobId` on every mutation

## Quick E2E Validation

```bash
# 1. Clean start
# Ensure ports 3000/8080 free, one Convex deployment

# 2. Trigger test repo
# - Generate course for "test" repo
# - Capture toast jobId

# 3. Assert success
# - Steps increment 0→6
# - docsCount > 0  
# - Repo card flips to "Voir le Cours"
# - Course page renders content
```

## Key Files Changed

- `packages/worker/src/cli-executor.ts` - Docker-in-Docker fix, environment variables
- `packages/cli/src/analyze-all.ts` - Progress logging  
- `packages/cli/dist/analyze-all.js` - Progress logging (compiled)
- `packages/cli/dist/cli/utils/logger.js` - ESM import fix

## Emergency Reset Protocol

1. Check worker container logs: `docker logs fondation-worker-fixed-artifacts`
2. Verify image: `fondation-worker:authed-patched` 
3. Clear stuck jobs: Cancel all jobs in UI, test with "test" repo only
4. Validate OAuth: `claude -p /status` inside container should show authenticated
5. Check progress persistence: Monitor job row `currentStep` field in Convex dashboard

## Success Indicators

- ✅ Toast: "Documentation generation started!"
- ✅ Progress: "Étape X sur 6" incrementing  
- ✅ Status: "Cours Prêt" with "X docs"
- ✅ Button: "Voir le Cours" clickable
- ✅ Navigation: Course page loads with content

---

*Last updated: 2025-08-28*
*Status: E2E Recovery Complete ✅*
# Fondation E2E Testing Guide with Playwright MCP

## Project Context

**Project**: Fondation - AI-powered course generation system that analyzes codebases and creates tutorials
**Location**: `/Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation`
**Current Branch**: `feat/audit-enhancements-production`

### Architecture Overview
```
packages/
├── web/       # Next.js UI (port 3000)
├── worker/    # Job processor (runs in Docker on port 8080)
├── cli/       # Fondation analyzer (uses Claude SDK OAuth)
└── shared/    # Shared types
```

### Key Technical Details
- **Authentication**: Uses Claude SDK OAuth (NO API KEYS) - `claude login` required
- **Docker Runtime**: `fondation-worker:authed-patched` with baked-in ESM patches and OAuth tokens
- **Canonical Command**: `cd /app/packages/cli && NODE_PATH=/app/node_modules node dist/analyze-all.js <repo>`
- **Backend**: Convex real-time database with job queue system
- **Job Flow**: User triggers → Convex job created → Worker polls → Docker spawns → CLI runs → Output parsed → Results saved

## Service Stack Requirements

Before testing, ensure all services are running:

### 1. Convex Dev Server
```bash
cd /Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation/packages/web
npx convex dev
```
**Expected**: Should connect to `dev:basic-stoat-666` deployment

### 2. Worker Service
```bash
cd /Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation/packages/worker
CONVEX_URL=https://basic-stoat-666.convex.cloud npm run dev
```
**Expected**: Worker polling on port 8080

### 3. Docker Authentication Verification
```bash
docker run --rm --user 1001:1001 -e HOME=/home/worker \
  fondation-worker:authed-patched sh -lc 'claude -p "auth ok?" --output-format text | head -3'
```
**Expected**: "Auth OK. Running as user `worker` with standard permissions"

### 4. Web Application
```bash
cd /Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation/packages/web
npm run dev
```
**Expected**: Running on http://localhost:3000 (NOT 3001 - kill any processes on port 3000 first)

## E2E Testing Rules & Requirements

### Core Testing Principles
1. **NO MOCKS** - Test real implementation only
2. **NO DEMO DATA** - Use actual repositories for testing
3. **Real Docker Runtime** - Must use `fondation-worker:authed-patched` image
4. **Live Monitoring** - Track all services during test execution
5. **Full Stack Validation** - Test complete user journey from UI to results

### Critical Data Test IDs
The UI components have specific `data-testid` attributes for E2E testing:

```typescript
// Repository test button
data-testid="repo-test-btn"

// Job monitoring page
data-testid="job-status"
data-testid="job-progress" 
data-testid="job-logs-container"
data-testid="job-log-line-{seq}"
```

### Test Repository Requirements
Use real repositories that:
- Are publicly accessible or user has access to
- Contain actual code (not empty repos)
- Are small enough for reasonable test execution time
- Have clear directory structures for CLI analysis

## Playwright MCP Testing Protocol

### Phase 1: Service Stack Verification
```typescript
// Navigate to app
await mcp__playwright__browser_navigate("http://localhost:3000");

// Take initial screenshot
await mcp__playwright__browser_take_screenshot();

// Verify login state and repository list loads
await mcp__playwright__browser_wait_for('[data-testid="repo-list"]');
```

### Phase 2: Repository Selection & Test Trigger
```typescript
// Find a suitable test repository
await mcp__playwright__browser_click('[data-testid="repo-test-btn"]:first');

// Verify job creation
await mcp__playwright__browser_wait_for('[data-testid="job-status"]');

// Take screenshot of job initiation
await mcp__playwright__browser_take_screenshot();
```

### Phase 3: Real-Time Job Monitoring
```typescript
// Wait for job to start processing
await mcp__playwright__browser_wait_for('[data-testid="job-progress"]');

// Monitor log stream (should see Docker container logs)
await mcp__playwright__browser_wait_for('[data-testid="job-logs-container"]');

// Expected log patterns to validate:
// - "[fondation-worker] image=fondation-worker:authed-patched"
// - "Cloning repository..."
// - "Running Fondation analysis..."
// - "Analysis complete"

// Take screenshot of active job
await mcp__playwright__browser_take_screenshot();
```

### Phase 4: Results Validation
```typescript
// Wait for completion
await mcp__playwright__browser_wait_for('[data-testid="job-status"][data-status="completed"]');

// Verify output files were generated
await mcp__playwright__browser_wait_for('[data-testid="job-results"]');

// Take final screenshot
await mcp__playwright__browser_take_screenshot();
```

## Expected Success Criteria

### Service Health Checks
- [x] Convex dev server connected and syncing
- [x] Worker service polling with correct CONVEX_URL
- [x] Docker image authenticated (no 401 errors)  
- [x] Web app running on port 3000 (not 3001)

### E2E Flow Validation
- [x] User can see repository list
- [x] Test button triggers actual job creation
- [x] Job appears in monitoring interface
- [x] Worker claims job from Convex queue
- [x] Docker container spawns with correct image
- [x] CLI executes with proper authentication
- [x] Real repository gets cloned and analyzed  
- [x] Output files are parsed and saved to Convex
- [x] Results appear in UI with real data (no mocks)

### Error Scenarios to Handle
- Docker authentication failures (401 errors)
- Repository access issues (private repos without access)
- CLI execution errors (ESM import failures)
- Worker service crashes or timeouts
- Convex connection issues

## Troubleshooting Quick Reference

### Common Issues
1. **Port 3001 instead of 3000**: Kill process on port 3000, restart web app
2. **Docker auth failures**: Verify `fondation-worker:authed-patched` image exists and has valid OAuth tokens
3. **ESM import errors**: Ensure Docker image was built with ESM patch script
4. **Worker not claiming jobs**: Check CONVEX_URL environment variable matches deployment

### Service Status Commands
```bash
# Check running services
lsof -i :3000 -i :8080

# Verify Convex connection
curl -s https://basic-stoat-666.convex.cloud/_system/ping

# Test Docker auth
docker run --rm fondation-worker:authed-patched claude --version
```

### Reset/Restart Protocol
If services get into bad state:
1. Kill all background processes
2. Restart Convex dev server
3. Restart worker with correct CONVEX_URL
4. Verify Docker auth
5. Restart web app on port 3000
6. Re-run E2E test

## Session Continuation Instructions

When starting fresh session for E2E testing:

1. **Read this file first** to understand project context
2. **Verify all services are running** using the stack requirements
3. **Confirm Docker authentication** before proceeding
4. **Use Playwright MCP functions** for browser automation
5. **Test real implementation only** - no mocks or demo data
6. **Monitor all services** during test execution
7. **Document any failures** with screenshots and logs
8. **Reset services if needed** using restart protocol

Remember: This is production-quality E2E testing. Every component must work together flawlessly with real data, real authentication, and real Docker runtime execution.
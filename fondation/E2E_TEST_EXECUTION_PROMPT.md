# E2E Test Execution Prompt - Fondation Real Flow Testing

## IMMEDIATE INSTRUCTIONS - START HERE

You are tasked with performing **REAL E2E testing** of the Fondation course generation system using Playwright MCP server. This is **NOT a simulation** - you will test the complete production flow with real Docker containers, real authentication, and real repositories.

## CRITICAL RULES - READ FIRST

1. **KILL ALL SERVICES FIRST** - Always start fresh by killing all running processes
2. **REAL TESTING ONLY** - No mocks, no demos, no simulations
3. **USE "test" REPO CARD** - Test specifically on the repository labeled "test" at the bottom of the dashboard
4. **WAIT 5 MINUTES** - The generation process takes ~5 minutes, you MUST wait and monitor
5. **MONITOR CONTINUOUSLY** - Check logs, services, and progress throughout
6. **START OVER IF STUCK** - If anything fails, kill all services and restart completely

## PROJECT CONTEXT

**Project**: Fondation - AI-powered course generation system
**Location**: `/Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation`
**Branch**: `feat/audit-enhancements-production`

**Architecture**:
- Web UI (Next.js) → port 3000
- Worker Service → port 8080  
- Convex Backend → dev:basic-stoat-666
- Docker Runtime → fondation-worker:authed-patched

**Authentication**: Claude SDK OAuth (NO API KEYS)
**Docker Command**: `cd /app/packages/cli && NODE_PATH=/app/node_modules node dist/analyze-all.js <repo>`

## STEP 1: FRESH START - KILL ALL SERVICES

```bash
# Kill all Node processes
pkill -f "next dev"
pkill -f "convex dev" 
pkill -f "npm run dev"
pkill -f "bun run dev"

# Kill processes on specific ports
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:8080 | xargs kill -9 2>/dev/null || true

# Verify clean slate
lsof -i :3000 -i :8080
# Should show no processes
```

## STEP 2: START ALL SERVICES IN ORDER

### 2.1 Start Convex Dev Server
```bash
cd /Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation/packages/web
npx convex dev
# Wait for: "Convex functions ready! (dev:basic-stoat-666)"
```

### 2.2 Start Worker Service  
```bash
cd /Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation/packages/worker
CONVEX_URL=https://basic-stoat-666.convex.cloud npm run dev
# Wait for: "Worker polling for jobs on port 8080..."
```

### 2.3 Verify Docker Authentication
```bash
docker run --rm --user 1001:1001 -e HOME=/home/worker \
  fondation-worker:authed-patched sh -lc 'claude -p "auth ok?" --output-format text | head -3'
# MUST return: "Auth OK. Running as user `worker`..."
```

### 2.4 Start Web Application
```bash
cd /Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation/packages/web
npm run dev
# MUST start on port 3000 (NOT 3001)
```

## STEP 3: E2E TEST EXECUTION WITH PLAYWRIGHT MCP

### Phase 1: Navigate and Setup
```typescript
// Navigate to the application
await mcp__playwright__browser_navigate("http://localhost:3000");

// Take initial screenshot
await mcp__playwright__browser_take_screenshot();

// Wait for dashboard to load
await mcp__playwright__browser_wait_for('[data-testid="repo-list"]');
```

### Phase 2: Find and Click "test" Repository
```typescript
// CRITICAL: Find the "test" repository card at bottom of dashboard
// Look for repository with name "test" or similar identifier
await mcp__playwright__browser_wait_for('[data-testid="repo-card"]:has-text("test")');

// Click the TEST button on the "test" repository card
await mcp__playwright__browser_click('[data-testid="repo-test-btn"]');

// Take screenshot of job initiation
await mcp__playwright__browser_take_screenshot();
```

### Phase 3: Monitor Job Creation and Navigation
```typescript
// Should automatically navigate to job monitoring page
await mcp__playwright__browser_wait_for('[data-testid="job-status"]');
await mcp__playwright__browser_wait_for('[data-testid="job-progress"]');

// Verify job is created and shows initial status
await mcp__playwright__browser_take_screenshot();
```

### Phase 4: REAL-TIME MONITORING (5 MINUTE WAIT)
**CRITICAL**: The job takes ~5 minutes to complete. You MUST monitor throughout:

```typescript
// Monitor job logs continuously
await mcp__playwright__browser_wait_for('[data-testid="job-logs-container"]');

// Expected log progression (wait for each):
// 1. "[fondation-worker] image=fondation-worker:authed-patched user=worker(1001)"
// 2. "Cloning repository..."  
// 3. "Running Fondation analysis..."
// 4. "Analyzing files..."
// 5. "Generating course content..."
// 6. "Analysis complete"

// Take screenshots at key milestones
await mcp__playwright__browser_take_screenshot();

// WAIT UP TO 5 MINUTES for completion
// Monitor progress indicators and log updates
```

### Phase 5: Validate Results
```typescript
// Wait for job completion
await mcp__playwright__browser_wait_for('[data-testid="job-status"][data-status="completed"]', { timeout: 300000 }); // 5 min timeout

// Verify results are displayed
await mcp__playwright__browser_wait_for('[data-testid="job-results"]');

// Take final screenshot
await mcp__playwright__browser_take_screenshot();

// Navigate to generated files/course content
// Verify actual content was generated (not mock data)
```

## MONITORING CHECKLIST DURING 5-MINUTE WAIT

While job is running, continuously check:

1. **Service Health**:
   ```bash
   # Check all services still running
   lsof -i :3000 -i :8080
   # Verify no crashes in terminal windows
   ```

2. **Docker Container Activity**:
   ```bash
   # Check for running containers
   docker ps | grep fondation-worker
   # Monitor Docker logs if container visible
   ```

3. **Convex Database Updates**:
   - Job status changes (pending → running → completed)
   - Log entries being added in real-time
   - Progress updates

4. **Browser Monitoring**:
   - Job progress bar updates
   - Real-time log stream
   - No error messages or timeouts

## SUCCESS CRITERIA

**MUST VERIFY ALL OF THESE:**
- ✅ "test" repository card found and clicked
- ✅ Job created and navigation to monitoring page
- ✅ Docker container spawned with correct image
- ✅ Real repository cloned (not mock)
- ✅ CLI analysis executed successfully  
- ✅ Output files generated and parsed
- ✅ Results saved to Convex database
- ✅ Real course content displayed (not demo data)
- ✅ Complete flow took ~5 minutes as expected

## FAILURE HANDLING - START OVER RULE

**IF ANY STEP FAILS:**
1. Take screenshot of error
2. Document the failure point
3. Kill all services (Step 1)
4. Restart all services (Step 2)  
5. Retry E2E test (Step 3)

**Common Failure Points:**
- Docker authentication (401 errors)
- Service crashes during 5-minute wait
- Port conflicts (3001 instead of 3000)
- Job timeouts or stuck status

## FINAL VALIDATION

After successful completion:
1. Navigate to generated course content
2. Verify it contains real analysis of "test" repository
3. Confirm no placeholder or mock data
4. Take screenshots of actual generated content
5. Document successful end-to-end flow

**REMEMBER**: This is testing production-quality functionality. Every component must work together flawlessly with real data, real authentication, and real Docker execution. The 5-minute wait is normal and expected - do not abort early.

---

## EXECUTION COMMAND

Start by running Step 1 (kill all services), then proceed through each phase methodically. Use Playwright MCP functions for all browser interactions. Monitor continuously during the 5-minute generation phase. Document any failures and restart if needed.

**BEGIN TESTING NOW.**
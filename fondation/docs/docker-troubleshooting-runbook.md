# Docker Troubleshooting Runbook

## Quick Diagnostic Commands

### Verify Auth in Image
```bash
docker run --rm --user 1001:1001 -e HOME=/home/worker \
  fondation-worker:authed-patched sh -lc 'claude -p "auth ok?" --output-format text | head -3'
```
**Expected**: Normal Claude response (no "Invalid API key")

### Definitive Run (Smoke Test)
```bash
docker run --rm --user 1001:1001 -e HOME=/home/worker -e NODE_PATH=/app/node_modules \
  fondation-worker:authed-patched sh -lc '
    set -e; cd /app/packages/cli;
    mkdir -p /tmp/repo && printf "# tmp\n" > /tmp/repo/README.md;
    time node dist/analyze-all.js /tmp/repo;
    echo "[ARTIFACTS]"; find /tmp/repo/.claude-tutorial-output -maxdepth 2 -type f | sort | sed -n "1,50p"
  '
```
**Expected**: YAML files + chapters listed in ~4-5 minutes

## Standard Log Preamble
All worker executions log this consistent header:
```
[fondation-worker] image=fondation-worker:authed-patched user=worker(1001) home=/home/worker
[fondation-worker] cmd="cd /app/packages/cli && NODE_PATH=/app/node_modules node dist/analyze-all.js <repo>"
[fondation-worker] start_ts=<ISO>
```

## Step Markers
- `[step] mkdir-tmp` - Creating temporary repository
- `[step] preflight` - Checking authentication and tools
- `[step] run-cli` - Executing analysis command
- `[step] collect-artifacts` - Gathering generated files

## Failure Analysis

### Quick Timeout Detection
- **<100ms failure**: Missing tool or wrong path inside image
- **401/Invalid API key**: Authentication expired or missing
- **Missing prompts**: `/app/packages/cli/prompts/` not copied

### On Failure, Always Log
1. **Exit Code**: Command exit status
2. **stderr**: First 200 lines of error output
3. **System Info**: 
   ```bash
   df -h  # disk space
   free -m  # memory (or cat /proc/meminfo in Alpine)
   node -v  # Node.js version
   ```

## Start-Over Script (Development)
```bash
# Reset job + logs, run fresh analysis
npx convex run jobs.startAnalysis --repoUrl="https://github.com/your/repo"
# Open /jobs/:id and watch status/logs in real-time
```

## Timeouts & Watchdogs
- **Fail fast**: No new log for 5+ minutes
- **Max runtime**: 10 minutes per analysis
- **Heartbeat**: Log progress every 30 seconds during CLI execution

## Common Issues & Quick Fixes

| Issue | Symptom | Quick Fix |
|-------|---------|-----------|
| **Auth Expired** | "Invalid API key" instantly | Re-run `claude login` and commit image |
| **Missing Tools** | "command not found: rg/jq/bash" | Verify runtime dependencies in Dockerfile |
| **ESM Imports** | "Cannot find module './config'" | Confirm patch script ran during build |
| **Module Resolution** | "Cannot find module '@anthropic-ai/claude-code'" | Verify NODE_PATH=/app/node_modules set |
| **Silent Failure** | Analysis completes in <100ms | Check for bundled CLI usage (forbidden) |
| **No Artifacts** | CLI succeeds but no .claude-tutorial-output | Verify prompts directory copied correctly |

## Reset Commands
```bash
# Clean Docker state (keep only canonical image)
docker rmi -f $(docker images 'fondation-worker:*' --format '{{.Repository}}:{{.Tag}}' | grep -v 'authed-patched')

# Restart with clean environment
docker run --rm --user 1001:1001 -e HOME=/home/worker -e NODE_PATH=/app/node_modules \
  fondation-worker:authed-patched sh -lc 'cd /app/packages/cli && node dist/analyze-all.js /path/to/test/repo'
```

## Monitoring Points
1. **Job Creation**: Status transitions from pending → running
2. **Authentication**: First log confirms auth success
3. **CLI Execution**: Step markers appear regularly
4. **Artifact Generation**: Files appear in .claude-tutorial-output/
5. **Completion**: Status transitions to completed/failed with final log

This runbook ensures consistent diagnostics and rapid issue resolution.
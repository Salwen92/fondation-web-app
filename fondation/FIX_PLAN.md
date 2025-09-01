# Fix Plan: Worker Integration and Automation

## Manual Steps Performed (What Was Done)

1. **Worker Execution**
   - Manually ran: `cd packages/worker && node dist/worker.bundled.mjs`
   - Had to pass environment variables manually:
     - `CONVEX_URL=[REDACTED]`
     - `GITHUB_TOKEN=[REDACTED]`
     - `CLAUDE_CODE_OAUTH_TOKEN=[REDACTED]`

2. **Docker Issues**
   - Worker bundle not included in production Docker image
   - Docker container running `tail -f /dev/null` instead of worker
   - No CLI command to start worker (`fondation worker` doesn't exist)

3. **Chrome Process**
   - Had to kill Chrome manually for Playwright to work: `pkill -f "Google Chrome"`

## Fixes Required

### 1. Add Worker Command to CLI

**File:** `packages/cli/src/cli/commands/worker.ts`
```typescript
import { Command } from 'commander';
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

export const workerCommand = new Command('worker')
  .description('Start the Fondation worker to process jobs')
  .option('--convex-url <url>', 'Convex deployment URL')
  .option('--github-token <token>', 'GitHub personal access token')
  .option('--claude-token <token>', 'Claude OAuth token')
  .action(async (options) => {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const workerPath = join(__dirname, '../../../worker/dist/worker.bundled.mjs');
    
    const env = {
      ...process.env,
      CONVEX_URL: options.convexUrl || process.env.CONVEX_URL,
      GITHUB_TOKEN: options.githubToken || process.env.GITHUB_TOKEN,
      CLAUDE_CODE_OAUTH_TOKEN: options.claudeToken || process.env.CLAUDE_CODE_OAUTH_TOKEN,
    };
    
    const worker = spawn('node', [workerPath], { env, stdio: 'inherit' });
    
    process.on('SIGINT', () => {
      worker.kill('SIGTERM');
      process.exit(0);
    });
  });
```

**File:** `packages/cli/src/cli.ts` (add to commandDefinitions)
```typescript
{
  name: 'worker',
  load: async () => {
    const { workerCommand } = await import('./cli/commands/worker');
    program.addCommand(workerCommand);
  },
}
```

### 2. Update Production Dockerfile

**File:** `packages/cli/Dockerfile.production`
```dockerfile
# Add worker build steps after CLI build
WORKDIR /build/packages/worker
RUN bun run build
RUN bun build dist/index.js --outfile dist/worker.bundled.mjs --target=node --format=esm

# In runtime stage, copy worker bundle
COPY --from=builder /build/packages/worker/dist/worker.bundled.mjs ./worker/dist/

# Update CMD to support worker mode
CMD ["node", "dist/cli.bundled.mjs"]
```

### 3. Create Docker Compose for Worker

**File:** `docker-compose.yml`
```yaml
version: '3.8'

services:
  fondation-worker:
    image: fondation/cli:latest
    command: ["node", "/app/cli/dist/cli.bundled.mjs", "worker"]
    environment:
      - CONVEX_URL=${CONVEX_URL}
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - CLAUDE_CODE_OAUTH_TOKEN=${CLAUDE_CODE_OAUTH_TOKEN}
      - NODE_ENV=production
    volumes:
      - ./workspace:/workspace
      - ./output:/output
    restart: unless-stopped
    networks:
      - fondation-network

networks:
  fondation-network:
    driver: bridge
```

### 4. Environment Configuration

**File:** `.env.production`
```bash
CONVEX_URL=[REDACTED]
GITHUB_TOKEN=[REDACTED]
CLAUDE_CODE_OAUTH_TOKEN=[REDACTED]
```

### 5. Build Scripts Update

**File:** `package.json` (root)
```json
{
  "scripts": {
    "docker:build:complete": "docker build -f packages/cli/Dockerfile.worker -t fondation/complete:latest .",
    "docker:worker:start": "docker-compose up -d fondation-worker",
    "docker:worker:logs": "docker-compose logs -f fondation-worker",
    "docker:worker:stop": "docker-compose down"
  }
}
```

## Implementation Order

1. **Phase 1: CLI Integration**
   - Create worker command module
   - Update CLI to include worker command
   - Test locally with `fondation worker`

2. **Phase 2: Docker Integration**
   - Update Dockerfile.production to include worker
   - Create docker-compose.yml
   - Build and test Docker image

3. **Phase 3: Environment Management**
   - Create .env.production file
   - Update documentation for environment setup
   - Add validation for required environment variables

4. **Phase 4: Testing**
   - Run complete end-to-end test in Docker
   - Verify no manual steps required
   - Test with multiple repositories

## Verification Steps

1. Build Docker image: `bun run docker:build:complete`
2. Start worker: `bun run docker:worker:start`
3. Submit analyze job through web UI
4. Monitor logs: `bun run docker:worker:logs`
5. Verify "Voir le Cours" button appears
6. Click button and verify content loads

## Success Criteria

- [ ] Worker starts automatically in Docker
- [ ] No manual environment variable passing
- [ ] Job processing completes without intervention
- [ ] "Voir le Cours" button functional
- [ ] Course content displays correctly
- [ ] All 33 documents viewable
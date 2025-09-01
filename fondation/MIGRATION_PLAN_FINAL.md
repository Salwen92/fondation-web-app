# FINAL Migration Plan: Docker-Based Worker Architecture

## Executive Summary
Transform spawn-per-job architecture to persistent Docker container with worker inside, eliminating cold starts and complexity.

## ✅ Verification Completed
- **spawn IS imported and used**: Lines 1 & 200 of `cli-executor.ts` ✓
- **Docker paths verified**: `/app/cli/dist/cli.bundled.mjs` exists ✓
- **Prompts symlink confirmed**: `/app/cli/prompts -> /app/cli/dist/prompts` ✓
- **Manual authentication**: User will handle ✓

## 🔴 Root Cause
Worker running OUTSIDE Docker trying to spawn Docker containers = complexity + failures

## ✅ Solution Architecture
```
Docker Container (Always Running)
    ↓
Polls Convex Every 5 Seconds
    ↓
Job Found? → Execute CLI Internally
    ↓
Update Convex → Continue Polling
```

## Implementation Actions

### Phase 0: Diagnose Current Issue (5 min) 🔍
**Goal**: Confirm Docker spawn failure

• **Action 0.1**: Test Docker spawn manually
  ```bash
  # Create test repo
  mkdir -p /tmp/test-repo
  echo "# Test" > /tmp/test-repo/README.md
  
  # Test Docker execution
  docker run --rm -v /tmp/test-repo:/tmp/repo fondation/cli:authenticated \
    analyze /tmp/repo --profile production
  ```

• **Action 0.2**: Check worker error logs
  ```bash
  cd packages/worker
  CONVEX_URL=https://basic-stoat-666.convex.cloud bun run dev 2>&1 | tee debug.log
  # Trigger a job and watch for errors
  ```

### Phase 1: Build Dependencies First (10 min) 🏗️
**Goal**: Ensure all packages are built in correct order

• **Action 1.1**: Build shared package first
  ```bash
  cd packages/shared
  bun run build
  ```

• **Action 1.2**: Build CLI package
  ```bash
  cd ../cli
  bun run build
  ```

• **Action 1.3**: Build worker package
  ```bash
  cd ../worker
  bun run build
  ```

### Phase 2: Create Worker Container (20 min) 🐳
**Goal**: Build container with worker + CLI inside

• **Action 2.1**: Create `packages/worker/Dockerfile`
  ```dockerfile
  FROM oven/bun:1.2.5-slim
  
  # Install system dependencies
  RUN apt-get update && \
      apt-get install -y bash curl git && \
      rm -rf /var/lib/apt/lists/*
  
  WORKDIR /app
  
  # Copy package files for dependency installation
  COPY package.json bun.lock ./
  COPY packages/worker/package.json ./packages/worker/
  COPY packages/cli/package.json ./packages/cli/
  COPY packages/shared/package.json ./packages/shared/
  
  # Install dependencies
  RUN bun install --frozen-lockfile
  
  # Copy built artifacts (CONSISTENT PATHS)
  COPY packages/shared/dist ./packages/shared/dist/
  COPY packages/worker/dist ./packages/worker/dist/
  COPY packages/cli/dist ./packages/cli/dist/
  COPY packages/cli/prompts ./packages/cli/prompts/
  
  # Create prompts symlink (CRITICAL for CLI)
  RUN ln -sf /app/packages/cli/prompts /app/packages/cli/dist/prompts
  
  # Install Claude SDK in CLI directory
  WORKDIR /app/packages/cli
  RUN bun add @anthropic-ai/claude-code@latest
  
  # Back to app root for execution
  WORKDIR /app
  
  # Environment
  ENV DOCKER_CONTAINER=true
  ENV NODE_ENV=production
  
  # Health check endpoint
  HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:8081/health || exit 1
  
  # Run worker (CONSISTENT PATH)
  CMD ["node", "packages/worker/dist/index.js"]
  ```

• **Action 2.2**: Add build script to root `package.json`
  ```json
  "scripts": {
    "docker:worker:build": "bun run build:shared && bun run build:cli && bun run build:worker && docker build -f packages/worker/Dockerfile -t fondation/worker:latest .",
    "docker:worker:run": "docker run -d --name fondation-worker --restart=always -e CONVEX_URL=$CONVEX_URL fondation/worker:latest"
  }
  ```

### Phase 3: Modify Worker Code (20 min) 🔧
**Goal**: Execute CLI directly without Docker spawning

• **Action 3.1**: Update `packages/worker/src/cli-executor.ts`
  ```typescript
  import { exec } from "node:child_process";
  import { promisify } from "node:util";
  import { resolve, join } from "node:path";
  import { existsSync, readFileSync, readdirSync } from "node:fs";
  import * as yaml from "js-yaml";
  
  const execAsync = promisify(exec); // Remove underscore, use it
  
  export class CLIExecutor {
    private cliPath: string;
    
    constructor() {
      // Direct path to CLI inside container
      this.cliPath = "/app/packages/cli/dist/cli.bundled.mjs";
    }
    
    async execute(
      repoPath: string,
      options: {
        prompt: string;
        onProgress?: (step: string) => Promise<void>;
      }
    ): Promise<CLIResult> {
      console.log(`🚀 Executing CLI for: ${repoPath}`);
      
      // Direct execution - we ARE inside Docker now
      const command = `node ${this.cliPath} analyze "${repoPath}" --profile production`;
      
      try {
        // Track progress steps
        let currentStep = 0;
        const totalSteps = 6;
        
        // Execute with proper error handling
        const { stdout, stderr } = await execAsync(command, {
          timeout: 3600000, // 1 hour
          maxBuffer: 50 * 1024 * 1024, // 50MB
          env: {
            ...process.env,
            HOME: '/root', // For Claude config
            NODE_PATH: '/app/packages/cli/node_modules',
            CLAUDE_OUTPUT_DIR: join(repoPath, '.claude-tutorial-output')
          }
        });
        
        // Parse progress from stdout (keep existing parsing logic)
        const lines = stdout.split('\n');
        for (const line of lines) {
          if (line.includes('Step') && options.onProgress) {
            currentStep++;
            await options.onProgress(`Step ${currentStep}/${totalSteps}: ${line}`);
          }
        }
        
        // Parse output files (keep existing logic)
        const documents = await this.parseOutputFiles(repoPath);
        
        return {
          success: true,
          documents,
          message: `Generated ${documents?.length || 0} documents`
        };
        
      } catch (error) {
        // Proper error handling with details
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ CLI execution failed:`, errorMessage);
        
        // Check for specific error types
        if (errorMessage.includes('timeout')) {
          throw new Error('Analysis timed out after 1 hour');
        }
        if (errorMessage.includes('ENOENT')) {
          throw new Error(`Repository path not found: ${repoPath}`);
        }
        
        throw new Error(`CLI execution failed: ${errorMessage}`);
      }
    }
    
    // Keep existing parseOutputFiles method unchanged
    private async parseOutputFiles(repoPath: string): Promise<CLIResult['documents']> {
      // ... existing parsing logic ...
    }
  }
  ```

• **Action 3.2**: Update `packages/worker/src/config.ts`
  ```typescript
  import { randomBytes } from "node:crypto";
  
  export function createConfig(): WorkerConfig {
    return {
      workerId: process.env.WORKER_ID || `docker-worker-${randomBytes(8).toString("hex")}`,
      convexUrl: process.env.CONVEX_URL || "",
      pollInterval: Number.parseInt(process.env.POLL_INTERVAL || "5000", 10),
      leaseTime: Number.parseInt(process.env.LEASE_TIME || "300000", 10),
      heartbeatInterval: Number.parseInt(process.env.HEARTBEAT_INTERVAL || "60000", 10),
      maxConcurrentJobs: Number.parseInt(process.env.MAX_CONCURRENT_JOBS || "1", 10),
      tempDir: "/tmp/fondation", // Inside container
      // Remove cliPath - not needed anymore
    };
  }
  ```

• **Action 3.3**: Simplify `packages/worker/src/index.ts`
  ```typescript
  #!/usr/bin/env node
  
  import { ConvexClient } from "convex/browser";
  import { PermanentWorker } from "./worker.js";
  import { createConfig, validateConfig } from "./config.js";
  
  async function main() {
    console.log("🚀 Starting Fondation Worker (Docker Mode)");
    
    // Config from environment variables (Docker provides them)
    const config = createConfig();
    console.log("Config:", {
      ...config,
      convexUrl: config.convexUrl ? "✓ Set" : "✗ Missing"
    });
    
    validateConfig(config);
    
    // Create Convex client
    const convexClient = new ConvexClient(config.convexUrl);
    
    // Create and start worker
    const worker = new PermanentWorker(config, convexClient);
    
    // Graceful shutdown
    process.on("SIGTERM", async () => {
      console.log("📛 SIGTERM received, shutting down gracefully...");
      await worker.stop();
      process.exit(0);
    });
    
    process.on("SIGINT", async () => {
      console.log("📛 SIGINT received, shutting down gracefully...");
      await worker.stop();
      process.exit(0);
    });
    
    // Start worker
    try {
      await worker.start();
    } catch (error) {
      console.error("❌ Worker failed:", error);
      process.exit(1);
    }
  }
  
  // Execute
  main().catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });
  ```

### Phase 4: Environment & Deployment (15 min) 🚀
**Goal**: Configure and deploy

• **Action 4.1**: Create `docker-compose.yml`
  ```yaml
  version: '3.8'
  
  services:
    worker:
      image: fondation/worker:authenticated
      container_name: fondation-worker
      restart: always
      
      environment:
        - CONVEX_URL=https://basic-stoat-666.convex.cloud
        - CONVEX_DEPLOYMENT=dev:basic-stoat-666
        - WORKER_ID=docker-worker-primary
        - MAX_CONCURRENT_JOBS=1
        - POLL_INTERVAL=5000
        - LEASE_TIME=300000
        - HEARTBEAT_INTERVAL=60000
      
      volumes:
        # Temporary storage for cloned repos
        - /tmp/fondation:/tmp/fondation
        # Claude config (if using volume mount instead of baked-in auth)
        - ~/.config/claude:/root/.config/claude:ro
      
      ports:
        - "8081:8081"  # Health check endpoint
      
      logging:
        driver: "json-file"
        options:
          max-size: "10m"
          max-file: "3"
  ```

• **Action 4.2**: Build and authenticate
  ```bash
  # Build the image
  bun run docker:worker:build
  
  # Run temporarily for authentication
  docker run -it --name temp-auth fondation/worker:latest bash
  
  # Inside container, authenticate Claude:
  cd /app/packages/cli
  bunx claude auth
  # Follow prompts, authenticate
  exit
  
  # Commit authenticated container
  docker commit temp-auth fondation/worker:authenticated
  docker rm temp-auth
  
  # Now run the authenticated worker
  docker-compose up -d
  ```

### Phase 5: Testing & Validation (15 min) ✅
**Goal**: Ensure everything works

• **Action 5.1**: Monitor worker startup
  ```bash
  docker logs -f fondation-worker
  # Should see:
  # 🚀 Starting Fondation Worker (Docker Mode)
  # Config: { convexUrl: "✓ Set", ... }
  # 🔍 Polling for jobs...
  ```

• **Action 5.2**: Health check
  ```bash
  curl http://localhost:8081/health
  # Should return: {"status":"healthy","workerId":"docker-worker-primary",...}
  ```

• **Action 5.3**: Test job processing
  1. Create job in UI (use Ramadan repo)
  2. Watch worker logs: `docker logs -f fondation-worker`
  3. Should see:
     - Job claimed
     - Cloning repository
     - Executing CLI
     - Parsing results
     - Job completed
  4. Verify in UI that job completes

• **Action 5.4**: Check for issues
  ```bash
  # Check container resources
  docker stats fondation-worker
  
  # Check disk usage
  docker exec fondation-worker df -h /tmp/fondation
  
  # Check for errors
  docker logs fondation-worker 2>&1 | grep -i error
  ```

### Phase 6: Production Deployment (Optional) 📈
**Goal**: Scale for production

• **Action 6.1**: Multi-worker deployment
  ```yaml
  # docker-compose.prod.yml
  version: '3.8'
  
  services:
    worker:
      image: fondation/worker:authenticated
      restart: always
      
      environment:
        - CONVEX_URL=${CONVEX_URL}
        - CONVEX_DEPLOYMENT=${CONVEX_DEPLOYMENT}
        - MAX_CONCURRENT_JOBS=2
      
      deploy:
        replicas: 3  # Run 3 workers
        resources:
          limits:
            cpus: '1.0'
            memory: 512M
          reservations:
            cpus: '0.5'
            memory: 256M
  ```

## File Changes Summary

### Files to Create:
1. `/packages/worker/Dockerfile` - Worker container definition
2. `/docker-compose.yml` - Local deployment
3. `/docker-compose.prod.yml` - Production deployment (optional)

### Files to Modify:
1. `/packages/worker/src/cli-executor.ts` - Remove Docker spawn, use execAsync
2. `/packages/worker/src/config.ts` - Remove cliPath field
3. `/packages/worker/src/index.ts` - Remove manual env loading (lines 8-26)
4. `/package.json` - Add docker:worker:build script

### Files NOT Modified:
- `/packages/cli/*` - CLI unchanged
- `/convex/*` - Queue logic unchanged
- `/packages/shared/*` - Shared types unchanged

## Success Metrics
- ✅ Job starts in <1 second (vs 10+ seconds)
- ✅ No Docker spawn errors
- ✅ Worker stays running continuously
- ✅ Health endpoint responds
- ✅ Jobs complete successfully

## Rollback Plan
If any issues:
```bash
# Stop Docker worker
docker-compose down

# Run worker outside Docker (old way)
cd packages/worker
CONVEX_URL=https://basic-stoat-666.convex.cloud bun run dev
```

## Timeline
- Phase 0: 5 min (Diagnose)
- Phase 1: 10 min (Build packages)
- Phase 2: 20 min (Create Docker image)
- Phase 3: 20 min (Modify code)
- Phase 4: 15 min (Deploy)
- Phase 5: 15 min (Test)

**Total: ~1.5 hours**

## Go/No-Go Checklist
Before proceeding:
- [ ] Current system backed up (git commit)
- [ ] Docker daemon running
- [ ] Convex URL confirmed
- [ ] Test repo available

## Next Steps
1. **Execute Phase 0** - Diagnose current issue
2. **If confirmed** - Proceed with Phase 1-5
3. **Monitor** - Watch logs during first job
4. **Scale** - Add more workers if needed

---

**Ready to execute Phase 0?**
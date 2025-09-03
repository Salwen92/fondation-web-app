# Agent Prompt: Debug and Fix Fondation Analyze Command

## Context
You are working on the Fondation project, an AI-powered documentation generator that analyzes GitHub repositories. The `analyze` command in the Docker container is failing silently without proper error messages.

## Current Situation
The analyze command is failing with this output:
```
{"level":"error","time":1756655935958,"context":"analyze","msg":"Analysis failed"}
{"level":"debug","time":1756655935958,"context":"analyze","msg":"Full error details"}
```
But no actual error details are shown.

## Project Structure
```
fondation/                          # Monorepo root
├── packages/
│   ├── cli/                       # CLI package with analyze command
│   │   ├── src/                   # TypeScript source
│   │   ├── dist/                  # Compiled JavaScript
│   │   ├── scripts/bundle-cli.js # Bundle script (currently timing out)
│   │   └── Dockerfile.production # Docker build file
│   ├── web/                       # Next.js frontend
│   ├── worker/                    # Job processor
│   └── shared/                    # Shared types
├── docs/                          # Documentation
└── package.json                   # Root scripts
```

## Key Issues Identified

### 1. Bundle Script Timeout
The `bun run build:cli` command times out because `scripts/bundle-cli.js` hangs indefinitely.

### 2. Claude SDK Path Issue
The Docker container has the Claude SDK at `/app/cli/node_modules/@anthropic-ai/claude-code/cli.js` but the code may be looking elsewhere.

### 3. Missing Error Details
The analyze command catches errors but doesn't log them properly, making debugging difficult.

## Your Task

### Step 1: Fix the Bundle Script
1. Check why `packages/cli/scripts/bundle-cli.js` is timing out
2. Either fix it or use the manual bundle command:
```bash
cd packages/cli
bun build dist/cli.js --outfile dist/cli.bundled.mjs --target=node --format=esm --external @anthropic-ai/claude-code
cp -r src/prompts dist/prompts
```

### Step 2: Fix Error Logging
Update `packages/cli/src/cli/commands/analyze.ts` to properly log errors:
```typescript
} catch (error) {
  logger.error('Analysis failed', { 
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined
  });
  // Make sure the error details are actually shown
  console.error('Full error:', error);
  throw error;
}
```

### Step 3: Test Locally First
Before Docker, test the analyze command locally:
```bash
# Build the project
cd fondation
bun run clean
npx tsc --build --force

# Test with a simple repo
mkdir -p /tmp/test-repo
echo 'console.log("hello");' > /tmp/test-repo/index.js
cd packages/cli
bun dist/cli.js analyze /tmp/test-repo --steps extract --output-dir /tmp/output
```

### Step 4: Fix Claude SDK Path Resolution
The code already has a fix in `packages/cli/src/cli/commands/analyze.ts`:
```typescript
const possiblePaths = [
  '/app/cli/node_modules/@anthropic-ai/claude-code/cli.js',  // Bun Docker environment
  '/app/node_modules/@anthropic-ai/claude-code/cli.js',      // Legacy Docker environment
  './node_modules/@anthropic-ai/claude-code/cli.js',         // Relative path
];
```
Make sure this is working correctly.

### Step 5: Rebuild Docker Image
Once local testing works:
```bash
cd fondation
docker build -f packages/cli/Dockerfile.production -t fondation/cli:test .
docker run -d --name test-auth fondation/cli:test tail -f /dev/null
docker exec -it test-auth bunx claude auth  # Authenticate
docker commit test-auth fondation/cli:test-auth
docker stop test-auth && docker rm test-auth
```

### Step 6: Test Docker Analyze
```bash
docker run --rm \
  -v /tmp/test-repo:/workspace \
  -v /tmp/output:/output \
  fondation/cli:test-auth \
  analyze /workspace --steps extract --output-dir /output
```

## Expected Outcomes
1. The analyze command should successfully process the test repository
2. Output files should be created in `/tmp/output/`:
   - `step1_abstractions.yaml`
   - Additional step files if running more steps
3. Clear error messages if something fails

## Important Notes
- Use Bun (not npm) for all commands
- The Docker image uses Alpine Linux with ARM64 architecture
- Claude SDK must be external (not bundled) for OAuth to work
- The bundle must include prompts directory

## Resolution Checklist
- [ ] Bundle script fixed or bypassed
- [ ] Error logging improved to show actual errors
- [ ] Local analyze command working
- [ ] Docker analyze command working
- [ ] Output files generated successfully
- [ ] Clear documentation of the fix

## If Still Stuck
1. Add more verbose logging throughout the analyze pipeline
2. Test each step individually (extract, analyze, order, etc.)
3. Check if prompts are being loaded correctly
4. Verify Claude SDK authentication is working: `docker run --rm <image> bunx claude --version`

This is a critical path for the application - the analyze command must work for the entire system to function.
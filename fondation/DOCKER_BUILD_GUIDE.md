# 🚀 Ultimate Docker Build Guide for Fondation CLI

## Table of Contents
1. [Critical Prerequisites](#critical-prerequisites)
2. [Building the CLI Bundle](#building-the-cli-bundle)
3. [Docker Image Build](#docker-image-build)
4. [Authentication Process](#authentication-process)
5. [Testing & Verification](#testing--verification)
6. [Common Mistakes to Avoid](#common-mistakes-to-avoid)
7. [Troubleshooting](#troubleshooting)

---

## Critical Prerequisites

### ⚠️ IMPORTANT: This is a Monorepo with TypeScript Project References
The CLI depends on the `shared` package. You MUST build packages in the correct order!

### Required Tools
- Node.js 20+
- Docker Desktop
- npm or yarn
- Git

---

## Building the CLI Bundle

### Step 1: Build TypeScript Sources (CRITICAL ORDER)

```bash
# Navigate to monorepo root
cd /Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation

# Option A: Build everything from root (RECOMMENDED)
npx tsc --build --force

# Option B: Build packages individually (if Option A fails)
cd packages/shared
npx tsc --build
cd ../cli
npx tsc --build
```

### Step 2: Verify TypeScript Build Success

```bash
cd packages/cli
ls -la dist/

# You should see:
# - cli.js
# - cli.d.ts
# - analyze-all.js
# - Multiple .js, .d.ts, and .map files

# If dist/ is empty or missing cli.js, the TypeScript build failed!
```

### Step 3: Bundle the CLI with External SDK

```bash
cd packages/cli
node scripts/bundle-cli.js --production

# Expected output:
# 📦 Bundle created: 476.22KB (0.47MB)
#    - Source files: 25
#    - Dependencies bundled: 209
# ✅ CLI test passed
```

### Step 4: Verify Bundle Artifacts

```bash
# Check bundled CLI exists
ls -la dist/cli.bundled.cjs
# Should show: -rwxr-xr-x ... 487650 ... dist/cli.bundled.cjs

# Check ALL prompts were copied
ls -la dist/prompts/
# Should show ALL these files:
# - 1-abstractions.md
# - 2-analyze-relationshipt.md
# - 3-order-chapters.md
# - 4-write-chapters.md
# - 5-review-chapters.md
# - 6-tutorials.md
# - general.md
# - onboarding.md
```

### Step 5: Test Bundle Locally

```bash
# Test basic functionality
node dist/cli.bundled.cjs --version
# Output: 1.0.0-beta.9

# Test with a simple query (requires local auth)
node dist/cli.bundled.cjs run -p "What is 2+2?"
# Should output: 2 + 2 = 4
```

---

## Docker Image Build

### The Dockerfile (packages/cli/Dockerfile.production)

```dockerfile
FROM node:20-alpine

# Install bash (REQUIRED for Claude SDK) and utilities
RUN apk add --no-cache bash git curl

WORKDIR /app/cli

# Copy bundled CLI and prompts
COPY dist/cli.bundled.cjs ./dist/
COPY dist/prompts ./dist/prompts/
COPY package.json ./

# Install ONLY Claude SDK as external dependency
RUN npm init -y --quiet && \
    npm install --no-save @anthropic-ai/claude-code@latest && \
    rm -f package-lock.json

# Create workspace and output directories
RUN mkdir -p /workspace /output

# Set environment variables
ENV NODE_ENV=production \
    SHELL=/bin/bash \
    HOME=/root

# Verify CLI works
RUN node dist/cli.bundled.cjs --version

CMD ["/bin/bash"]
```

### Build the Docker Image

```bash
cd packages/cli

# Build the image
docker build -f Dockerfile.production -t fondation/cli:latest .

# Verify build success
docker images | grep fondation/cli
# Should show: fondation/cli   latest   ...
```

---

## Authentication Process

### Step 1: Start Container for Authentication

```bash
# Start container with persistent process
docker run -d --name fondation-auth fondation/cli:latest tail -f /dev/null

# Verify container is running
docker ps | grep fondation-auth
```

### Step 2: Authenticate with Claude OAuth

```bash
# Run authentication command
docker exec -it fondation-auth npx claude auth

# What happens:
# 1. Shows URL: https://claude.ai/authorize?...
# 2. Says "Press Enter to open in browser"
# 3. Press Enter
# 4. Browser opens - login if needed
# 5. Click "Authorize"
# 6. Terminal shows "✓ Authentication successful"
```

### Step 3: Verify Authentication

```bash
# Check authentication files exist
docker exec fondation-auth ls -la /root/.claude*

# Should show:
# drwxr-xr-x ... .claude
# -rw-r--r-- ... .claude.json
# -rw-r--r-- ... .claude.json.backup
```

### Step 4: Commit Authenticated Image

```bash
# Save the authenticated state
docker commit fondation-auth fondation/cli:authenticated

# Tag with version
docker tag fondation/cli:authenticated fondation/cli:1.0.0-beta.9-auth

# Verify images
docker images | grep fondation
# Should show both: latest and authenticated
```

---

## Testing & Verification

### Test 1: Create Test Repository Inside Container

```bash
# Create test file
docker exec fondation-auth bash -c "mkdir -p /workspace && cat > /workspace/test.js << 'EOF'
console.log('Hello World');
function add(a, b) { return a + b; }
module.exports = { add };
EOF"
```

### Test 2: Run Analyze Command (CRITICAL TEST)

```bash
# Run analyze with extract step
docker exec fondation-auth bash -c \
  "cd /app/cli && node dist/cli.bundled.cjs analyze /workspace --steps extract --output-dir /output"

# Expected output:
# {"level":"info","msg":"Starting codebase analysis"}
# {"level":"info","msg":"Extracting core abstractions from codebase"}
# {"level":"info","msg":"Analysis complete!"}
```

### Test 3: Verify Output Files Created

```bash
# Check output files
docker exec fondation-auth ls -la /output/

# Should show:
# step1_abstractions.yaml
```

### Test 4: Run Full Analysis Pipeline

```bash
# Run all analysis steps
docker exec fondation-auth bash -c \
  "cd /app/cli && node dist/cli.bundled.cjs analyze /workspace --steps extract,analyze,order --output-dir /output"

# Check all outputs
docker exec fondation-auth ls -la /output/

# Should show:
# step1_abstractions.yaml
# step2_relationships.yaml
# step3_order.yaml
```

### Test 5: Production Usage with Volume Mount

```bash
# Test with real code directory
docker run --rm -v /path/to/your/code:/workspace \
  -v /tmp/output:/output \
  fondation/cli:authenticated \
  bash -c "cd /app/cli && node dist/cli.bundled.cjs analyze /workspace --output-dir /output"

# Check host output
ls -la /tmp/output/*.yaml
```

---

## Common Mistakes to Avoid

### ❌ MISTAKE 1: Not Building in Correct Order
```bash
# WRONG - Building only CLI without shared
cd packages/cli && npx tsc --build  # Will fail!

# CORRECT - Build from root or build shared first
cd fondation && npx tsc --build --force
```

### ❌ MISTAKE 2: Bundling SDK Inside Bundle
```javascript
// WRONG - In bundle-cli.js
external: [
  // '@anthropic-ai/claude-code', // Commented out = WRONG!
]

// CORRECT - Keep SDK external
external: [
  '@anthropic-ai/claude-code',  // MUST be external
  '@anthropic-ai/*',
]
```

### ❌ MISTAKE 3: Using Alpine Without Bash
```dockerfile
# WRONG - Alpine doesn't have bash by default
FROM node:20-alpine
# Claude SDK will fail!

# CORRECT - Install bash
FROM node:20-alpine
RUN apk add --no-cache bash git curl
```

### ❌ MISTAKE 4: Not Copying All Prompts
```javascript
// WRONG - Only copying one prompt
copyFileSync('prompts/general.md', 'dist/prompts/general.md')

// CORRECT - Copy ALL prompts
const promptFiles = readdirSync(promptsSrc).filter(f => f.endsWith('.md'));
for (const file of promptFiles) {
  copyFileSync(join(promptsSrc, file), join(promptsDest, file));
}
```

### ❌ MISTAKE 5: Wrong Path Resolution in Bundled Environment
```javascript
// WRONG - Not checking for bundled environment
const promptPath = resolve(process.cwd(), 'prompts/...')

// CORRECT - Check if bundled and resolve accordingly
const isBundled = __filename.includes('cli.bundled.cjs');
if (isBundled) {
  // Use __dirname relative paths
}
```

---

## Troubleshooting

### Issue: TypeScript Build Creates Empty dist/

**Solution:**
```bash
# Clean and rebuild from root
cd fondation
npx tsc --build --clean
npx tsc --build --force
```

### Issue: "Could not resolve dist/cli.js"

**Solution:**
```bash
# TypeScript didn't build. Check for errors:
npx tsc --build --verbose
# Fix any TypeScript errors first
```

### Issue: Analyze Command Hangs in Docker

**Possible Causes:**
1. Authentication not complete
2. Missing bash shell
3. SDK not installed

**Solution:**
```bash
# Verify all components
docker exec <container> bash --version  # Should work
docker exec <container> ls /root/.claude.json  # Should exist
docker exec <container> ls /app/cli/node_modules/@anthropic-ai/  # Should exist
```

### Issue: "No suitable shell found"

**Solution:**
```bash
# The container needs bash
docker exec <container> apk add --no-cache bash
```

### Issue: Prompts Not Found

**Solution:**
```bash
# Check prompts were copied to dist
ls -la packages/cli/dist/prompts/
# If missing, rebuild bundle
```

---

## Quick Reference Commands

### Full Build & Deploy Sequence

```bash
# 1. Clean build from monorepo root
cd /Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation
npx tsc --build --clean && npx tsc --build --force

# 2. Bundle CLI
cd packages/cli
node scripts/bundle-cli.js --production

# 3. Build Docker image
docker build -f Dockerfile.production -t fondation/cli:latest .

# 4. Authenticate
docker run -d --name auth fondation/cli:latest tail -f /dev/null
docker exec -it auth npx claude auth
docker commit auth fondation/cli:authenticated

# 5. Test
docker run --rm -v /tmp/test:/workspace \
  fondation/cli:authenticated \
  bash -c "cd /app/cli && node dist/cli.bundled.cjs analyze /workspace --output-dir /workspace"
```

---

## Production Deployment

### Final Working Command

```bash
docker run --rm \
  -v /path/to/repository:/workspace \
  -v /path/to/output:/output \
  fondation/cli:authenticated \
  bash -c "cd /app/cli && node dist/cli.bundled.cjs analyze /workspace --output-dir /output"
```

### Environment Variables (Optional)

```bash
docker run --rm \
  -e NODE_ENV=production \
  -e VERBOSE=true \
  -v /code:/workspace \
  fondation/cli:authenticated \
  bash -c "cd /app/cli && node dist/cli.bundled.cjs analyze /workspace --verbose"
```

---

## Success Criteria Checklist

- [ ] TypeScript builds without errors
- [ ] Bundle size ~476KB
- [ ] All 8 prompt files in dist/prompts/
- [ ] Docker image builds successfully
- [ ] Authentication completes
- [ ] Analyze command produces YAML files
- [ ] Volume mounts work correctly

---

## Notes on What Works vs What Doesn't

### ✅ WORKS
- `analyze` command with all steps
- Output file generation
- Volume mounting
- Authentication persistence

### ⚠️ DOESN'T WORK (but not needed for Fondation)
- `run` command for interactive queries
- Real-time streaming responses

The `analyze` command is the core functionality needed for Fondation and it works perfectly!

---

*Last Updated: August 30, 2024*
*Version: 1.0.0-beta.9*
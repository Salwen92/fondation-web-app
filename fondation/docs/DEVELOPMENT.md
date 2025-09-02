# Development Workflow

This guide covers the complete development workflow for the Fondation monorepo.

## Available Scripts

For a complete list of all 50+ scripts, see [COMMANDS.md](COMMANDS.md). Here are the most important ones:

### Daily Development
```bash
bun run dev                 # Start all services (recommended)
bun run dev:web             # Start only web interface
bun run dev:worker          # Start worker in development mode
bun run dev:worker:local    # Start worker in pure local mode (no Docker)
bun run dev:worker:docker   # Start worker in Docker development mode
bun run dev:convex          # Start only Convex database
```

### Building & Testing
```bash
bun run build         # Build all packages
bun run typecheck     # Type check entire monorepo
bun run lint          # Lint all packages
bun run test          # Run all tests
```

### Maintenance
```bash
bun run clean         # Clean build artifacts
bun run setup         # Fresh install and build
bun run reset         # Nuclear option - clean everything
```

## Working on Individual Packages

### Web Package Development

```bash
cd packages/web
bun run dev           # Start Next.js dev server
bun run build         # Production build
bun run typecheck     # Check types
bun run lint          # Run linter
```

**Common tasks:**
- Add a new page: Create file in `src/app/[route]/page.tsx`
- Add a component: Create in `src/components/`
- Add an API route: Create in `src/app/api/[route]/route.ts`
- Modify styles: Edit Tailwind classes or `src/app/globals.css`

### Worker Package Development

```bash
cd packages/worker
bun run dev           # Start with auto-reload (development mode)
bun run dev:local     # Start in pure local mode (no Docker)
bun run dev:debug     # Start with debug logging enabled
bun run build         # Compile TypeScript
bun run health        # Check worker health status
bun run diagnostics   # Run development diagnostics
```

**Development Modes:**
- **Local Mode**: Executes CLI directly from TypeScript source files
- **Docker Mode**: Uses containerized CLI execution (closer to production)
- **Debug Mode**: Enhanced logging for troubleshooting

**Common tasks:**
- Modify job processing: Edit `src/cli-executor.ts`
- Add CLI execution strategies: Create files in `src/cli-strategies/`
- Add new job types: Update `src/index.ts`
- Configure environment detection: Edit `../shared/src/environment.ts`

### CLI Package Development

```bash
cd packages/cli
bun run dev             # Interactive development UI
bun run cli             # Run CLI from source
bun run cli:source      # Run CLI with development environment
bun run cli:test        # Quick test run on current directory
bun run build           # Compile TypeScript and create bundle
bun run build:verify    # Verify bundled CLI works correctly
```

**Execution Methods:**
- **Source**: Direct TypeScript execution (fastest for development)
- **Bundled**: Production-like bundled execution (for testing)
- **Interactive**: Ink-based UI for development

**Common tasks:**
- Add analysis steps: Create new prompt in `prompts/`
- Modify analysis logic: Edit `src/analyze-all.ts`
- Update UI components: Edit files in `src/ui/components/`
- Test CLI changes: Use `bun run cli:test` for quick validation

### Shared Package Development

```bash
cd packages/shared
bun run build         # Compile types
bun run typecheck     # Validate types
```

**Common tasks:**
- Add shared types: Edit `src/types/index.ts`
- Add utilities: Create in `src/utils/`
- Update constants: Edit `src/constants.ts`
- Configure environment detection: Edit `src/environment.ts`

## 🔧 **Dual-Mode Architecture**

Fondation supports both **development** and **production** execution modes with different behaviors:

### Development Mode
- **Environment**: `NODE_ENV=development` or `FONDATION_ENV=development`
- **CLI Execution**: Direct TypeScript source files (`src/cli.ts`)
- **Authentication**: Uses host Claude CLI authentication (`bunx claude auth`)
- **Docker**: Container validation bypassed for faster iteration
- **Hot Reload**: Automatic restarts on file changes
- **Debugging**: Enhanced logging and error messages

### Production Mode  
- **Environment**: `NODE_ENV=production` or `FONDATION_ENV=production`
- **CLI Execution**: Bundled CLI in Docker containers
- **Authentication**: Requires `CLAUDE_CODE_OAUTH_TOKEN` environment variable
- **Docker**: Strict container enforcement for security
- **Stability**: Optimized for reliability and consistency

### Environment Variables

#### Development-Specific Variables

**Essential for Phase 2 Local Testing:**
```bash
# REQUIRED - Worker crashes without this
CONVEX_URL=https://basic-stoat-666.convex.cloud  # CRITICAL

# Development mode configuration  
NODE_ENV=development                  # Enables dev features
FONDATION_EXECUTION_MODE=local       # Force local execution (bypasses Docker)

# Optional development features
FONDATION_DEV_DEBUG=true             # Enhanced logging
FONDATION_DEV_HOT_RELOAD=true        # Auto-restart on changes
TEMP_DIR=/tmp/fondation-dev          # Development temp directory
```

#### Production Variables
```bash
# Required for production
CLAUDE_CODE_OAUTH_TOKEN=sk-ant-...    # Claude API authentication
GITHUB_TOKEN=ghp_...                  # GitHub private repo access
DOCKER_CONTAINER=true                 # Indicates Docker environment

# Standard variables
NODE_ENV=production
CONVEX_URL=https://your-deployment.convex.cloud
```

### Quick Setup Commands

#### Development Setup (Phase 2 Validated)
```bash
# 1. Install dependencies
bun install

# 2. Set up development environment
cp .env.example .env.local
# Edit .env.local with your values

# 3. Authenticate Claude CLI (REQUIRED for development)
bunx claude auth
# Follow browser authentication flow

# 4. Start web interface
bun run dev:web

# 5. Start worker in separate terminal (CRITICAL: Include CONVEX_URL)
cd packages/worker
NODE_ENV=development \
FONDATION_EXECUTION_MODE=local \
CONVEX_URL=https://basic-stoat-666.convex.cloud \
bun run dev
```

#### Production Setup
```bash
# Build all packages
bun run build

# Set production environment variables
export NODE_ENV=production
export CLAUDE_CODE_OAUTH_TOKEN="sk-ant-oat01-YOUR-TOKEN-HERE"
export CONVEX_URL="your-deployment-url"

# Start production services
bun run start
```

## Testing Strategy

### Unit Testing
```bash
# Run tests for specific package
cd packages/web && bun run test
cd packages/cli && bun run test
```

### Integration Testing
```bash
# Test full flow
bun run e2e           # Build + start all services
```

### Manual Testing Checklist
- [ ] Login with GitHub OAuth
- [ ] Connect a repository
- [ ] Generate a course
- [ ] View course content
- [ ] Check real-time updates
- [ ] Verify job completion

## Debugging Techniques

### Debug Web Application

1. **Browser DevTools**
   - React Developer Tools
   - Network tab for API calls
   - Console for errors

2. **Next.js Debug Mode**
   ```bash
   cd packages/web
   NODE_OPTIONS='--inspect' bun run dev
   ```
   Then attach Chrome DevTools or VS Code debugger.

3. **Convex Dashboard**
   - View real-time logs at https://dashboard.convex.dev
   - Monitor function executions
   - Inspect database state

### Debug Worker Service

1. **Console Logging**
   ```typescript
   console.log('[Worker]', 'Processing job:', job.id);
   ```

2. **Node.js Inspector**
   ```bash
   cd packages/worker
   NODE_OPTIONS='--inspect' bun run dev
   ```

3. **Docker Container Logs**
   ```bash
   docker logs <container-id>
   ```

### Debug CLI

1. **Verbose Mode**
   ```bash
   bun dist/cli.bundled.mjs analyze /workspace --verbose
   ```

2. **Interactive Debugging**
   ```bash
   cd packages/cli
   bun run dev  # Interactive Ink UI
   ```

## Git Workflow

### Branch Naming Convention
```
feat/feature-name       # New features
fix/bug-description     # Bug fixes
refactor/what-changed   # Refactoring
docs/what-documented    # Documentation
test/what-tested        # Tests
```

### Commit Message Convention
```
type(scope): description

feat(web): add repository search
fix(worker): handle timeout errors
docs(cli): update Docker instructions
refactor(shared): simplify type definitions
```

### Pre-commit Checklist
```bash
# Before committing
bun run format:write  # Format code
bun run lint:fix      # Fix linting issues
bun run typecheck     # Check types
bun run test          # Run tests
```

### Pull Request Process
1. Create feature branch from `main`
2. Make changes and commit
3. Run `bun run ci` to validate
4. Push branch and create PR
5. Ensure CI passes
6. Request review
7. Merge after approval

## Adding New Features

### Adding a New Package

1. **Create package structure**
   ```bash
   mkdir -p packages/new-package/src
   cd packages/new-package
   ```

2. **Create package.json**
   ```json
   {
     "name": "@fondation/new-package",
     "version": "1.0.0",
     "main": "dist/index.js",
     "scripts": {
       "build": "tsc",
       "dev": "tsx watch src/index.ts",
       "typecheck": "tsc --noEmit"
     }
   }
   ```

3. **Create tsconfig.json**
   ```json
   {
     "extends": "../../tsconfig.json",
     "compilerOptions": {
       "outDir": "./dist",
       "rootDir": "./src"
     },
     "include": ["src/**/*"]
   }
   ```

4. **Update root tsconfig.json references**
   ```json
   {
     "references": [
       { "path": "./packages/new-package" }
     ]
   }
   ```

### Adding a New Convex Function

1. **Create function file**
   ```typescript
   // convex/newFeature.ts
   import { mutation, query } from "./_generated/server";
   import { v } from "convex/values";

   export const getData = query({
     args: { id: v.string() },
     handler: async (ctx, args) => {
       // Implementation
     }
   });
   ```

2. **Use in React component**
   ```typescript
   import { useQuery } from "convex/react";
   import { api } from "@convex/generated/api";
   
   const data = useQuery(api.newFeature.getData, { id: "123" });
   ```

### Adding Environment Variables

1. **Add to `.env.example`**
   ```bash
   NEW_VARIABLE=example_value  # Description of variable
   ```

2. **Add to `.env.local`**
   ```bash
   NEW_VARIABLE=actual_value
   ```

3. **Add to `packages/web/src/env.js`**
   ```javascript
   export const env = {
     NEW_VARIABLE: process.env.NEW_VARIABLE || "",
   };
   ```

4. **Use in code**
   ```typescript
   import { env } from "@/env";
   console.log(env.NEW_VARIABLE);
   ```

## Performance Optimization

### Build Performance
- Use `bun run build:shared` first if only working on shared types
- Use package-specific builds when possible
- Keep .tsbuildinfo files for incremental compilation

### Development Performance
- Use `bun run dev:web` if only working on UI
- Close unnecessary services to save resources
- Use Docker Desktop resource limits

### Runtime Performance
- Implement pagination for large lists
- Use React.memo for expensive components
- Optimize database queries with indexes

## Common Development Patterns

### Real-time Updates
```typescript
// In React component
const job = useQuery(api.jobs.getJob, { jobId });

// Job updates automatically when status changes
```

### Error Handling
```typescript
try {
  const result = await processJob(job);
} catch (error) {
  console.error('[Worker] Job failed:', error);
  await updateJobStatus(job.id, 'failed', error.message);
}
```

### Type-safe API Calls
```typescript
// Types are auto-generated from Convex
import { api } from "@convex/generated/api";
import type { Id } from "@convex/generated/dataModel";

const jobId: Id<"jobs"> = "..." // Type-safe ID
```

## IDE Setup

### VS Code Extensions
- TypeScript and JavaScript Language Features
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- GitLens

### VS Code Settings
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

## Troubleshooting Development Issues

### Worker Service Issues

#### Worker Won't Start in Development

**Most Common Issue: Missing CONVEX_URL (Exit Code 158)**
```bash
# 1. ALWAYS check CONVEX_URL first
echo $CONVEX_URL  # Should show URL, not empty

# 2. If empty, set it explicitly:
CONVEX_URL=https://basic-stoat-666.convex.cloud bun run dev

# 3. Check environment detection
cd packages/worker && bun run diagnostics

# 4. Force local execution mode
bun run dev:local

# 5. Check Claude authentication
bunx claude auth status
```

#### CLI Execution Fails
```bash
# Test CLI directly
cd packages/cli && bun run cli:test

# Check CLI paths and permissions
bun src/cli.ts --help

# Verify development strategy
cd packages/worker && bun run dev:debug
```

#### Docker Issues in Development
If you're getting Docker-related errors in development mode:
```bash
# Use pure local mode (bypasses Docker completely)
bun run dev:worker:local

# Or enable Docker bypass
export FONDATION_DEV_DOCKER_BYPASS=true
bun run dev:worker
```

### Authentication Issues

#### Claude Authentication Not Found
```bash
# Authenticate Claude CLI
bunx claude auth

# Or set environment variable
export CLAUDE_CODE_OAUTH_TOKEN="sk-ant-oat01-YOUR-TOKEN-HERE"
```

#### Host Authentication vs Environment Variables
- **Development**: Uses host authentication by default (`bunx claude auth`)
- **Production**: Requires `CLAUDE_CODE_OAUTH_TOKEN` environment variable

### CLI Profile Issues (FIXED in Phase 2)

#### CLI Profile Configuration Error
**Problem**: CLI execution fails with "profile not found"  
**Root Cause**: Using invalid profile "development" instead of "dev"  
**Status**: ✅ **FIXED** in `packages/worker/src/cli-strategies/development-strategy.ts`

**Available CLI Profiles:**
```typescript
// Valid profiles (from packages/cli/src/cli/utils/config.ts)
const DEFAULT_PROFILES = {
  dev: {           // ← Use this in development
    verbose: true,
    logMessages: true,
    showSystemLogs: true,
    showToolLogs: true,
  },
  production: {    // ← Use this in production
    temperature: 0.3,
    showToolLogs: false,
    showSystemLogs: false,
  },
  // ... other profiles: clean, debug, test
};
```

### Environment Detection Issues

#### Wrong Mode Detected
```bash
# Check current environment detection
node -e "import('@fondation/shared/environment').then(env => console.log(env.environmentInfo))"

# Phase 2 recommended approach:
export NODE_ENV=development
export FONDATION_EXECUTION_MODE=local
export CONVEX_URL=https://basic-stoat-666.convex.cloud

# Then restart worker
cd packages/worker && bun run dev
```

#### Mixed Environment Variables
```bash
# Clean environment and restart
unset FONDATION_ENV FONDATION_EXECUTION_MODE NODE_ENV
export NODE_ENV=development
bun run dev:worker
```

### Performance Issues

#### Slow CLI Execution in Development
- Use source execution: `bun run cli:source`
- Avoid bundled CLI during development
- Check if Docker bypass is enabled: `FONDATION_DEV_DOCKER_BYPASS=true`

#### Hot Reload Not Working
```bash
# Ensure tsx is watching correctly
cd packages/worker && npx tsx watch src/index.ts

# Check file permissions
ls -la src/
```

### Build Issues

#### TypeScript Errors After Changes
```bash
# Clean build cache
bun run clean
rm -f packages/*/tsconfig.tsbuildinfo

# Rebuild shared package first
cd packages/shared && bun run build
cd ../.. && bun run build
```

#### Import Errors for Shared Package
```bash
# Ensure shared package is built
cd packages/shared && bun run build

# Check TypeScript path mapping
bun run typecheck
```

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for additional common issues and solutions.

---

Follow these workflows to maintain code quality and development velocity in the Fondation monorepo.
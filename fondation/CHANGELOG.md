# Changelog

All notable changes to this project will be documented in this file.

## [2025-08-27] - Monorepo Integration Phase

### Phase 1: Fondation CLI Integration
**Status**: ✅ Completed

#### Added
- Integrated complete Fondation CLI project into `packages/cli/`
- Copied all source files, prompts, dependencies, and build scripts from external project
- Preserved all CLI functionality including `src/analyze-all.ts` entry point

#### Changed
- Restructured monorepo: moved `apps/` to `packages/` for standard monorepo structure
  - `apps/web/` → `packages/web/`
  - `apps/worker/` → `packages/worker/`
- Updated workspace configuration in root `package.json`
- Modified worker to use integrated Fondation CLI instead of system `claude` command

### Phase 2: TypeScript Error Resolution
**Status**: ✅ Completed

#### Fixed
1. **cli-executor.ts**:
   - Fixed `resolve()` function call - changed from `resolve(this.cliPath, "dist/cli.bundled.cjs")` to string concatenation
   - Updated to use integrated CLI path instead of system command
   - Removed incorrect CLIExecutor constructor parameter

2. **worker.ts**:
   - Removed duplicate `isHealthy` and `workerStats` getters (lines 269-280)
   - Changed `config` from private to public to match WorkerInterface
   - Fixed CLIExecutor instantiation - no arguments needed

3. **health.ts**:
   - Fixed `percentUsed` property location - moved to inside `memory` object to match HealthCheck type

4. **shared/schemas.ts**:
   - Removed duplicate `HealthCheckSchema` definition that conflicted with `types.ts`
   - Kept only the comprehensive schema in `types.ts`

5. **worker/tsconfig.json**:
   - Added `rootDir: "./src"` to fix output directory structure
   - Fixed reference path from `../../packages/shared` to `../shared`

#### Result
- TypeScript compilation successful
- Build outputs correctly to `dist/` directory
- All type errors resolved

### Phase 3: Docker Authentication
**Status**: ✅ Completed

#### Process
1. Created simplified Docker image `fondation-auth-test` for authentication
2. Installed `@anthropic-ai/claude-code` globally (command is `claude` not `claude-code`)
3. Authenticated Claude CLI inside container
4. Committed authenticated container as `fondation-worker:authenticated`
5. Cleaned up temporary images and containers

#### Result
- Authenticated Docker image ready: `fondation-worker:authenticated`
- Claude CLI version: 1.0.94 (Claude Code)

### Phase 4: Testing
**Status**: ✅ Completed

#### CLI Testing
- Created test repository with single JS file
- Ran `bun run src/analyze-all.ts /tmp/test-repo`
- Successfully generated output files in `.claude-tutorial-output/`
- Files generated: abstractions.yaml, relationships.yaml, order.yaml, chapters/*.md

## Known Issues Resolved

### Authentication
- ❌ **Incorrect**: Initially thought we needed ANTHROPIC_API_KEY
- ✅ **Correct**: Claude SDK uses OAuth/device authentication, not API keys

### Package Confusion  
- ❌ **Incorrect**: Tried using `claude-code` command
- ✅ **Correct**: Package is `@anthropic-ai/claude-code` but command is `claude`

### Build Issues
- ❌ **Issue**: Husky prepare script failed in Docker
- ✅ **Solution**: Used `npm install || true` to bypass in Docker context

### Docker Network
- ❌ **Issue**: Container couldn't reach api.anthropic.com
- ✅ **Solution**: Used `--network host` flag for proper connectivity

## Remaining Work

1. **Production Docker Build**:
   - Need to create full production Dockerfile with worker compilation
   - Current authenticated image is for CLI only

2. **Output File Parsing**:
   - Worker needs to implement parsing of generated files
   - Add logic to save parsed documents to Convex

3. **End-to-End Testing**:
   - Test complete flow with Convex integration
   - Verify job processing from UI to completion

## Architecture Summary

```
fondation-web-app/fondation/
├── packages/
│   ├── cli/        # Complete Fondation CLI (integrated)
│   ├── web/        # Web application  
│   ├── worker/     # Worker with CLI integration
│   └── shared/     # Shared types and schemas
├── package.json    # Workspace configuration
└── Dockerfile.auth-test  # Temporary auth test image
```

## Commands Reference

```bash
# Build TypeScript
cd packages/worker && npx tsc --build

# Docker authenticated image
docker run --rm fondation-worker:authenticated /bin/sh -c "claude --version"

# Test CLI directly  
cd packages/cli && bun run src/analyze-all.ts /path/to/repo
```
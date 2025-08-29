# Fondation Worker E2E Deployment Plan

## Executive Summary
This document outlines the complete deployment plan for the Fondation Worker service, enabling end-to-end course generation from UI submission to course display. The worker will use the bundled CLI with OAuth authentication to process repository analysis jobs.

## Current State Assessment

### Completed Components
- CLI successfully builds as `dist/cli.bundled.cjs` (480KB bundle)
- Dependencies correctly pinned (pino 9.7.0, @anthropic-ai/claude-code 1.0.51)
- Convex backend operational at `https://basic-stoat-666.convex.cloud`
- Web UI functional for job submission

### Required Components
- Worker CLI integration update
- Docker authentication setup
- Production-ready worker image
- Output parsing implementation
- E2E validation

## Phase 1: Worker Source Code Updates

### Objective
Update worker source code to use bundled CLI with correct commands and paths.

### Tasks
1. **Modify CLI Executor**
   - Update CLI path to use `dist/cli.bundled.cjs`
   - Change command syntax to `analyze` subcommand
   - Ensure output directory handling for `.claude-tutorial-output/`

2. **Update Docker Commands**
   - Modify internal Docker execution commands
   - Update external Docker runtime references
   - Set correct environment variables

3. **Build Worker**
   - Compile TypeScript sources
   - Verify JavaScript output in dist/
   - Test compilation without errors

### Validation
- Worker TypeScript compiles successfully
- Generated JavaScript includes updated CLI paths
- No hardcoded references to old CLI remain

### Commands
```
cd packages/worker
npm run build
ls -la dist/
```

## Phase 2: Docker Authentication Infrastructure

### Objective
Establish OAuth-authenticated Docker image for Claude SDK access.

### Image Naming Convention
- Base CLI: `fondation-cli:base`
- Authenticated CLI: `fondation-cli:auth-cli`
- Production Worker: `fondation-worker:prod-worker`

### Tasks
1. **Create Authentication Container**
   - Start base container with interactive shell
   - Execute OAuth authentication flow
   - Verify authentication persistence

2. **Commit Authenticated State**
   - Save container state with credentials
   - Tag with professional versioning
   - Document authentication timestamp

3. **Validate Authentication**
   - Test CLI commands in authenticated image
   - Verify analyze command functionality
   - Confirm OAuth token validity

### Commands
```
docker build -f packages/cli/Dockerfile.minimal -t fondation-cli:base packages/cli/
docker run -it --name claude-auth-session fondation-cli:base /bin/sh
# Inside container: npx claude auth
docker commit claude-auth-session fondation-cli:auth-cli
docker run --rm fondation-cli:auth-cli node cli.bundled.cjs run -p "test"
```

## Phase 3: Production Worker Image Build

### Objective
Create production-ready worker image with all required components.

### Docker Image Architecture
```
fondation-worker:prod-worker
├── Worker Application (packages/worker/dist/)
├── Bundled CLI (packages/cli/dist/cli.bundled.cjs)
├── Prompts Directory (packages/cli/prompts/)
├── Claude SDK Authentication (from authenticated base)
└── Runtime Dependencies
```

### Tasks
1. **Create Production Dockerfile**
   - Base from authenticated CLI image
   - Copy worker application code
   - Set production environment variables
   - Configure health checks

2. **Build Worker Image**
   - Execute multi-stage build
   - Minimize image size
   - Maintain security best practices

3. **Image Validation**
   - Verify all components present
   - Test worker startup
   - Validate CLI accessibility

### Commands
```
docker build -f packages/worker/Dockerfile.production -t fondation-worker:prod-worker .
docker tag fondation-worker:prod-worker fondation-worker:latest
docker images | grep fondation-worker
```

## Phase 4: Output Processing Implementation

### Objective
Ensure worker correctly parses and stores generated documentation.

### Output Structure
```
.claude-tutorial-output/
├── step1_abstractions.yaml
├── step2_relationships.yaml
├── step3_order.yaml
├── chapters/
│   └── *.md
├── reviewed-chapters/
│   └── *.md
└── tutorials/
    └── *.md
```

### Tasks
1. **Verify Output Parsing Logic**
   - Confirm parseOutputFiles method implementation
   - Validate YAML parsing
   - Ensure markdown file processing

2. **Document Structure Mapping**
   - Map files to Convex document schema
   - Set correct document types and indices
   - Maintain chapter ordering

3. **Error Handling**
   - Handle missing output directories
   - Process partial results
   - Log parsing failures

### Validation
- All file types correctly parsed
- Documents saved with proper structure
- No data loss during processing

## Phase 5: Integration Testing

### Objective
Validate complete E2E flow from UI to course display.

### Test Scenarios
1. **Small Repository Test**
   - Submit minimal test repository
   - Monitor job progression
   - Verify course generation

2. **Authentication Validation**
   - Confirm OAuth tokens work
   - No API key errors
   - Successful Claude SDK calls

3. **Output Completeness**
   - All expected files generated
   - Documents properly formatted
   - UI displays all content

### Commands
```
docker run -d --name fondation-worker-test \
  -e CONVEX_URL=https://basic-stoat-666.convex.cloud \
  -e NODE_ENV=production \
  fondation-worker:latest

docker logs -f fondation-worker-test
```

### Success Metrics
- Job completion in < 2 minutes for small repos
- All 6 analysis steps complete
- Document count > 0
- UI shows "Voir le cours" button
- Course content accessible


## Risk Mitigation

### Potential Issues and Resolutions

1. **Authentication Token Expiry**
   - Monitor: Check token validity regularly
   - Mitigation: Automated re-authentication process
   - Fallback: Manual token refresh procedure

2. **Output Parsing Failures**
   - Monitor: Log all parsing errors
   - Mitigation: Partial result handling
   - Fallback: Raw file storage

3. **Memory/Resource Constraints**
   - Monitor: Container resource usage
   - Mitigation: Resource limit configuration
   - Fallback: Job size restrictions

## Validation Checklist

### Phase 1 Complete
- [ ] Worker source updated with bundled CLI paths
- [ ] TypeScript compilation successful
- [ ] No references to old CLI structure

### Phase 2 Complete
- [ ] OAuth authentication established
- [ ] Authenticated image created and tagged
- [ ] Authentication verified with test commands

### Phase 3 Complete
- [ ] Production worker image built
- [ ] All components included and verified
- [ ] Image tagged with proper versioning

### Phase 4 Complete
- [ ] Output parsing logic verified
- [ ] Document structure mapping confirmed
- [ ] Error handling implemented

### Phase 5 Complete
- [ ] E2E test successful
- [ ] All success metrics achieved
- [ ] No critical errors in logs

### Phase 6 Complete
- [ ] Production deployment active
- [ ] Monitoring operational
- [ ] Rollback strategy documented

## Timeline Estimate

- Phase 1: 30 minutes
- Phase 2: 45 minutes
- Phase 3: 30 minutes
- Phase 4: 45 minutes
- Phase 5: 60 minutes
- Phase 6: 30 minutes

**Total Estimated Time: 4 hours**

## Appendix: Critical File Locations

- Worker Source: `packages/worker/src/cli-executor.ts`
- Worker Build Output: `packages/worker/dist/`
- CLI Bundle: `packages/cli/dist/cli.bundled.cjs`
- Prompts: `packages/cli/prompts/`
- Dockerfiles: `packages/worker/Dockerfile.production`
- Convex Endpoint: `https://basic-stoat-666.convex.cloud`

---

**Document Version**: 1.0.0
**Last Updated**: 2025-01-29
**Status**: Ready for Execution
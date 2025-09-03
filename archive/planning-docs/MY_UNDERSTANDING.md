# Fondation Project - My Understanding

## Project Overview
Fondation is a monorepo-based application that analyzes repositories and generates comprehensive educational courses using Claude AI. It consists of a web interface, CLI tool, and background worker that coordinate to process repositories and create structured learning content.

## Monorepo Structure

The project uses Bun as the package manager with workspaces configuration. The main directory is `/fondation` with the following structure:

```
fondation/
├── packages/
│   ├── cli/        # CLI tool for analyzing repositories
│   ├── shared/     # Shared utilities and types
│   ├── web/        # Next.js web application
│   └── worker/     # Background worker for processing jobs
├── convex/         # Convex backend (serverless database/functions)
├── deploy/         # Deployment scripts
└── docs/           # Documentation
```

## Key Technologies Identified

1. **Runtime & Package Manager**: Bun (not npm/yarn)
2. **Backend Database**: Convex (serverless database platform)
3. **Frontend**: Next.js (React framework)
4. **AI Integration**: Claude AI API (Anthropic) via `@anthropic-ai/claude-code` SDK
5. **Containerization**: Docker (for production deployment)
6. **Language**: TypeScript
7. **Linting/Formatting**: Biome (not ESLint/Prettier)
8. **Authentication**: NextAuth with GitHub OAuth

## Package Responsibilities

### CLI Package (`packages/cli`)
- Command-line interface for analyzing repositories
- Commands: analyze, chat, config, generate-chapters, generate-tutorials, review-chapters, run, version, worker
- Multi-step analysis process:
  1. Extract abstractions (step1_abstractions.yaml)
  2. Analyze relationships (step2_relationships.yaml)
  3. Order chapters (step3_order.yaml)
  4. Generate chapters (chapters/)
  5. Review chapters (reviewed-chapters/)
  6. Generate tutorials (tutorials/)
- Uses Claude AI SDK directly for analysis
- Bundled as ESM module for production (cli.bundled.mjs)

### Web Package (`packages/web`)
- Next.js application (App Router)
- GitHub OAuth authentication via NextAuth
- Repository card UI for triggering analysis
- Job status tracking and monitoring
- Course viewing at `/course/[owner]/[repo]/[jobId]`
- Uses Convex React hooks for real-time updates

### Worker Package (`packages/worker`)
- Background job processor with polling mechanism
- Strategy pattern for execution modes:
  - Development: Local CLI execution
  - Production: Docker container execution
- Job lifecycle: pending → claimed → cloning → analyzing → gathering → running → completed/failed
- Health monitoring on port 8081
- Manages temporary repository clones

### Shared Package (`packages/shared`)
- Common types and utilities
- Environment configuration
- Schemas for data validation
- Convex interface definitions

## System Integration & Data Flow

### Course Generation Flow
```
1. User clicks "Generate" on Repo Card (Web)
   ↓
2. Create job in Convex DB (jobs.create mutation)
   - Status: pending
   - Generates callback token
   ↓
3. Worker polls Convex for pending jobs
   ↓
4. Worker claims job (status: claimed)
   ↓
5. Worker clones repository (status: cloning)
   - Uses GitHub token from user
   ↓
6. Worker executes CLI analyze command (status: analyzing)
   - Runs 6-step analysis process
   - Updates progress in real-time
   ↓
7. Worker stores results in Convex (status: completed)
   ↓
8. Web UI redirects to course view
```

### CLI Analyze Command Execution
```
fondation analyze <path> [options]
  ↓
1. Validate project directory
2. Create output directory
3. Run prompts sequentially:
   - Extract abstractions (Claude AI)
   - Analyze relationships (Claude AI)
   - Order chapters (Claude AI)
   - Generate chapters (parallel)
   - Review chapters (parallel)
   - Generate tutorials (parallel)
4. Output YAML files and markdown content
```

## Environment Configurations

### Development Mode
- **CLI**: Direct execution with `bun run src/cli.ts`
- **Worker**: Local mode with `FONDATION_EXECUTION_MODE=local`
- **Web**: Next.js dev server on port 3000
- **Convex**: Dev mode with live sync

### Production Mode
- **CLI**: Bundled ESM in Docker container
- **Worker**: Runs inside Docker with job polling
- **Web**: Next.js production build
- **Convex**: Production deployment

## Docker Architecture

### CLI Docker Image (Dockerfile.production)
- Multi-stage build with Bun
- Bundles CLI as ESM module
- Includes prompts and Claude SDK
- Entry point: `bun /app/cli/dist/cli.bundled.mjs`

### Worker Execution
- Development: Can run locally or in Docker
- Production: Must run in Docker container
- Validates execution environment on startup

## Critical Environment Variables

### CLI
- `CLAUDE_MODEL`: AI model selection
- `CLAUDE_OUTPUT_DIR`: Output directory
- `CLAUDE_SESSION_ID`: Session persistence

### Worker
- `CONVEX_URL`: Convex deployment URL
- `NODE_ENV`: Environment mode
- `FONDATION_EXECUTION_MODE`: local/docker/container
- `DOCKER_CONTAINER`: Docker detection flag

### Web
- `NEXTAUTH_URL`: Authentication callback URL
- `GITHUB_CLIENT_ID/SECRET`: OAuth credentials
- `CONVEX_URL`: Backend connection

## Job State Machine

States:
- **pending**: Job created, waiting for worker
- **claimed**: Worker has claimed the job
- **cloning**: Cloning repository
- **analyzing**: Running CLI analysis
- **gathering**: Collecting results
- **running**: Processing
- **completed**: Success
- **failed**: Error occurred
- **canceled**: User canceled
- **dead**: Exceeded max attempts

## Security Considerations

- GitHub tokens encrypted in database
- OAuth flow with PKCE
- Rate limiting on API endpoints
- Job callback tokens for verification
- Docker isolation for execution

## Key Integration Points

1. **Convex ↔ Worker**: Job queue polling
2. **Worker → CLI**: Strategy-based execution
3. **Web → Convex**: Real-time subscriptions
4. **CLI → Claude API**: AI analysis
5. **Worker → GitHub**: Repository cloning
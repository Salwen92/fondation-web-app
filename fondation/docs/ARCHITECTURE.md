# Architecture Overview

## System Design

Fondation uses a simple, vendor-agnostic architecture with three main components:

```mermaid
graph TD
    A[Next.js Web App] --> B[Convex Database]
    B --> C[Worker Process]
    C --> D[Claude CLI]
    D --> E[GitHub]
    C --> B
```

## Components

### 1. Web Application (Next.js)
- **Location**: `packages/web/`
- **Purpose**: User interface for repository management and course viewing
- **Technologies**: Next.js 15 (App Router), React 19, Tailwind CSS, NextAuth
- **Database**: Convex real-time database with atomic job queue
- **Import Path**: Course pages are 8 levels deep, require `../../../../../../../../convex/_generated/api`

### 2. Worker Process
- **Location**: `packages/worker/`
- **Purpose**: Persistent job processor that polls Convex for work
- **Technologies**: Node.js, TypeScript
- **Deployment**: Docker container on any host (VPS, cloud, local)
- **Key Features**:
  - Polls Convex every 5 seconds for pending jobs
  - Atomic job claiming with lease-based locking
  - Automatic retry with exponential backoff
  - Health checks and metrics endpoints

### 3. Fondation CLI
- **Location**: `packages/cli/`
- **Purpose**: Analyzes codebases and generates course content using Claude AI
- **Technologies**: TypeScript, Claude SDK with OAuth (external dependency)
- **Docker Image**: `fondation/cli:authenticated` (pre-authenticated)
- **Key Features**:
  - 6-step analysis workflow (4-6 minutes per repository)
  - External SDK architecture (not bundled, preserves spawn functionality)
  - YAML abstractions and markdown chapter generation
  - Interactive OAuth authentication (no API keys)

### 4. Shared Types
- **Location**: `packages/shared/`
- **Purpose**: Type-safe schemas shared between all packages
- **Technologies**: TypeScript, Zod validation

## Data Flow

### Job Creation and Processing

1. **User triggers analysis** in web UI
2. **Web app creates job** in Convex with `status: "pending"`
3. **Worker polls Convex** and claims the job atomically
4. **Worker updates status** through processing stages:
   - `claimed` → `cloning` → `analyzing` → `gathering` → `completed`
5. **Worker saves results** to Convex docs collection
6. **Web app displays results** via real-time Convex subscriptions

### Queue Management

The job queue is implemented directly in Convex with:
- **Atomic claiming**: Prevents duplicate processing
- **Lease mechanism**: Jobs have time-limited leases
- **Heartbeat**: Workers extend leases while processing
- **Automatic recovery**: Expired leases return jobs to queue
- **Retry logic**: Failed jobs retry with exponential backoff

## Deployment Architecture

### Production Setup

```
┌─────────────────────────────────────────┐
│   Any VPS/Docker Host (Scaleway, etc.)  │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  fondation/cli:authenticated    │    │
│  │  - Polls Convex every 5s        │    │
│  │  - Claims jobs atomically       │    │
│  │  - Runs 6-step analysis         │    │
│  │  - Pre-authenticated OAuth      │    │
│  └─────────────────────────────────┘    │
│                   ↕                     │
└─────────────────────────────────────────┘
                    ↕
        ┌───────────────────────┐
        │   Convex Database     │
        │   - Real-time data    │
        │   - Atomic job queue  │
        │   - Lease management  │
        │   - Auto retry logic  │
        └───────────────────────┘
                    ↕
        ┌───────────────────────┐
        │   Next.js Web App     │
        │   - GitHub OAuth      │
        │   - Real-time UI      │
        │   - Course viewing    │
        │   (Vercel/any host)   │
        └───────────────────────┘
```

### Key Characteristics

- **No vendor lock-in**: Worker runs on any Docker host
- **No cold starts**: Worker is always running
- **Simple scaling**: Add more worker containers
- **Cost-effective**: ~$4-10/month for VPS

## Security

### Authentication
- **Web App**: GitHub OAuth via NextAuth (session-based)
- **Claude CLI**: Interactive OAuth authentication (browser-based, no API keys)
- **Docker**: Pre-authenticated images (`fondation/cli:authenticated`)
- **Job Callbacks**: Token-based validation for status updates
- **Token Expiry**: OAuth tokens last ~90 days, require re-authentication

### Data Protection
- **GitHub tokens**: Encrypted storage in Convex database
- **Claude credentials**: Committed to Docker image (authenticated state)
- **Container security**: Non-root user (UID 1001)
- **Temp cleanup**: Automatic removal of cloned repositories
- **No API keys**: OAuth-only authentication flow

## Monitoring

### Health Checks
- Worker exposes `/health` endpoint on port 8080
- Includes uptime, memory usage, active jobs

### Metrics
- `/metrics` endpoint provides:
  - Jobs processed/succeeded/failed
  - Average processing time
  - Queue depth
  - Success rate

## Technology Stack

### Frontend
- Next.js 15 (App Router)
- React 19
- Tailwind CSS
- Convex React hooks

### Backend
- Convex (Database + Real-time)
- Node.js Worker
- Claude CLI
- Git

### Infrastructure
- Docker containers
- Any Linux VPS (Scaleway, DigitalOcean, etc.)
- GitHub for source control
- Vercel for web hosting (optional)

## Scaling Strategy

### Vertical Scaling
- Increase worker memory/CPU limits
- Adjust `MAX_CONCURRENT_JOBS`

### Horizontal Scaling  
- Deploy multiple worker containers
- Each with unique `WORKER_ID`
- Automatic load distribution via queue

## Design Principles

1. **Simplicity**: Minimal moving parts
2. **Vendor Independence**: No provider-specific code
3. **Reliability**: Automatic retries and recovery
4. **Observability**: Health checks and metrics
5. **Security**: Least privilege, encrypted secrets
6. **Cost-Effectiveness**: Efficient resource usage

## State Management

### Job States

```mermaid
stateDiagram-v2
    [*] --> pending: Created
    pending --> claimed: Worker claims
    claimed --> running: Processing starts
    running --> completed: Success
    running --> failed: Error (retry)
    failed --> pending: Retry with backoff
    failed --> dead: Max retries exceeded
    running --> pending: Lease expired
```

### Lease Management
- Jobs claimed with 5-minute lease
- Heartbeat every minute extends lease
- Expired leases automatically reclaimed
- Prevents zombie jobs

## Error Handling

### Retry Policy
- Maximum 3 attempts per job
- Exponential backoff: 1s, 2s, 4s
- Jitter added to prevent thundering herd
- Dead letter state after max attempts

### Failure Recovery
- Worker crash: Jobs return to queue after lease expires
- Network issues: Automatic reconnection
- Claude auth failure: Manual intervention required
- Repository access: Retry with backoff

## Performance

### Typical Metrics
- **Job pickup latency**: < 5 seconds (polling interval)
- **Small repository**: 2-5 minutes (all 6 steps)
- **Large repository**: 10-30 minutes (complex codebases)
- **Success rate**: 95%+ with retry logic
- **Concurrent jobs**: 1-2 per worker (configurable)
- **Memory usage**: 500MB-1.5GB per worker
- **Docker image size**: ~2GB (includes Node.js + Claude CLI)

### Optimization Opportunities
- **Faster pickup**: Reduce `POLL_INTERVAL` from 5s to 1s
- **Parallel processing**: Increase `MAX_CONCURRENT_JOBS` (memory permitting)
- **Dedicated workers**: Large repos on high-memory instances
- **Horizontal scaling**: Multiple worker containers with unique IDs
- **Caching**: CLI bundle and dependencies (not results - each analysis is unique)
- **Monitoring**: Real-time metrics at `/health` and `/metrics` endpoints
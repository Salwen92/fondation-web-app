# Architecture Overview

Fondation is a monorepo-based system that transforms GitHub repositories into AI-generated educational content.

## System Architecture Diagram

```mermaid
graph TB
    subgraph "User Layer"
        U[User Browser]
    end
    
    subgraph "Web Layer"
        W[Next.js App<br/>Port 3000]
        A[NextAuth<br/>GitHub OAuth]
    end
    
    subgraph "Data Layer"
        C[Convex Database<br/>Real-time]
        Q[Job Queue<br/>Atomic Operations]
    end
    
    subgraph "Processing Layer (Environment-Aware)"
        WK[Worker Service<br/>Port 8081<br/>Dual-Mode CLI Executor]
        DE[Development Mode<br/>Local TypeScript Execution]
        PE[Production Mode<br/>Docker Container Execution]
    end
    
    subgraph "AI Layer"
        CL[Claude SDK<br/>OAuth Auth]
        AI[Claude AI<br/>Analysis Engine]
    end
    
    subgraph "Output"
        GD[Generated Docs<br/>Markdown Files]
    end
    
    U -->|HTTPS| W
    W <-->|Auth| A
    W <-->|WebSocket| C
    C <--> Q
    Q -->|Poll| WK
    WK -->|Execute| CL
    CL <-->|API| AI
    WK -->|Generate| GD
    GD -->|Store| C
    C -->|Serve| W
```

## Data Flow Sequence

```mermaid
sequenceDiagram
    participant User
    participant Web as Next.js Web
    participant Auth as GitHub OAuth
    participant DB as Convex DB
    participant Queue as Job Queue
    participant Worker as Worker (Docker Container)
    participant Claude as Claude AI
    
    User->>Web: 1. Request analysis
    Web->>Auth: 2. Verify GitHub access
    Auth-->>Web: 3. Token confirmed
    Web->>DB: 4. Create job
    DB->>Queue: 5. Queue job
    Queue-->>Worker: 6. Job available (claimed)
    Worker->>Claude: 7. Analyze repo (6 steps)
    Claude-->>Worker: 8. Generate content
    Worker->>DB: 9. Store documents
    DB-->>Web: 10. Real-time update
    Web-->>User: 11. Show course
```

## Package Structure

```
fondation/                      # Root monorepo
├── convex/                     # Shared database (consolidated)
│   ├── _generated/            # Auto-generated types
│   ├── jobs.ts                # Job management
│   ├── queue.ts               # Atomic job queue
│   ├── repositories.ts        # Repository data
│   ├── users.ts               # User management
│   └── docs.ts                # Document storage
│
├── packages/
│   ├── web/                   # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/          # App router pages
│   │   │   ├── components/   # React components
│   │   │   ├── hooks/        # Custom hooks
│   │   │   └── lib/          # Utilities
│   │   └── public/           # Static assets
│   │
│   ├── worker/                # Job processor
│   │   └── src/
│   │       ├── worker.ts     # Main worker loop
│   │       ├── cli-executor.ts # Dual-mode CLI executor
│   │       ├── cli-strategies/ # Strategy pattern implementations
│   │       │   ├── base-strategy.ts      # Strategy interface
│   │       │   ├── development-strategy.ts # Local execution
│   │       │   ├── production-strategy.ts  # Docker execution
│   │       │   └── strategy-factory.ts     # Environment detection
│   │       └── config.ts     # Environment-aware configuration
│   │
│   ├── cli/                   # Fondation analyzer
│   │   ├── src/
│   │   │   ├── cli.ts        # CLI entry
│   │   │   ├── analyze.ts    # Main analyzer
│   │   │   └── prompts/      # AI prompts
│   │   └── dist/
│   │       └── cli.bundled.mjs # Bundled CLI
│   │
│   └── shared/                # Shared utilities
│       └── src/
│           ├── environment.ts # Environment detection
│           ├── schemas.ts     # Zod schemas
│           └── types.ts       # TypeScript types
│
├── docs/                      # Documentation
├── biome.json                # Linting config
├── tsconfig.json             # TypeScript config
└── package.json              # Root scripts
```

## Import Alias System

The monorepo uses standardized import aliases for clean imports:

```typescript
// ❌ Old way - fragile relative imports
import { api } from '../../../../../../../../convex/_generated/api';

// ✅ New way - standardized aliases
import { api } from '@convex/generated/api';
```

### Available Aliases

| Alias | Maps To | Used For |
|-------|---------|----------|
| `@convex/*` | `/convex/*` | Database functions |
| `@convex/generated/*` | `/convex/_generated/*` | Generated types |
| `@fondation/shared/*` | `/packages/shared/src/*` | Shared utilities |
| `@fondation/web/*` | `/packages/web/src/*` | Web components |
| `@fondation/worker/*` | `/packages/worker/src/*` | Worker logic |
| `@fondation/cli/*` | `/packages/cli/src/*` | CLI utilities |
| `@/*` | Package-specific src | Local imports |

## TypeScript Project References

The monorepo uses TypeScript project references for proper build ordering:

```json
// Root tsconfig.json
{
  "references": [
    { "path": "./packages/shared" },
    { "path": "./packages/cli" },
    { "path": "./packages/web" },
    { "path": "./packages/worker" }
  ]
}
```

Build order: `shared` → `cli` → `web`/`worker` (parallel)

## Component Architecture

### Web Package (Next.js 15)
- **Framework**: Next.js 15 with App Router
- **Auth**: NextAuth with GitHub OAuth
- **UI**: React 19, Tailwind CSS, Radix UI
- **State**: Convex real-time subscriptions
- **Type Safety**: Strict TypeScript with Zod validation

### Worker Package (Dual-Mode Execution)
- **Purpose**: Job processing and orchestration
- **Pattern**: Polling with lease-based claiming
- **Architecture**: Strategy pattern for environment-aware execution
- **Development Mode**: Local TypeScript execution, host Claude auth, Docker bypass
- **Production Mode**: Docker container execution, environment variable auth
- **Monitoring**: Health checks on port 8081
- **Scaling**: Configurable concurrent job limit
- **Environment Detection**: Automatic mode switching based on NODE_ENV/FONDATION_ENV

### CLI Package (Bundled Node.js)
- **Build**: Custom esbuild bundler
- **Size**: ~476KB bundled (Claude SDK external)
- **Auth**: OAuth-based (no API keys)
- **Steps**: 6-phase analysis pipeline (see Step Tracking System below)
- **Output**: Markdown documents

### Shared Package (TypeScript Library)
- **Purpose**: Shared types, schemas, and utilities
- **Environment Detection**: Centralized environment and execution mode detection
- **Validation**: Zod schemas for runtime safety
- **Types**: Common interfaces across packages

## 🏗️ **Dual-Mode Execution Architecture**

Fondation implements a sophisticated dual-mode architecture that adapts execution behavior based on the environment:

### Environment Detection System
```typescript
// packages/shared/src/environment.ts
export function getEnvironment(): Environment {
  // Checks FONDATION_ENV, NODE_ENV, and defaults
}

export function getExecutionMode(): ExecutionMode {
  // Detects local vs docker vs container execution
}
```

### Strategy Pattern Implementation
```typescript
// CLI Execution abstracted via strategy pattern
interface CLIExecutionStrategy {
  execute(repoPath: string, options: CLIOptions): Promise<CLIResult>;
  validate(): Promise<ValidationResult>;
  getName(): string;
}
```

### Development Strategy
- **Environment**: `NODE_ENV=development` or `FONDATION_ENV=development`
- **CLI Path**: `@fondation/cli/cli.ts` (TypeScript source)
- **Execution**: Direct Bun runtime execution
- **Authentication**: Host Claude CLI (`bunx claude auth`)
- **Docker**: Validation bypassed for speed
- **Hot Reload**: Automatic restarts with `tsx watch`
- **Debugging**: Enhanced logging and error reporting

### Production Strategy  
- **Environment**: `NODE_ENV=production` or `FONDATION_ENV=production`
- **CLI Path**: `/app/packages/cli/dist/cli.bundled.mjs`
- **Execution**: Docker container with bundled CLI
- **Authentication**: `CLAUDE_CODE_OAUTH_TOKEN` environment variable
- **Docker**: Strict container enforcement
- **Isolation**: Full process and filesystem isolation

### Strategy Factory
Automatically selects appropriate strategy based on:
1. Environment variables (`NODE_ENV`, `FONDATION_ENV`)
2. Execution context detection (Docker container, local machine)
3. Available authentication methods (host CLI vs environment variables)
4. Development feature flags (`FONDATION_DEV_*`)

## Docker Architecture

### CLI Container Structure
```dockerfile
FROM node:20-alpine
├── Install dependencies (bash, git, curl)
├── Copy bundled CLI (dist/cli.bundled.mjs)
├── Copy prompts directory
├── Install Claude SDK separately (external)
└── Authenticate via OAuth (interactive)
```

### Why External Claude SDK?
- **Size**: Keeps bundle small (~476KB vs 2MB+)
- **Authentication**: OAuth flow requires spawn
- **Updates**: SDK can update independently
- **Security**: Credentials isolated in container

## Step Tracking System

### 6-Step Analysis Pipeline
The analysis process consists of exactly 6 steps, with French localization for user-facing messages:

1. **Extraction des abstractions** (Extract Abstractions) - ~60s
   - Identifies core concepts and abstractions in the codebase
   - Progress: "Étape 1 sur 6" (17%)

2. **Analyse des relations** (Analyze Relationships) - ~60s
   - Maps dependencies and relationships between components
   - Progress: "Étape 2 sur 6" (33%)

3. **Ordonnancement des chapitres** (Order Chapters) - ~30s
   - Determines optimal learning progression
   - Progress: "Étape 3 sur 6" (50%)

4. **Génération des chapitres** (Generate Chapters) - ~60s
   - Creates detailed chapter content
   - Progress: "Étape 4 sur 6" (67%)

5. **Révision des chapitres** (Review Chapters) - ~40s
   - Enhances and refines generated content
   - Progress: "Étape 5 sur 6" (83%)

6. **Finalisation de l'analyse** (Finalize Analysis) - ~40s
   - Creates tutorials and completes the course
   - Progress: "Étape 6 sur 6" (100%)

### Progress Tracking Architecture
- **Worker**: Sends French progress messages via Convex mutations
- **UI Display**: Shows 1-based step indexing (starts at "Étape 1", not "Étape 0")
- **Real-time Updates**: WebSocket connection for live progress
- **Robust Extraction**: Multiple regex patterns with fallbacks for progress parsing

### Key Implementation Details
- **Total Steps**: Always 6 (not 7 as in older versions)
- **Step Indexing**: Internal 0-based, displayed as 1-based to users
- **Localization**: All progress messages in French, code remains in English
- **Error Handling**: Graceful fallbacks if progress extraction fails

## Database Schema (Convex)

### Core Tables
```typescript
// users - GitHub authenticated users
{
  _id: Id<"users">,
  githubId: string,
  username: string,
  email?: string,
  avatarUrl?: string,
  githubAccessToken?: string
}

// repositories - Analyzed repositories
{
  _id: Id<"repositories">,
  userId: Id<"users">,
  githubRepoId: string,
  fullName: string,  // "owner/repo"
  languages: { primary: string, all: Language[] }
}

// jobs - Analysis jobs
{
  _id: Id<"jobs">,
  userId: Id<"users">,
  repositoryId: Id<"repositories">,
  status: JobStatus,
  prompt: string,
  progress?: string,
  result?: JobResult
}

// documents - Generated content
{
  _id: Id<"documents">,
  jobId: Id<"jobs">,
  type: "chapter" | "tutorial",
  content: string,
  metadata: object
}
```

## Security Architecture

### Authentication Flow
1. User clicks "Sign in with GitHub"
2. NextAuth redirects to GitHub OAuth
3. GitHub validates and returns token
4. Token stored encrypted in Convex
5. Worker uses token for repository access

### Security Measures
- No API keys in code (OAuth only)
- Encrypted GitHub tokens
- Signed session cookies
- CSRF protection
- Rate limiting on API routes
- Docker isolation for execution

## Performance Optimizations

### Caching Strategy
- Next.js: ISR for static pages
- Convex: Built-in query caching
- Docker: Layer caching for builds
- CLI: Prompt file caching

### Scaling Approach
- **Vertical**: Increase worker resources
- **Horizontal**: Multiple worker instances
- **Database**: Convex auto-scales
- **CDN**: Static assets via Vercel

## Configuration Management

### Environment Variables
- **Root**: Single `.env.example` source of truth
- **Hierarchy**: Root → Package overrides
- **Secrets**: Never in code, always in env
- **Documentation**: All vars documented

### Dependency Management
- **Package Manager**: Bun (fast, consistent)
- **Versions**: Aligned across packages
- **Lock File**: Single `bun.lockb`
- **Updates**: Coordinated via root

## Monitoring & Observability

### Health Checks
```typescript
// Worker health endpoint
GET http://localhost:8080/health
{
  "status": "healthy",
  "uptime": 3600,
  "activeJobs": 2,
  "version": "1.0.0"
}
```

### Logging
- **Web**: Browser console + Vercel logs
- **Worker**: Structured JSON logs
- **CLI**: Piped to worker logs
- **Database**: Convex dashboard

## Architectural Compliance

### Single Execution Path Enforcement
The system enforces a **single, consistent execution path** to prevent architectural violations:

```typescript
// Worker validates container environment on startup
if (!isInsideDocker) {
  throw new Error("Worker must run inside Docker container");
}
```

### Eliminated Anti-Patterns
- ❌ **External Docker Spawning**: Removed worker spawning separate containers
- ❌ **Parallel Job Systems**: Eliminated dual job creation paths
- ❌ **Silent Failures**: All errors now logged with proper context
- ❌ **Status Inconsistencies**: Unified status handling across all components

### Architecture Flow Validation
```
✅ CORRECT: UI → jobs.create → Queue → Worker (Docker) → CLI (Internal) → Complete
❌ REMOVED: UI → startAnalysis → Convex Scheduler → Mock Execution
❌ REMOVED: Worker → External Docker Spawn → CLI (Separate Container)
```

## Key Design Decisions

1. **Monorepo**: Simplified dependency management
2. **TypeScript**: Type safety across packages
3. **Convex**: Real-time without WebSocket complexity
4. **Docker**: Consistent execution environment (enforced)
5. **OAuth**: No API key management
6. **Biome**: Fast, consistent linting
7. **Bun**: Fast package management
8. **Single Container**: All processing within one Docker container

---

For implementation details, see [Development Guide](./DEVELOPMENT.md).
For deployment instructions, see [Deployment Guide](./DEPLOYMENT.md).
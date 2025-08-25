# Fondation Web App - Project Architecture & Services

## 🎯 Project Overview

Fondation is an AI-powered documentation generation platform that analyzes GitHub repositories and creates comprehensive course materials using Claude AI. The system uses a hybrid architecture combining instant response capabilities with long-running task processing.

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           USER BROWSER                               │
│                                                                      │
│  1. User clicks "Generate Course"                                   │
│  2. Receives real-time progress updates                             │
│  3. Views generated documentation                                   │
└───────────────────────┬─────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     NEXT.JS FRONTEND (Port 3000)                    │
│                                                                      │
│  • React UI with TypeScript                                         │
│  • Real-time updates via Convex subscriptions                       │
│  • French localization                                              │
│  • GitHub OAuth integration                                         │
└───────────────────────┬─────────────────────────────────────────────┘
                        │
                        ├─────────────────┐
                        ▼                 ▼
┌──────────────────────────────┐  ┌──────────────────────────────────┐
│   CONVEX BACKEND (Cloud)     │  │  SCALEWAY GATEWAY (Port 8081)   │
│                               │  │                                  │
│  • Real-time database         │  │  • Express.js API Gateway       │
│  • Job management             │  │  • TypeScript                   │
│  • User authentication        │  │  • Request validation           │
│  • Progress tracking          │  │  • Worker spawning (dev)        │
│  • Document storage           │  │  • Scaleway Jobs trigger (prod) │
└──────────────────────────────┘  └─────────────┬────────────────────┘
                        ▲                        │
                        │                        ▼
                        │         ┌──────────────────────────────────┐
                        │         │    SCALEWAY WORKER              │
                        │         │                                  │
                        │         │  • Node.js worker script         │
                        │         │  • Fondation CLI integration     │
                        └─────────┤  • Repository cloning            │
                                  │  • AI analysis (Claude)          │
                                  │  • Document generation           │
                                  │  • Progress callbacks            │
                                  └──────────────────────────────────┘
```

## 📦 Service Components

### 1. Next.js Frontend (`/src`)
**Purpose**: User interface and interaction layer

**Key Features**:
- Dashboard for repository management
- Real-time job status updates
- Course content viewer with markdown rendering
- GitHub repository integration
- French language UI

**Technologies**:
- Next.js 14 with App Router
- TypeScript with strict mode
- Tailwind CSS for styling
- Shadcn/ui components
- Convex React hooks for real-time data

**Key Files**:
- `/src/app/dashboard/page.tsx` - Main dashboard
- `/src/app/course/[owner]/[repo]/[jobId]/page.tsx` - Course viewer
- `/src/components/repos/repo-card.tsx` - Repository management

### 2. Convex Backend (`/convex`)
**Purpose**: Real-time database and business logic

**Key Features**:
- User authentication with Clerk
- Job lifecycle management
- Document storage and retrieval
- Webhook handling for progress updates
- Real-time subscriptions

**Technologies**:
- Convex real-time database
- TypeScript schemas
- Webhook endpoints
- Mutation and query functions

**Key Files**:
- `/convex/jobs.ts` - Job management
- `/convex/repositories.ts` - Repository tracking
- `/convex/documents.ts` - Document storage
- `/convex/webhooks.ts` - Progress callbacks

### 3. Scaleway API Gateway (`/scaleway-gateway`)
**Purpose**: Request routing and job triggering

**Key Features**:
- HTTP API endpoint for job requests
- Development mode: Direct worker spawning
- Production mode: Scaleway Jobs triggering
- Request validation and routing
- Health checks

**Technologies**:
- Express.js
- TypeScript
- Child process management (dev)
- Scaleway SDK (prod - planned)

**Key Files**:
- `/scaleway-gateway/server-gateway.ts` - Main gateway server
- `/scaleway-gateway/package.json` - Dependencies
- `/scaleway-gateway/Dockerfile` - Container configuration

### 4. Scaleway Worker (`/scaleway-worker`)
**Purpose**: Long-running documentation generation

**Key Features**:
- Repository cloning from GitHub
- Fondation CLI execution
- Claude AI integration for content generation
- Progress reporting via webhooks
- File gathering and transmission

**Technologies**:
- Node.js
- Fondation CLI (Bun-based)
- Git operations
- Webhook callbacks

**Key Files**:
- `/scaleway-worker/worker.js` - Main worker script
- `/scaleway-worker/Dockerfile` - Container with baked API key
- `/scaleway-worker/package.json` - Worker dependencies

## 🔄 Request Flow (E2E)

### Step 1: User Initiates Generation
```typescript
// User clicks "Generate Course" button
// /src/components/repos/repo-card.tsx
const result = await generateCourse({
  userId,
  repositoryId,
  prompt
});
```

### Step 2: Job Creation in Convex
```typescript
// /convex/jobs.ts
const jobId = await ctx.db.insert("jobs", {
  userId,
  repositoryId,
  status: "pending",
  callbackToken: generateToken()
});
```

### Step 3: Trigger Gateway
```typescript
// /src/app/api/analyze-proxy/route.ts
await fetch("http://localhost:8081/analyze", {
  method: "POST",
  body: JSON.stringify({
    jobId,
    repositoryUrl,
    branch,
    callbackUrl,
    callbackToken
  })
});
```

### Step 4: Gateway Spawns Worker
```typescript
// /scaleway-gateway/server-gateway.ts
const workerProcess = spawn('node', ['worker.js'], {
  env: {
    JOB_ID: jobId,
    REPOSITORY_URL: repositoryUrl,
    CALLBACK_URL: callbackUrl,
    // ANTHROPIC_API_KEY baked in Docker
  }
});
```

### Step 5: Worker Executes
```javascript
// /scaleway-worker/worker.js
// 1. Clone repository
await execAsync(`git clone ${REPOSITORY_URL}`);

// 2. Run Fondation CLI
await execAsync(`bun run src/analyze-all.ts ${repoPath}`);

// 3. Send progress updates
await sendCallback({
  type: 'progress',
  status: 'analyzing',
  message: 'Extracting core abstractions'
});
```

### Step 6: Results Storage
```javascript
// Worker sends completion callback
await sendCallback({
  type: 'complete',
  files: gatheredFiles,
  filesCount: files.length
});

// Convex stores documents
await ctx.db.insert("documents", {
  jobId,
  content,
  type: 'chapter'
});
```

### Step 7: User Views Results
```typescript
// /src/app/course/[owner]/[repo]/[jobId]/page.tsx
const documents = await convex.query(api.documents.getByJob, { jobId });
// Render markdown content with syntax highlighting
```

## 🚀 Deployment Modes

### Development Mode
```bash
# Start all services locally
npm run dev              # Next.js on port 3000
npx convex dev          # Convex local backend
npm run dev:gateway     # Gateway on port 8081
# Worker spawned automatically
```

### Production Mode (Scaleway)
```yaml
Gateway:
  Type: Serverless Container
  Timeout: 15 minutes
  Port: 8081
  
Worker:
  Type: Serverless Job
  Timeout: 24 hours
  Docker: With ANTHROPIC_API_KEY baked in
```

## 🔐 Security & Configuration

### Environment Variables
```env
# Frontend
NEXT_PUBLIC_CONVEX_URL=https://...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...

# Gateway
SCALEWAY_GATEWAY_URL=http://localhost:8081
NODE_ENV=development

# Worker (baked in Docker)
ANTHROPIC_API_KEY=sk-ant-...

# Convex
CLERK_WEBHOOK_SECRET=whsec_...
```

### Authentication Flow
1. User signs in via Clerk (GitHub OAuth)
2. JWT token validated by Convex
3. Job callback tokens for webhook security
4. No direct API key exposure to client

## 📊 Performance Characteristics

### Response Times
- **UI Updates**: Real-time via Convex subscriptions
- **Job Creation**: < 1 second
- **Worker Spawn**: < 2 seconds
- **Repository Clone**: 5-30 seconds (size dependent)
- **AI Analysis**: 1-10 minutes (complexity dependent)
- **Total E2E**: 2-15 minutes typical

### Scalability
- **Gateway**: Stateless, horizontally scalable
- **Workers**: Independent jobs, parallel execution
- **Convex**: Managed cloud scaling
- **Storage**: Documents stored in Convex (managed)

## 🧪 Testing Strategy

### Local E2E Test
1. Start all services
2. Login to dashboard
3. Select test repository
4. Click "Generate Course"
5. Monitor progress updates
6. Verify content generation
7. Check document rendering

### Integration Points
- Gateway ↔ Worker communication
- Worker → Convex callbacks
- Convex → UI subscriptions
- GitHub API integration

## 📝 Key Improvements from Cloud Run

1. **Removed Cloud Run Dependency**: Migrated to Scaleway
2. **Fixed ANTHROPIC_API_KEY**: Baked into Docker image
3. **Improved TypeScript**: Strict typing throughout
4. **French Localization**: Complete UI translation
5. **Better Error Handling**: Progress tracking and recovery

## 🎯 Success Metrics

✅ **Completed E2E Test Results**:
- Job ID: `j97bxcvqajqsq9zhtp95f2bsf97pbv13`
- Repository: `Salwen92/test`
- Duration: 290 seconds
- Files Generated: 6
- Content Quality: Comprehensive with examples
- Status: Successfully delivered

## 📚 Generated Content Quality

The system generates:
1. **Structured Chapters**: Well-organized learning paths
2. **Interactive Tutorials**: Hands-on exercises
3. **YAML Configurations**: Analysis metadata
4. **Code Examples**: Contextual demonstrations
5. **Visualizations**: Mermaid diagrams
6. **Best Practices**: Industry standards

## 🔄 Continuous Improvement

The architecture supports:
- Hot reloading in development
- Progressive enhancement
- A/B testing capabilities
- Performance monitoring
- Error tracking and recovery
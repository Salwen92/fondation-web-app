# Phase 1: Architecture Review

## Executive Summary

The Fondation Web App implements a hybrid serverless architecture designed to orchestrate AI-powered documentation generation from GitHub repositories using Claude AI. The system follows a multi-tier approach with clear separation of concerns between the frontend (Next.js), backend (Convex), API gateway (Express), and worker processes (Node.js).

## High-Level Architecture Analysis

### Core Architecture Components

1. **Frontend (Next.js 15 + TypeScript)**
   - Modern React application with App Router
   - NextAuth.js for GitHub OAuth integration
   - Real-time updates via Convex subscriptions
   - Tailwind CSS for styling

2. **Backend Database (Convex)**
   - Real-time database with automatic subscriptions
   - Handles user management, repository tracking, and job orchestration
   - Schema includes users, repositories, jobs, and docs tables

3. **API Gateway (Scaleway Gateway)**
   - Express.js server acting as a proxy
   - Handles job submission to Scaleway serverless jobs
   - Development mode spawns local worker processes
   - Located at `scaleway-gateway/server-gateway.ts`

4. **Worker Process (Scaleway Worker)**
   - Long-running job executor (up to 24-hour timeout)
   - Integrates with Fondation CLI for AI-powered analysis
   - Handles repository cloning and documentation generation
   - Located at `scaleway-worker/worker.js`

### Data Flow Architecture

```
User → Next.js Frontend → Convex Backend → API Proxy → Scaleway Gateway → Worker Process
  ↓                           ↑                                            ↓
GitHub OAuth              Real-time Updates ←─────────── Callbacks ←─────┘
```

### Key Architectural Strengths

1. **Separation of Concerns**: Clear boundaries between UI, data persistence, job orchestration, and processing
2. **Real-time Updates**: Convex provides automatic real-time subscriptions for job status updates
3. **Scalable Processing**: Hybrid architecture supports both local development and production scalability
4. **Authentication Integration**: Seamless GitHub OAuth with proper token management
5. **Error Handling**: Comprehensive callback system for progress tracking and error reporting

## Architectural Concerns and Issues

### 1. Complexity vs. Benefit Trade-off
**File**: `scaleway-gateway/server-gateway.ts:74-80`
The architecture introduces significant complexity with the API Gateway layer that may not provide proportional benefits:

```typescript
async function triggerScalewayJob(_jobParams: JobParams): Promise<JobResult> {
  // TODO: Implement Scaleway SDK integration
  throw new Error('Scaleway production mode not yet implemented. Use NODE_ENV=development for local testing.');
}
```

**Issue**: Production Scaleway integration is not implemented, making the entire gateway layer currently redundant.

### 2. Inconsistent Port Configuration
**Files**: 
- `scaleway-gateway/server-gateway.ts:47` (port 8081)
- `src/app/api/analyze-proxy/route.ts:22` (references port 8081)
- `docs/cli-integration-guide.md:52` (port 8080 in examples)

**Issue**: Mixed port configurations could lead to deployment inconsistencies.

### 3. Authentication Token Security
**File**: `convex/schema.ts:10`
```typescript
githubAccessToken: v.optional(v.string()),
```

**Issue**: GitHub tokens are stored as plain strings in Convex without encryption, creating a security vulnerability.

### 4. Single Point of Failure in Worker Process
**File**: `scaleway-worker/worker.js:217-224`
The worker process has a single long-running command with limited fault tolerance:

```javascript
const analyzeProcess = exec(analyzeCommand, {
  timeout: 3600000, // 60 minutes timeout
  maxBuffer: 50 * 1024 * 1024, // 50MB buffer
  // ...
});
```

**Issue**: No retry logic, checkpoint recovery, or partial failure handling.

### 5. Tight Coupling Between Components
**File**: `src/app/api/analyze-proxy/route.ts:12-51`
The API proxy route directly forwards requests without validation or transformation, indicating tight coupling between frontend and gateway.

### 6. Job State Management Complexity
**File**: `convex/jobs.ts:26-35`
Multiple job statuses without clear state transition rules:

```typescript
status: v.union(
  v.literal("pending"),
  v.literal("cloning"),
  v.literal("analyzing"),
  v.literal("gathering"),
  v.literal("running"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("canceled"),
),
```

**Issue**: No state machine or validation for legal status transitions.

## Conflicting Logic Identified

### 1. Development vs Production Mode Handling
**Files**: 
- `scaleway-gateway/server-gateway.ts:170-192`
- `scaleway-worker/worker.js:198-212`

The gateway handles development/production mode switching, but the worker also has mode detection logic. This creates potential for configuration drift.

### 2. Callback Token Validation
**File**: `convex/jobs.ts:132-134`
```typescript
if (job.callbackToken !== args.callbackToken) {
  throw new Error("Invalid callback token");
}
```

The token validation is strict in Convex but the worker process doesn't have equivalent validation for callback failures.

### 3. Job Cancellation Logic
**Files**:
- `convex/jobs.ts:220-251` (cancelJob mutation)
- `convex/jobs.ts:253-278` (requestCancel mutation)

Two different cancellation mechanisms exist with overlapping functionality but different behaviors.

## Architecture Recommendations

### 1. Simplify the Gateway Layer
Consider removing the Scaleway Gateway for development and implementing direct Convex-to-worker communication, reducing architectural complexity.

### 2. Implement Proper State Machine
Create a formal job state machine with defined transition rules and validation.

### 3. Add Security Enhancements
- Encrypt GitHub tokens at rest
- Implement token rotation mechanisms
- Add request validation and rate limiting

### 4. Improve Fault Tolerance
- Add checkpoint/resume capabilities to worker processes
- Implement exponential backoff retry logic
- Create graceful degradation strategies

### 5. Standardize Configuration
- Consolidate port and URL configurations
- Create environment-specific configuration files
- Implement configuration validation

## Conclusion

The architecture demonstrates good separation of concerns and scalability potential, but suffers from implementation inconsistencies and security concerns. The core design is sound but needs refinement in execution details and production readiness.
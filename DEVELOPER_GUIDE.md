# Developer Guide - Fondation Web App

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Setting Up Development](#setting-up-development)
3. [Understanding the Flow](#understanding-the-flow)
4. [Working with Services](#working-with-services)
5. [Common Development Tasks](#common-development-tasks)
6. [Debugging](#debugging)
7. [Best Practices](#best-practices)

## Architecture Overview

The application follows a microservices architecture with clear separation of concerns:

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│    Convex    │────▶│ Scaleway Gateway│
│   (Frontend)    │◀────│   (Backend)  │◀────│   (API Router)  │
└─────────────────┘     └──────────────┘     └────────┬────────┘
                                                       │
                                              ┌────────▼────────┐
                                              │ Scaleway Worker │
                                              │  (Job Processor)│
                                              └─────────────────┘
```

## Setting Up Development

### 1. Initial Setup

```bash
# Clone the repository
git clone <repo-url>
cd fondation-web-app

# Install dependencies
bun install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with your credentials
```

### 2. Required Credentials

- **GitHub OAuth App**: Create at github.com/settings/developers
- **Anthropic API Key**: Get from console.anthropic.com
- **Convex Account**: Sign up at convex.dev

### 3. Start Development

```bash
# Easy way - start everything
./start-dev.sh

# Manual way - start each service
bunx convex dev          # Terminal 1
bun run dev              # Terminal 2
cd scaleway-gateway && bun run dev  # Terminal 3
```

## Understanding the Flow

### Job Creation Flow

1. **User Action**: Clicks "Générer le cours" button
2. **Frontend**: Calls `/api/analyze-proxy`
3. **API Route**: Creates job in Convex, forwards to Gateway
4. **Gateway**: Spawns worker process
5. **Worker**: Clones repo, runs Fondation CLI
6. **Callbacks**: Worker sends progress updates
7. **Convex**: Updates job status in real-time
8. **Frontend**: Shows live progress to user

### Data Flow Example

```javascript
// 1. Frontend initiates
const result = await generateCourse({
  userId,
  repositoryId,
  prompt
});

// 2. Convex creates job
const jobId = await ctx.db.insert("jobs", {
  userId,
  repositoryId,
  status: "pending"
});

// 3. Gateway receives request
POST /analyze
{
  jobId,
  repositoryUrl,
  callbackUrl,
  callbackToken
}

// 4. Worker processes
await cloneRepository(repositoryUrl);
await runFondationCLI(repoPath);
await sendCallback({ type: "complete", files });

// 5. Convex stores results
await ctx.db.insert("documents", {
  jobId,
  content,
  type: "chapter"
});
```

## Working with Services

### Frontend (Next.js)

**Location**: `/src`

**Key Components**:
- `app/dashboard/page.tsx` - Main dashboard
- `components/repos/repo-card.tsx` - Repository management
- `app/course/[owner]/[repo]/[jobId]/page.tsx` - Course viewer

**Development Tips**:
```bash
# Hot reload works automatically
# Check browser console for errors
# Use React DevTools for debugging
```

### Backend (Convex)

**Location**: `/convex`

**Key Functions**:
- `jobs.ts` - Job lifecycle management
- `repositories.ts` - GitHub integration
- `docs.ts` - Document storage

**Development Tips**:
```bash
# Watch Convex dashboard for real-time data
# Use console.log in functions (visible in terminal)
# Test mutations in Convex dashboard
```

### Gateway (Express)

**Location**: `/scaleway-gateway`

**Key Files**:
- `server-gateway.ts` - Request routing
- `Dockerfile` - Production container

**Development Tips**:
```bash
# Logs appear in terminal
# Test with curl or Postman
curl -X POST http://localhost:8081/analyze \
  -H "Content-Type: application/json" \
  -d '{"jobId":"test","repositoryUrl":"..."}'
```

### Worker (Node.js)

**Location**: `/scaleway-worker`

**Key Files**:
- `worker.js` - Job processing logic
- `Dockerfile` - Production container with API key

**Development Tips**:
```bash
# Run standalone for testing
JOB_ID=test REPOSITORY_URL=https://github.com/user/repo \
CALLBACK_URL=http://localhost:3000/api/webhook/job-callback \
ANTHROPIC_API_KEY=sk-ant-... \
node worker.js
```

## Common Development Tasks

### Adding a New Feature

1. **Plan the data flow**
   - What data needs to be stored?
   - What API endpoints are needed?
   - How will the UI update?

2. **Update Convex schema** (`/convex/schema.ts`)
   ```typescript
   newTable: defineTable({
     field: v.string(),
     // ...
   })
   ```

3. **Create Convex functions** (`/convex/newFeature.ts`)
   ```typescript
   export const myMutation = mutation({
     args: { /* ... */ },
     handler: async (ctx, args) => {
       // Implementation
     }
   });
   ```

4. **Add API routes** (`/src/app/api/new-route/route.ts`)
   ```typescript
   export async function POST(req: NextRequest) {
     const body = await req.json() as TypedBody;
     // Implementation
   }
   ```

5. **Build UI components** (`/src/components/new-feature.tsx`)
   ```typescript
   export function NewFeature() {
     const data = useQuery(api.newFeature.getData);
     // Component logic
   }
   ```

### Fixing TypeScript Errors

```bash
# Check for errors
bun run typecheck

# Common fixes:
# 1. Add proper types for API responses
interface ResponseType {
  field: string;
}
const data = await response.json() as ResponseType;

# 2. Handle nullable values
const value = nullableField ?? defaultValue;

# 3. Cast Convex IDs
const id = stringId as Id<"tableName">;
```

### Updating Dependencies

```bash
# Check outdated packages
bun outdated

# Update specific package
bun update package-name

# Update all
bun update

# Always test after updating
bun run check
bun run build
```

## Debugging

### Frontend Debugging

```javascript
// Add breakpoints in browser DevTools
debugger;

// Use console methods
console.log("Data:", data);
console.table(arrayData);
console.time("operation");
// ... code ...
console.timeEnd("operation");
```

### Backend Debugging

```javascript
// In Convex functions
console.log("[Function Name]", { args, result });

// In API routes
console.log(`[${req.method}] ${req.url}`, body);

// In Gateway/Worker
console.log(`[${process.env.JOB_ID}] Step: ${step}`);
```

### Common Issues

**1. Port already in use**
```bash
# Find and kill process
lsof -i:3000
kill -9 <PID>
```

**2. Convex not syncing**
```bash
# Clear cache and restart
bunx convex dev --clear-cache
```

**3. TypeScript errors after changes**
```bash
# Rebuild types
rm -rf .next
bun run build
```

**4. Worker not receiving callbacks**
- Check CALLBACK_URL is correct
- Verify callbackToken matches
- Check network connectivity

## Best Practices

### Code Quality

1. **Always type your code properly**
   ```typescript
   // ❌ Bad
   const handleData = (data: any) => { ... }
   
   // ✅ Good
   interface DataType { ... }
   const handleData = (data: DataType) => { ... }
   ```

2. **Use nullish coalescing**
   ```typescript
   // ❌ Bad
   const value = field || "default";
   
   // ✅ Good
   const value = field ?? "default";
   ```

3. **Handle errors gracefully**
   ```typescript
   try {
     await riskyOperation();
   } catch (error) {
     console.error("Operation failed:", error);
     // User-friendly error handling
     toast.error("Something went wrong");
   }
   ```

### Git Workflow

```bash
# Before committing
bun run check        # Run all checks
bun run format:write # Format code

# Commit with clear message
git add .
git commit -m "feat: add new feature

- Added X functionality
- Fixed Y issue
- Updated Z component"

# Push to feature branch
git push origin feature/my-feature
```

### Performance Tips

1. **Use React Query patterns with Convex**
2. **Implement proper loading states**
3. **Optimize images and assets**
4. **Use server components where possible**
5. **Implement proper caching strategies**

### Security

1. **Never commit secrets**
2. **Use environment variables**
3. **Validate all user inputs**
4. **Sanitize data before storage**
5. **Use proper authentication checks**

## Deployment Checklist

- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Environment variables configured
- [ ] Docker images built
- [ ] Database migrations run
- [ ] API endpoints tested
- [ ] UI thoroughly tested
- [ ] Performance acceptable
- [ ] Security review done

## Getting Help

- Check existing code for patterns
- Read Convex documentation: docs.convex.dev
- Next.js docs: nextjs.org/docs
- Ask team members for code review
- Use AI assistants for debugging help

## Resources

- [Convex Documentation](https://docs.convex.dev)
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Patterns](https://react.dev/learn)
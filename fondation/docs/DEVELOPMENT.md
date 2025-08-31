# Development Workflow

This guide covers the complete development workflow for the Fondation monorepo.

## Available Scripts

For a complete list of all 50+ scripts, see [COMMANDS.md](../COMMANDS.md). Here are the most important ones:

### Daily Development
```bash
bun run dev           # Start all services (recommended)
bun run dev:web       # Start only web interface
bun run dev:worker    # Start only worker service
bun run dev:convex    # Start only Convex database
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
bun run dev           # Start with auto-reload
bun run build         # Compile TypeScript
```

**Common tasks:**
- Modify job processing: Edit `src/cli-executor.ts`
- Add new job types: Update `src/index.ts`
- Change Docker config: Edit `src/docker-manager.ts`

### CLI Package Development

```bash
cd packages/cli
bun run dev           # Interactive development
bun run build         # Compile TypeScript and create bundle
```

**Common tasks:**
- Add analysis steps: Create new prompt in `prompts/`
- Modify analysis logic: Edit `src/analyze-all.ts`
- Update UI components: Edit files in `src/ui/components/`

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
   node dist/cli.bundled.mjs analyze /workspace --verbose
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

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues and solutions.

---

Follow these workflows to maintain code quality and development velocity in the Fondation monorepo.
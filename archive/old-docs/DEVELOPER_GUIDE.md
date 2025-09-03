# Developer Guide

## Overview

Fondation is a vendor-agnostic monorepo application that generates AI-powered documentation for GitHub repositories using Claude AI. This guide provides comprehensive information for developers working on the project.

## Architecture

```
USER → NEXT.JS → CONVEX ← WORKER (polls for jobs)
         ↓         ↑
      Real-time updates
```

### Key Components

1. **Web Application** (`fondation/apps/web/`)
   - Next.js 15 with App Router
   - Real-time updates via Convex
   - GitHub OAuth authentication
   
2. **Worker Process** (`fondation/apps/worker/`)
   - Persistent Node.js process
   - Polls Convex for pending jobs
   - Executes Claude CLI
   
3. **Shared Types** (`fondation/packages/shared/`)
   - Type definitions
   - Zod validation schemas

## Development Setup

### Prerequisites

- Bun (latest version)
- Node.js 20+
- Claude CLI (authenticated)
- GitHub OAuth App
- Convex account

### Quick Start

```bash
# Clone repository
git clone [repo-url]
cd fondation-web-app

# Navigate to monorepo
cd fondation

# Install dependencies
bun install

# Start services (3 terminals)
# Terminal 1: Convex
cd apps/web && bunx convex dev

# Terminal 2: Web app
cd apps/web && bun run dev

# Terminal 3: Worker
cd apps/worker && bun run dev
```

## Code Structure

### Web Application (`apps/web/`)

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages
│   ├── (dashboard)/       # Protected pages
│   ├── api/              # API routes
│   └── course/           # Course viewer
├── components/            # React components
│   ├── auth/            # Auth components
│   ├── dashboard/       # Dashboard UI
│   ├── repos/          # Repository UI
│   └── ui/             # shadcn/ui
├── lib/                  # Utilities
│   ├── api-validation.ts
│   ├── cache.ts
│   ├── crypto.ts
│   └── validation.ts
└── server/              # Server code
    └── auth/           # NextAuth config
```

### Worker Process (`apps/worker/`)

```
src/
├── index.ts           # Entry point
├── worker.ts         # Polling logic
├── cli-executor.ts   # Claude CLI
├── repo-manager.ts   # Git operations
└── health.ts        # Health checks
```

### Convex Functions

```
convex/
├── jobs.ts          # Job management
├── repositories.ts  # Repo operations
├── docs.ts         # Document storage
├── users.ts        # User management
├── queue.ts        # Queue operations
└── schema.ts       # Database schema
```

## Development Workflow

### Feature Development

1. **Create feature branch**
```bash
git checkout -b feature/your-feature
```

2. **Make changes**
- Follow existing patterns
- Add types to `packages/shared`
- Update tests if applicable

3. **Test locally**
```bash
# Type checking
bun run typecheck

# Linting
bun run lint

# Format code
bun run format
```

4. **Create PR**
- Include clear description
- Reference any issues
- Add screenshots if UI changes

### Code Style

- **TypeScript**: Strict mode enabled
- **React**: Functional components with hooks
- **Styling**: Tailwind CSS utilities
- **Components**: shadcn/ui patterns
- **Imports**: Use absolute paths (`@/`)

### Best Practices

1. **Type Safety**
   - Define all types explicitly
   - Use Zod for runtime validation
   - Avoid `any` types

2. **Error Handling**
   - Use try-catch blocks
   - Log errors appropriately
   - Provide user feedback

3. **Performance**
   - Use React.memo for expensive components
   - Implement virtual scrolling for lists
   - Cache API responses

4. **Security**
   - Validate all inputs
   - Sanitize user content
   - Use environment variables
   - Never commit secrets

## Testing

### Unit Tests

```bash
# Run tests
bun test

# Watch mode
bun test --watch

# Coverage
bun test --coverage
```

### E2E Tests

```bash
# Install Playwright
bunx playwright install

# Run tests
bun run test:e2e
```

### Manual Testing

1. **Authentication Flow**
   - Sign in with GitHub
   - Verify session persistence
   - Test sign out

2. **Repository Management**
   - List repositories
   - Generate documentation
   - Monitor job progress

3. **Worker Processing**
   - Submit job
   - Verify processing
   - Check results

## Debugging

### Debug Logs

```bash
# Enable all logs
DEBUG=* bun run dev

# Specific namespaces
DEBUG=fondation:* bun run dev
DEBUG=convex:* bunx convex dev
```

### Convex Dashboard

```bash
bunx convex dashboard
```

### Worker Health

```bash
# Check health
curl http://localhost:8080/health

# View metrics
curl http://localhost:8080/metrics
```

## Common Tasks

### Add New Convex Function

1. Create function in `convex/`
2. Define types in schema
3. Export from appropriate file
4. Use in React with hooks

### Add New API Route

1. Create route in `app/api/`
2. Implement handler
3. Add validation
4. Document in API.md

### Update Database Schema

1. Modify `convex/schema.ts`
2. Run migrations if needed
3. Update TypeScript types
4. Test thoroughly

## Deployment

### Web App (Vercel)

```bash
cd fondation/apps/web
vercel deploy
```

### Worker (Docker)

```bash
cd fondation/apps/worker
docker build -t fondation-worker .
docker push [registry]/fondation-worker
```

## Troubleshooting

### Common Issues

1. **Worker not processing jobs**
   - Check Convex connection
   - Verify polling is active
   - Check Claude CLI auth

2. **Authentication fails**
   - Verify GitHub OAuth config
   - Check NextAuth secret
   - Clear cookies/session

3. **Build errors**
   - Clear node_modules
   - Update dependencies
   - Check TypeScript config

### Getting Help

- Check [Documentation](./docs/)
- Search existing issues
- Ask in discussions
- Create detailed bug report

## Resources

- [Architecture Overview](./fondation/docs/ARCHITECTURE.md)
- [API Documentation](./docs/API.md)
- [Local Development](./LOCAL_DEVELOPMENT.md)
- [Contributing Guide](./fondation/CONTRIBUTING.md)
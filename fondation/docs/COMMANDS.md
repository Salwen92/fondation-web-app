# Fondation Monorepo Commands

This document provides a comprehensive guide to all available commands in the Fondation monorepo.

## Quick Start

```bash
bun install          # Install all dependencies
bun run setup        # Install + build everything
bun run dev          # Start all services (Convex, Web, Worker)
```

## Development

Start all services for full development environment:
```bash
bun run dev          # Starts Convex, Web, and Worker in parallel
bun run dev:all      # Starts Convex, Web, Worker, and CLI in parallel
```

Start individual services:
```bash
bun run dev:convex   # Start only Convex database
bun run dev:web      # Start only Next.js web app (port 3000)
bun run dev:worker   # Start only background worker service
bun run dev:cli      # Start only CLI development mode
```

## Building

Build all packages in correct dependency order:
```bash
bun run build        # Build Shared → CLI → Web → Worker
```

Build individual packages:
```bash
bun run build:shared # Build shared types package
bun run build:cli    # Build CLI + create bundled executable
bun run build:web    # Build Next.js production bundle
bun run build:worker # Build worker service
bun run build:docker # Build Docker image for CLI
```

## Quality Checks

### TypeScript Type Checking
```bash
bun run typecheck           # Check all packages with project references
bun run typecheck:cli       # Check only CLI package
bun run typecheck:web       # Check only Web package  
bun run typecheck:worker    # Check only Worker package
bun run typecheck:shared    # Check only Shared package
```

### Linting
```bash
bun run lint         # Lint all packages
bun run lint:cli     # Lint only CLI package
bun run lint:web     # Lint only Web package
bun run lint:worker  # Lint only Worker package
bun run lint:fix     # Auto-fix lint issues in all packages
```

### Formatting
```bash
bun run format:check # Check Prettier formatting
bun run format:write # Apply Prettier formatting
```

## Testing

```bash
bun run test         # Run all tests across packages
bun run test:cli     # Run CLI tests only
bun run test:web     # Run Web tests only
bun run test:worker  # Run Worker tests only
```

## Maintenance

### Cleaning Build Artifacts
```bash
bun run clean        # Clean dist/ and cache files
bun run clean:dist   # Remove only built output directories
bun run clean:cache  # Remove only cache files (.turbo, .tsbuildinfo)
bun run clean:all    # Clean everything including node_modules
```

### Resetting Environment
```bash
bun run reset        # Clean all + reinstall + rebuild
bun run install:all  # Reinstall all dependencies
bun run setup        # Install + build (for new clones)
```

## CI/CD Pipeline

```bash
bun run ci           # Full CI pipeline: typecheck → lint → test → build
bun run prepush      # Pre-push checks: typecheck + lint
bun run precommit    # Pre-commit: format + lint fix + typecheck
```

## Docker Operations

```bash
bun run docker:build  # Build CLI Docker image
bun run docker:auth   # Setup Claude authentication in container
bun run docker:clean  # Clean Docker build cache
```

## End-to-End Testing

```bash
bun run e2e          # Build everything + start dev environment
bun run e2e:test     # Run end-to-end tests
```

## Package Structure

```
fondation/
├── packages/
│   ├── shared/      # TypeScript types and utilities
│   ├── cli/         # Fondation CLI tool (bundled with Claude SDK)  
│   ├── web/         # Next.js web application
│   └── worker/      # Background job processor
├── convex/          # Shared Convex database functions
└── root             # Monorepo orchestration scripts
```

## Development Workflow

### New Developer Setup
```bash
git clone <repo>
cd fondation
bun run setup        # Install + build everything
bun run dev          # Start development environment
```

### Daily Development
```bash
bun run dev          # Start all services
# ... make changes ...
bun run precommit    # Format, lint, and typecheck before commit
git commit -m "feat: description"
bun run prepush      # Final checks before push
```

### Before Production Deploy
```bash
bun run ci           # Full CI pipeline
bun run docker:build # Build production Docker image
```

## Troubleshooting

### Build Issues
```bash
bun run clean        # Clean build artifacts
bun run typecheck    # Check for TypeScript errors
bun run build        # Rebuild everything
```

### Environment Issues  
```bash
bun run reset        # Nuclear option: clean all + reinstall + rebuild
```

### Docker Issues
```bash
bun run docker:clean # Clean Docker cache
bun run docker:build # Rebuild Docker image
```

## Performance Notes

- **Parallel Execution**: `dev` and `dev:all` use `concurrently` for parallel service startup
- **Build Order**: `build` respects dependency order (shared → cli → web → worker)
- **TypeScript**: Uses project references for incremental compilation
- **Caching**: Preserves Turbo and TypeScript build caches between runs
- **Docker**: Multi-stage builds with external SDK architecture for optimal size

## Environment Variables

Essential environment variables for development:

```bash
# Convex (auto-generated by `bunx convex dev` or `npx convex dev`)
NEXT_PUBLIC_CONVEX_URL=
CONVEX_DEPLOYMENT=

# Authentication (GitHub OAuth)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
AUTH_SECRET=

# Worker Gateway (optional)
WORKER_GATEWAY_URL=http://localhost:8081
```

## IDE Integration

The monorepo is configured for optimal IDE experience:

- **TypeScript**: Project references for accurate IntelliSense across packages
- **Import Paths**: Standardized `@convex/*` aliases resolve correctly
- **Linting**: ESLint/Biome configurations per package with root orchestration
- **Formatting**: Prettier with consistent formatting across all files

---

For more detailed information about specific packages, see their individual README files in `packages/*/README.md`.
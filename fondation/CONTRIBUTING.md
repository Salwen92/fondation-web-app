# Contributing to Fondation

## Development Setup

### Prerequisites
- Node.js 20+
- Bun 1.0+
- Docker (for worker development)
- Git

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/your-org/fondation.git
cd fondation

# Install dependencies
bun install

# Copy environment variables
cp packages/web/.env.example packages/web/.env.local
# Edit .env.local with your configuration
```

## Monorepo Structure

```
fondation/
├── convex/              # Shared Convex database (root level)
│   ├── _generated/      # Auto-generated API types
│   ├── jobs.ts          # Job management
│   ├── queue.ts         # Atomic job queue
│   ├── docs.ts          # Document storage
│   └── schema.ts        # Database schema
├── packages/
│   ├── web/             # Next.js web application
│   ├── worker/          # Docker job processor
│   ├── cli/             # Fondation CLI (code analyzer)
│   └── shared/          # Shared types and utilities
├── docs/                # Documentation
├── deploy/              # Deployment scripts
├── DOCKER_BUILD_GUIDE.md # Complete Docker setup guide
└── CLAUDE.md            # Ultimate development & testing guide
```

## Development Commands

### Running Applications

```bash
# Start database first (required)
npx convex dev

# In separate terminals:
cd packages/web && bun run dev    # Web app (http://localhost:3000)
cd packages/worker && bun run dev # Job processor

# Build all packages
bun run build

# Quality assurance
bun run typecheck      # TypeScript checking
bun run lint           # Code linting
bun run format:write   # Code formatting
```

### Working with Packages

```bash
# Run command in specific package
cd packages/web && bun run dev
cd packages/worker && bun run build
cd packages/shared && bun run typecheck

# Add dependency to specific package
cd packages/web && bun add react-query
cd packages/worker && bun add bullmq
```

## Development Workflow

### 1. Web Application (packages/web)

```bash
# Start development server (requires Convex running)
cd packages/web
bun run dev

# Access at http://localhost:3000
```

#### Key Technologies:
- Next.js 15
- Convex for database
- NextAuth for authentication
- Tailwind CSS

### 2. Worker (packages/worker)

```bash
# Start worker in development
cd packages/worker
bun run dev

# Or with Docker (see DOCKER_BUILD_GUIDE.md for complete instructions)
docker build -f packages/cli/Dockerfile.production -t fondation/cli:latest .
# Authentication required - see CLAUDE.md for setup
```

#### Key Technologies:
- Node.js + TypeScript
- Convex real-time database
- Docker containerization
- Claude CLI with OAuth authentication

### 3. Shared Package (packages/shared)

Shared types and utilities used across applications.

```bash
# After making changes to shared package
cd packages/shared
bun typecheck
```

## Code Style

### TypeScript
- Use TypeScript for all new code
- Prefer interfaces over types for objects
- Use strict mode

### Formatting
- Prettier handles formatting automatically
- Run `bun format:write` before committing

### Naming Conventions
- Components: PascalCase
- Functions/variables: camelCase
- Constants: UPPER_SNAKE_CASE
- Files: kebab-case

## Testing

```bash
# Run all tests (when implemented)
bun test

# Run tests for specific package
cd packages/web && bun test
```

## Git Workflow

### Branch Naming
- `feat/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation
- `refactor/description` - Code refactoring
- `chore/description` - Maintenance tasks

### Commit Messages
Follow conventional commits:
```
feat: add user authentication
fix: resolve job polling issue
docs: update worker documentation
refactor: simplify queue logic
chore: update dependencies
```

### Pull Request Process
1. Create feature branch from `main`
2. Make changes following code style
3. Run `bun typecheck` and `bun format:write`
4. Commit with descriptive message
5. Push branch and create PR
6. Ensure CI passes
7. Request review

## Environment Variables

### Web App (packages/web/.env.local)
```bash
# Required
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
AUTH_SECRET=your-auth-secret                    # Generate with: npx auth secret
GITHUB_CLIENT_ID=your-github-oauth-id
GITHUB_CLIENT_SECRET=your-github-oauth-secret

# Optional
WORKER_GATEWAY_URL=http://localhost:8080       # Worker service URL
```

### Worker (packages/worker/.env)
```bash
# Required
CONVEX_URL=https://your-deployment.convex.cloud

# Optional
WORKER_ID=worker-1                  # Unique worker ID
POLL_INTERVAL=5000                  # Job polling interval (ms)
LEASE_TIME=300000                   # Job lease duration (5 minutes)
HEARTBEAT_INTERVAL=60000           # Lease heartbeat interval (1 minute)
MAX_CONCURRENT_JOBS=1               # Maximum concurrent jobs
TEMP_DIR=/tmp/fondation            # Temporary directory
```

## Docker Development

### Critical Requirements

**⚠️ IMPORTANT**: Read `DOCKER_BUILD_GUIDE.md` and `CLAUDE.md` before Docker development.

### Authentication Setup (Required)

The worker uses Claude CLI which requires interactive OAuth authentication:

```bash
# 1. Build CLI image
docker build -f packages/cli/Dockerfile.production -t fondation/cli:latest .

# 2. Create authentication container
docker run -d --name auth fondation/cli:latest tail -f /dev/null

# 3. Authenticate interactively
docker exec -it auth npx claude auth

# 4. Commit authenticated image
docker commit auth fondation/cli:authenticated

# 5. Deploy worker
docker run -d \
  --name fondation-worker \
  -e CONVEX_URL=https://your-deployment.convex.cloud \
  fondation/cli:authenticated
```

### Key Points
- **Always rebuild Docker images** after code changes
- **Clean up old images/containers** to prevent disk space issues
- **Use standard naming**: `fondation/cli:latest` and `fondation/cli:authenticated`
- **OAuth tokens expire** (~90 days) - re-authenticate when needed

## Troubleshooting

### Common Issues

#### Bun workspace issues
```bash
# Clear cache and reinstall
rm -rf node_modules bun.lockb
bun install
```

#### Course page import errors
If you see "Module not found: Can't resolve 'convex/_generated/api'":
- Course pages are 8 levels deep: `[owner]/[repo]/[jobId]`
- Use correct relative import: `../../../../../../../../convex/_generated/api`
- Verify path with: `ls ../../../../../../../../convex/_generated/`

#### Docker authentication failures
- Check if OAuth token expired: `docker exec -it container npx claude auth --check`
- Re-authenticate: `docker exec -it container npx claude auth`
- Rebuild image if code changed: Follow Docker authentication steps above

### TypeScript errors in shared package
```bash
# Rebuild shared package
cd packages/shared
bun run typecheck
```

### Port conflicts
- Web app uses port 3000
- Worker health server uses port 8080
- Convex dev uses port 3210
- Adjust in environment files if needed

## Documentation

- Update relevant docs when making changes
- Keep README files current
- Document new environment variables
- Add JSDoc comments for complex functions

## Security

- Never commit secrets or API keys
- Use environment variables for configuration
- Review dependencies for vulnerabilities
- Follow principle of least privilege

## Getting Help

- Check existing documentation
- Search closed issues
- Ask in discussions
- Create an issue with reproduction steps
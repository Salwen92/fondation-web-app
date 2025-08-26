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
cp apps/web/.env.example apps/web/.env
# Edit .env with your configuration
```

## Monorepo Structure

```
fondation/
├── apps/
│   ├── web/          # Next.js web application
│   └── worker/       # Job processing worker
├── packages/
│   └── shared/       # Shared types and utilities
└── docs/             # Documentation
```

## Development Commands

### Running Applications

```bash
# Run all apps in development mode
bun dev

# Run specific apps
bun dev:web      # Web app only
bun dev:worker   # Worker only

# Build all apps
bun build

# Type checking
bun typecheck

# Linting
bun lint

# Format code
bun format:write
```

### Working with Workspaces

```bash
# Run command in specific workspace
bun run --filter web dev
bun run --filter worker build
bun run --filter @fondation/shared typecheck

# Add dependency to specific workspace
cd apps/web && bun add react-query
cd apps/worker && bun add bullmq
```

## Development Workflow

### 1. Web Application (apps/web)

```bash
# Start development server
cd apps/web
bun dev

# Access at http://localhost:3000
```

#### Key Technologies:
- Next.js 15
- Convex for database
- NextAuth for authentication
- Tailwind CSS

### 2. Worker (apps/worker)

```bash
# Start worker in development
cd apps/worker
bun dev

# Or with Docker
docker build -f apps/worker/Dockerfile -t fondation-worker .
docker run -e CONVEX_URL=... fondation-worker
```

#### Key Technologies:
- Node.js
- Convex client
- Claude CLI integration

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

# Run tests for specific app
bun run --filter web test
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

### Web App (apps/web/.env)
```bash
CONVEX_URL=
NEXT_PUBLIC_CONVEX_URL=
NEXTAUTH_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

### Worker (apps/worker/.env)
```bash
CONVEX_URL=
POLL_INTERVAL=5000
MAX_CONCURRENT_JOBS=1
```

## Docker Development

### Building Images
```bash
# Build worker image
docker build -f apps/worker/Dockerfile -t fondation-worker .

# Build web app image (when available)
docker build -f apps/web/Dockerfile -t fondation-web .
```

### Docker Compose
```bash
# Start all services
docker-compose up

# Start specific service
docker-compose up worker
```

## Troubleshooting

### Bun workspace issues
```bash
# Clear cache and reinstall
rm -rf node_modules bun.lockb
bun install
```

### TypeScript errors in shared package
```bash
# Rebuild shared package
cd packages/shared
bun typecheck
```

### Port conflicts
- Web app uses port 3000
- Worker health server uses port 8080
- Adjust in `.env` if needed

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
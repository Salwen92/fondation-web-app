# Fondation

AI-powered documentation generation platform that analyzes GitHub repositories and creates comprehensive course materials using Claude AI.

## 🚀 Quick Start

```bash
# Install dependencies (from monorepo root)
cd fondation
bun install

# Start development environment
cd apps/web
bun run dev

# Start worker (separate terminal)
cd apps/worker
bun run dev
```

## 📋 Prerequisites

- **Bun** (latest version)
- **Node.js** (v18+)
- **Git**
- **GitHub Account** (for OAuth)
- **Claude CLI** (authenticated locally)

## 🏗️ Architecture

Vendor-agnostic monorepo architecture with persistent worker polling:

```
USER → NEXT.JS → CONVEX ← WORKER (polls for jobs)
         ↓         ↑
      Real-time updates
```

### Components

- **Frontend** (`apps/web`): Next.js 15 with TypeScript, Tailwind CSS
- **Worker** (`apps/worker`): Persistent Node.js process polling Convex
- **Backend**: Convex real-time database and job queue
- **Shared** (`packages/shared`): Common types and schemas

## 📁 Project Structure

```
fondation/                          # Monorepo root
├── apps/
│   ├── web/                       # Next.js web application
│   │   ├── src/                   # Application source
│   │   ├── convex/                # Database functions
│   │   └── package.json
│   └── worker/                    # Job processing worker
│       ├── src/                   # Worker source
│       ├── Dockerfile             # Production container
│       └── package.json
├── packages/
│   └── shared/                    # Shared types & schemas
├── docs/                          # Documentation
│   ├── ARCHITECTURE.md           # System design
│   ├── OPERATIONS.md             # Ops runbook
│   └── SECURITY.md               # Security guide
└── package.json                   # Workspace config
```

## 🔧 Configuration

### Web App Environment (`apps/web/.env.local`)

```env
# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_DEPLOYMENT=your-deployment

# GitHub OAuth (via NextAuth)
AUTH_SECRET=your-auth-secret
AUTH_GITHUB_ID=your-github-client-id  
AUTH_GITHUB_SECRET=your-github-client-secret
```

### Worker Environment (`apps/worker/.env`)

```env
# Convex connection
CONVEX_URL=https://your-deployment.convex.cloud

# Worker config
POLL_INTERVAL=5000
MAX_CONCURRENT_JOBS=1
WORKER_ID=worker-1
```

## 🚀 Development

### Running Locally

```bash
# Terminal 1: Database & Backend
cd fondation/apps/web
bunx convex dev

# Terminal 2: Web Application
cd fondation/apps/web
bun run dev

# Terminal 3: Worker (requires Claude CLI auth)
cd fondation/apps/worker
bun run dev
```

### Code Quality

```bash
# From monorepo root
bun run typecheck    # Type checking
bun run lint         # Linting
bun run format       # Code formatting
```

## 🐳 Production Deployment

### Worker Deployment (Docker)

```bash
# Build worker image
cd fondation/apps/worker
docker build -t fondation-worker .

# First run: Authenticate Claude CLI
docker run -it -v /srv/claude-creds:/home/worker/.claude fondation-worker claude login

# Production: Run with mounted credentials
docker run -d \
  -v /srv/claude-creds:/home/worker/.claude:ro \
  --env-file .env \
  --restart unless-stopped \
  fondation-worker
```

### Web App Deployment

Deploy the web app to Vercel or any Next.js hosting platform:

```bash
cd fondation/apps/web
vercel deploy
```

## 📚 Documentation

- [Architecture Overview](./fondation/docs/ARCHITECTURE.md) - System design and components
- [Operations Guide](./fondation/docs/OPERATIONS.md) - Deployment and maintenance
- [Security Guide](./fondation/docs/SECURITY.md) - Security considerations
- [Migration Guide](./docs/MIGRATION.md) - Migration from old architecture

## 🤝 Contributing

See [CONTRIBUTING.md](./fondation/CONTRIBUTING.md) for development guidelines.

## 📄 License

MIT License - See LICENSE file for details
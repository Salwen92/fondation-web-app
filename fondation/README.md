# Fondation

AI-powered course documentation generator for GitHub repositories.

## Overview

Fondation transforms GitHub repositories into structured educational content using Claude AI. The system is designed to be vendor-agnostic and production-ready, with a simple architecture that can be deployed anywhere Docker runs.

## Quick Start

### Prerequisites
- Node.js 20+
- Bun 1.0+
- Docker & Docker Compose
- Convex account
- GitHub OAuth app

### Development Setup

```bash
# Clone repository
git clone https://github.com/your-org/fondation.git
cd fondation

# Install dependencies
bun install

# Configure environment
cp packages/web/.env.example packages/web/.env
# Edit .env with your configuration

# Start development
bun dev
```

### Production Deployment

See [OPERATIONS.md](docs/OPERATIONS.md) for detailed deployment instructions.

```bash
# Build Docker image
docker build -f packages/worker/Dockerfile -t fondation-worker .

# Deploy to any VPS or cloud provider
ssh your-server
curl -fsSL https://raw.githubusercontent.com/your-org/fondation/main/deploy/vps-setup.sh | bash
```

## Architecture

Vendor-agnostic, production-ready design:

```
Web App (Next.js) → Convex DB (Queue) ← Worker (Docker) → Claude CLI
```

### Key Features
- **No vendor lock-in**: Deploy anywhere Docker runs
- **Atomic job claiming**: Prevents race conditions at scale
- **Lease-based locking**: Handles worker failures gracefully  
- **Exponential backoff**: Smart retry logic (5s-10min)
- **Database indexing**: Optimized for high-throughput
- **Security hardened**: Non-root Docker, disabled auto-updates

- **No vendor lock-in**: Worker runs on any Docker host
- **No cold starts**: Always-on worker process
- **Simple scaling**: Add more workers as needed

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.

## Project Structure

```
fondation/
├── packages/
│   ├── web/          # Next.js web application
│   ├── worker/       # Job processing worker
│   ├── cli/          # Fondation CLI (code analyzer)
│   └── shared/       # Shared types and utilities
├── docs/             # Documentation
└── deploy/           # Deployment scripts
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - System design and components
- [Operations](docs/OPERATIONS.md) - Deployment and management
- [Runbook](docs/RUNBOOK.md) - Incident response procedures
- [Security](docs/SECURITY.md) - Security measures and practices
- [Migration](docs/MIGRATION.md) - Migration from legacy architecture
- [Contributing](CONTRIBUTING.md) - Development guidelines

## Key Features

- 📚 Generate comprehensive course documentation from code
- 🔄 Real-time processing updates
- 🔐 Secure GitHub integration
- 🤖 Claude AI-powered analysis
- 📊 Job queue with automatic retries
- 🐳 Docker-based deployment
- 💰 Cost-effective (~$4-10/month)

## Environment Variables

### Web Application
```bash
CONVEX_URL=https://your-deployment.convex.cloud
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
NEXTAUTH_SECRET=your-secret
GITHUB_CLIENT_ID=your-github-app-id
GITHUB_CLIENT_SECRET=your-github-app-secret
```

### Worker
```bash
CONVEX_URL=https://your-deployment.convex.cloud
WORKER_ID=worker-1
POLL_INTERVAL=5000
MAX_CONCURRENT_JOBS=1
```

Note: Claude CLI uses interactive authentication, not API keys.

## Commands

```bash
# Development
bun dev           # Start all apps
bun dev:web       # Web app only
bun dev:worker    # Worker only

# Production
bun build         # Build all apps
bun typecheck     # Type checking
bun lint          # Linting
bun format:write  # Format code
```

## Support

- Issues: [GitHub Issues](https://github.com/your-org/fondation/issues)
- Security: security@company.com
- Docs: [Documentation](docs/)

## License

[MIT](LICENSE)
# Fondation Documentation

## Overview

Fondation is an AI-powered documentation generation platform that automatically creates comprehensive documentation for GitHub repositories using Claude AI. Built as a vendor-agnostic monorepo with Next.js 15, Convex, and a persistent worker architecture.

## Documentation Index

### Core Documentation
- [API Documentation](./API.md) - REST API endpoints and interfaces
- [Authentication Guide](./AUTHENTICATION.md) - OAuth and session management
- [Convex Database Schema](./CONVEX-SCHEMA.md) - Database structure and types

### Development Guides
- [Developer Setup](./SETUP.md) - Local development environment setup
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues and solutions
- [CLI Integration Guide](./cli-integration-guide.md) - Claude CLI integration

### Migration & History
- [Migration Completed](./MIGRATION_COMPLETED.md) - Vendor-agnostic architecture migration
- [Queue Systems Comparison](./QUEUE_SYSTEMS_COMPARISON.md) - Analysis of queue implementations

### Audit Reports
- [Audit Report](./audit-report/) - Code quality and architecture analysis
- [Audit Proposals](./audit-report-proposal-b/) - Enhancement proposals

## System Architecture

The system uses a simple, vendor-agnostic architecture:

```
USER → NEXT.JS → CONVEX ← WORKER (polls for jobs)
         ↓         ↑
      Real-time updates
```

### Key Components

1. **Web Application** (`fondation/apps/web/`)
   - Next.js 15 with App Router
   - React 19 with Server Components
   - Tailwind CSS for styling
   - Real-time updates via Convex

2. **Worker Process** (`fondation/apps/worker/`)
   - Persistent Node.js process
   - Polls Convex for pending jobs
   - Executes Claude CLI for analysis
   - Docker containerized for production

3. **Shared Types** (`fondation/packages/shared/`)
   - TypeScript type definitions
   - Zod schemas for validation
   - Shared between web and worker

4. **Database & Queue** (Convex)
   - Real-time database
   - Job queue with atomic claiming
   - Lease-based job management
   - Automatic retry with backoff

## Tech Stack

### Frontend
- **Next.js 15.2.3**: React framework with App Router
- **React 19**: Latest React with Server Components
- **TypeScript 5.8**: Type-safe development
- **Tailwind CSS 4.0**: Utility-first CSS
- **shadcn/ui**: High-quality UI components

### Backend & Database
- **Convex 1.25**: Real-time backend platform
- **NextAuth.js 5.0**: Authentication solution
- **Octokit 22.0**: GitHub API client

### Infrastructure
- **Docker**: Container runtime
- **Bun**: JavaScript runtime and package manager
- **Claude CLI**: AI documentation generation

## Key Features

### 🔐 Authentication
- GitHub OAuth 2.0 integration
- Secure session management
- Encrypted token storage

### 📚 Repository Management
- Fetch repositories from GitHub
- Cache repository metadata
- Real-time status updates

### 💼 Job Processing
- Persistent worker polling
- Atomic job claiming
- Automatic retry logic
- Lease-based recovery

### 🎨 User Interface
- Modern design with shadcn/ui
- Responsive layout
- Real-time notifications
- Progress tracking

## Performance Characteristics

| Metric | Target | Status |
|--------|--------|--------|
| Job pickup latency | < 5s | ✅ |
| Small repo analysis | 2-5 min | ✅ |
| Large repo analysis | 10-30 min | ✅ |
| Bundle size | < 200KB | ✅ |
| Type coverage | 100% | ✅ |

## Security Model

- **Authentication**: GitHub OAuth only
- **Secrets**: Encrypted in Convex
- **Worker**: Non-root Docker container
- **Network**: Outbound connections only
- **Claude**: Manual CLI authentication

## Deployment

### Production Setup
- **Web App**: Deployed to Vercel
- **Worker**: Docker container on any Linux host
- **Database**: Convex cloud service

### Scaling Strategy
- **Vertical**: Increase worker resources
- **Horizontal**: Deploy multiple workers
- **Queue**: Automatic load distribution

## Development Workflow

1. **Setup Environment**
   ```bash
   cd fondation
   bun install
   ```

2. **Start Services**
   ```bash
   # Terminal 1: Convex
   cd apps/web && bunx convex dev
   
   # Terminal 2: Web app
   cd apps/web && bun run dev
   
   # Terminal 3: Worker
   cd apps/worker && bun run dev
   ```

3. **Code Quality**
   ```bash
   bun run typecheck
   bun run lint
   bun run format
   ```

## Support

For issues and questions:
- GitHub Issues: [Repository Issues]
- Documentation: This docs folder
- Contributing: See [CONTRIBUTING.md](../fondation/CONTRIBUTING.md)
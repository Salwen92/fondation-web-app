# Fondation - AI-Powered Documentation Generator 🎓

<div align="center">

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev/)
[![Convex](https://img.shields.io/badge/Convex-Latest-f97316?logo=convex)](https://convex.dev/)
[![Claude](https://img.shields.io/badge/Claude-AI-purple?logo=anthropic)](https://claude.ai/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ed?logo=docker)](https://www.docker.com/)
[![Bun](https://img.shields.io/badge/Bun-1.2+-black?logo=bun)](https://bun.sh/)

**Transform any GitHub repository into comprehensive, AI-generated educational content in minutes.**

[Getting Started](docs/GETTING_STARTED.md) • [Documentation](docs/) • [Demo](#demo) • [Contributing](#contributing)

</div>

## ✨ Features

### 🤖 AI-Powered Analysis
- **6-Step Deep Analysis**: Extracts abstractions, analyzes relationships, determines learning order
- **Claude AI Integration**: Uses Anthropic's Claude for intelligent content generation
- **OAuth Authentication**: No API keys needed - uses secure OAuth flow

### 🚀 Real-Time Processing
- **Live Progress Updates**: WebSocket-based real-time status tracking with French UI
- **Atomic Job Queue**: Prevents duplicate work with lease-based claiming
- **Smart Retries**: Exponential backoff (5s → 10min) for resilient processing
- **French Localization**: User interface in French (Étape 1 sur 6, etc.)

### 📚 Comprehensive Output
- **Structured Courses**: Organized chapters with clear learning progression
- **Interactive Tutorials**: Hands-on exercises for practical learning
- **Beautiful Rendering**: Markdown with syntax highlighting and diagrams

### 🛠️ Production Ready
- **Docker Deployment**: Consistent execution environment
- **Horizontal Scaling**: Add workers as needed
- **Health Monitoring**: Built-in health checks and logging
- **TypeScript Throughout**: Full type safety across all packages

## 🏗️ Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 15, React 19, TypeScript | Modern web UI with App Router |
| **Styling** | Tailwind CSS, Radix UI, shadcn/ui | Beautiful, accessible components |
| **Database** | Convex | Real-time data sync & serverless functions |
| **Backend** | Bun Worker Service + CLI | Job processing & AI analysis |
| **AI Engine** | Claude SDK (@anthropic-ai/claude-code) | Content generation and analysis |
| **Auth** | NextAuth.js + GitHub OAuth | Secure user authentication |
| **Secrets** | Doppler | Production secret management |
| **Infrastructure** | Docker + Bun Workspace | Containerization & monorepo |
| **Code Quality** | Biome, TypeScript 5.8 | Linting and type checking |
| **CI/CD** | Docker multi-stage builds | Production deployment |

## 🚀 Quick Start

Get up and running in 5 minutes:

### Option A: With Doppler (Recommended for Teams)
```bash
# 1. Clone and setup
git clone <your-repo-url>
cd fondation-web-app/fondation && bun install

# 2. Configure Doppler for secrets management
doppler login
doppler setup  # Select: fondation → dev_local

# 3. Start all services (secrets auto-injected)
bun run dev

# 4. Open browser
open http://localhost:3000
```

### Option B: Traditional Setup (.env files)
```bash
# 1. Clone and setup
git clone <your-repo-url>
cd fondation-web-app/fondation && bun install

# 2. Configure environment
# Create .env.local files in packages/web/ and other packages as needed
# Add required environment variables (see documentation)

# 3. Start development
bun run dev:nodoppler

# 4. Open browser
open http://localhost:3000
```

See [Getting Started Guide](docs/GETTING_STARTED.md) or [Doppler Setup](docs/DOPPLER_SETUP_GUIDE.md) for detailed instructions.

## 📖 Documentation

### Core Guides
- 📘 [**Getting Started**](docs/GETTING_STARTED.md) - 5-minute setup guide
- 🏗️ [**Architecture Overview**](docs/ARCHITECTURE.md) - System design and data flow
- 💻 [**Development Guide**](docs/DEVELOPMENT.md) - Development workflow and best practices
- 🚀 [**Production Deployment**](docs/PRODUCTION_DEPLOYMENT.md) - Secure production deployment with Doppler
- 🔧 [**Troubleshooting**](docs/TROUBLESHOOTING.md) - Common issues and solutions
- 📡 [**API Reference**](docs/API.md) - Complete API documentation

### Additional Resources
- 🔐 [Security Guide](docs/SECURITY.md) - Security best practices and OAuth setup
- 🐳 [Docker Build Guide](docs/DOCKER_BUILD_GUIDE.md) - Container build and authentication
- 🔧 [Claude Integration](docs/CLAUDE_INTEGRATION.md) - AI integration and configuration
- 📊 [Configuration Audit](docs/CONFIGURATION_AUDIT.md) - Configuration standardization
- 📋 [Commands Reference](docs/COMMANDS.md) - All available scripts explained
- 🔍 [Doppler Setup](docs/DOPPLER_SETUP_GUIDE.md) - Secret management configuration

## 📁 Project Structure

```
fondation/
├── 📊 convex/                      # Real-time database & API layer
│   ├── _generated/                 # Auto-generated types & client
│   ├── docs.ts                     # Document storage functions
│   ├── jobs.ts                     # Job queue management
│   ├── queue.ts                    # Worker queue operations
│   ├── repositories.ts             # Repository data functions
│   └── users.ts                    # User authentication & data
│
├── 📦 packages/                    # Monorepo packages
│   ├── 🌐 web/                    # Next.js 15 frontend application
│   │   ├── src/app/               # App Router pages & API routes
│   │   ├── src/components/        # React components (auth, repos, UI)
│   │   ├── src/lib/               # Utilities (GitHub client, crypto, etc.)
│   │   └── src/server/            # NextAuth configuration
│   │
│   ├── 🤖 worker/                 # Background job processor
│   │   ├── src/cli-strategies/    # CLI execution strategies
│   │   ├── src/progress-handler.ts # Unified progress management
│   │   ├── src/repo-manager.ts    # Git operations & repo handling
│   │   └── src/worker.ts          # Main worker orchestration
│   │
│   ├── 🔧 cli/                    # AI-powered analysis engine
│   │   ├── src/cli/commands/      # CLI command implementations
│   │   ├── src/core/              # Claude AI integration
│   │   ├── src/ui/                # Terminal UI components
│   │   ├── prompts/               # AI analysis prompts (6 steps)
│   │   ├── Dockerfile.production  # Production container
│   │   └── scripts/               # Build & deployment scripts
│   │
│   └── 📚 shared/                 # Shared types & utilities
│       ├── src/convex-interface.ts # Convex client wrapper
│       ├── src/environment-config.ts # Environment configuration
│       └── src/types.ts           # Shared TypeScript types
│
├── 📖 docs/                       # Comprehensive documentation
│   ├── PRODUCTION_DEPLOYMENT.md   # Production setup guide
│   ├── DOCKER_BUILD_GUIDE.md      # Container build instructions
│   ├── ARCHITECTURE.md            # System design overview
│   ├── DEVELOPMENT.md             # Local development guide
│   └── SECURITY.md                # Security best practices
│
├── 🐳 docker-compose.doppler.yml  # Production deployment (Doppler secrets)
├── 🛠️ scripts/                   # Maintenance & deployment scripts
└── 📄 package.json               # Root workspace configuration
```

## 🎯 Architecture Overview

### 🤖 AI-Powered Analysis Pipeline
1. **Extract Abstractions** - Identify core components and patterns
2. **Analyze Relationships** - Map dependencies and interactions  
3. **Determine Order** - Structure optimal learning sequence
4. **Generate Chapters** - Create detailed course content
5. **Review & Enhance** - Refine and improve material
6. **Create Tutorials** - Build interactive exercises

### 🏗️ System Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js Web   │    │  Convex Database │    │  Worker Service │
│   Frontend       │◄──►│  Real-time API   │◄──►│  Job Processor  │
│   (packages/web) │    │  (convex/)       │    │ (packages/worker)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                              ┌─────────────────┐
                                              │   CLI Engine    │
                                              │  Docker Container│
                                              │  (packages/cli) │
                                              └─────────────────┘
```

### 🔄 Real-Time Features
- **Live Progress Updates**: WebSocket-based tracking with French UI localization
- **Atomic Job Queue**: Prevents duplicate work with lease-based claiming
- **Smart Retries**: Exponential backoff (5s → 10min) for resilient processing
- **Horizontal Scaling**: Multiple workers can process jobs simultaneously

### 🔐 Security Architecture
- **OAuth-Only Authentication**: GitHub OAuth with NextAuth.js
- **Doppler Secret Management**: Production secrets via encrypted tokens
- **Container Isolation**: CLI execution in sandboxed Docker environment
- **Token Encryption**: AES-256 encryption for sensitive data storage
- **CSRF Protection**: Built-in security headers and validation

## 🧪 Development

### Available Scripts

```bash
# Development (with Doppler)
bun run dev              # Start all services (web + convex + worker)
bun run dev:web         # Start Next.js frontend only
bun run dev:worker      # Start worker service only
bun run dev:convex      # Start Convex database only
bun run dev:cli         # Start CLI in development mode

# Development (without Doppler - fallback)
bun run dev:nodoppler   # Traditional .env file approach

# Building & Type Checking
bun run build           # Build all packages
bun run build:cli       # Build CLI package only
bun run build:worker    # Build worker package only
bun run typecheck       # TypeScript checking across all packages
bun run lint            # Biome linting
bun run check           # Full quality check (lint + format + types)

# Docker Production
bun run docker:build   # Build production Docker image
bun run docker:deploy  # Deploy with Doppler secrets
bun run docker:test    # Test Docker authentication

# Testing & Quality
bun run test            # Run all tests
bun run e2e             # End-to-end tests

# Utilities
bun run clean           # Clean build artifacts
bun run setup           # Initial project setup
bun run reset           # Full reset (clean + install + build)
```

See [Development Guide](docs/DEVELOPMENT.md) for complete workflow documentation.

## 🐳 Docker Deployment

### Production Deployment with Doppler

```bash
# Build production image
docker build -f packages/cli/Dockerfile.production -t fondation/cli:latest .

# Generate Doppler token
DOPPLER_TOKEN_WORKER=$(doppler configs tokens create deployment-$(date +%Y%m%d) \
  --project fondation --config prd --plain)

# Deploy using secure docker-compose
DOPPLER_TOKEN_WORKER="$DOPPLER_TOKEN_WORKER" \
  docker-compose -f docker-compose.doppler.yml up -d
```

**📚 Complete Guides:**
- [Production Deployment](docs/PRODUCTION_DEPLOYMENT.md) - Full production setup guide
- [Docker Build Guide](docs/DOCKER_BUILD_GUIDE.md) - Detailed build instructions

## 📊 Performance

| Metric | Value |
|--------|-------|
| **Job Pickup** | < 5 seconds |
| **Small Repo (< 100 files)** | 2-5 minutes |
| **Medium Repo (100-1000 files)** | 5-15 minutes |
| **Large Repo (1000+ files)** | 15-30 minutes |
| **Success Rate** | 95%+ |
| **CLI Bundle Size** | ~4.2MB (production) |
| **Docker Image Size** | ~649MB |
| **Memory Usage** | 500MB-2GB (depending on repo size) |
| **Progress Updates** | Real-time (< 1s latency) |

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create your feature branch
3. Follow our code style (Biome)
4. Write tests for new features
5. Submit a pull request

## 📄 License

Copyright © 2025 Fondation. All Rights Reserved.

This is proprietary software. See [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Anthropic](https://anthropic.com) for Claude AI
- [Convex](https://convex.dev) for real-time database
- [Vercel](https://vercel.com) for Next.js and hosting
- All our contributors and users

## 🔗 Quick Links

- 📖 [Documentation](docs/) - Complete project documentation
- 🚀 [Production Setup](docs/PRODUCTION_DEPLOYMENT.md) - Deployment guide
- 🐳 [Docker Guide](docs/DOCKER_BUILD_GUIDE.md) - Container setup
- 🔧 [Development](docs/DEVELOPMENT.md) - Local development setup
- 📋 [Changelog](CHANGELOG.md) - Version history and updates

---

<div align="center">

**Built with ❤️ using modern web technologies**

*AI-Powered Documentation Generation • Real-time Processing • Secure by Design*

</div>
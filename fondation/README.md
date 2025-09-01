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
| **Styling** | Tailwind CSS, Radix UI | Beautiful, accessible components |
| **Database** | Convex | Real-time data synchronization |
| **Backend** | Bun Worker Service | Job processing and orchestration |
| **AI Engine** | Claude SDK (Anthropic) | Content generation and analysis |
| **Auth** | NextAuth + GitHub OAuth | Secure user authentication |
| **Infrastructure** | Docker, Bun Workspace | Containerization and package management |
| **Code Quality** | Biome, TypeScript | Linting and type checking |

## 🚀 Quick Start

Get up and running in 5 minutes:

```bash
# 1. Clone the repository
git clone https://github.com/your-org/fondation.git
cd fondation

# 2. Install and build
bun run setup

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local with your GitHub OAuth credentials

# 4. Start development
bun run dev

# 5. Open browser
open http://localhost:3000
```

See [Getting Started Guide](docs/GETTING_STARTED.md) for detailed setup instructions.

## 📖 Documentation

### Core Guides
- 📘 [**Getting Started**](docs/GETTING_STARTED.md) - 5-minute setup guide
- 🏗️ [**Architecture Overview**](docs/ARCHITECTURE.md) - System design and data flow
- 💻 [**Development Guide**](docs/DEVELOPMENT.md) - Development workflow and best practices
- 🚀 [**Deployment Guide**](docs/DEPLOYMENT.md) - Production deployment instructions
- 🔧 [**Troubleshooting**](docs/TROUBLESHOOTING.md) - Common issues and solutions
- 📡 [**API Reference**](docs/API.md) - Complete API documentation

### Additional Resources
- 🔐 [Security Guide](docs/SECURITY.md) - Security best practices
- 📊 [Configuration Audit](docs/CONFIGURATION_AUDIT.md) - Configuration standardization
- 📋 [Commands Reference](COMMANDS.md) - All available scripts explained

## 📁 Project Structure

```
fondation/
├── convex/                 # Database functions (shared)
├── packages/
│   ├── web/               # Next.js frontend
│   ├── worker/            # Job processor service
│   ├── cli/               # AI analyzer (Docker)
│   └── shared/            # Shared types & utils
├── docs/                  # Documentation
└── package.json          # Root orchestration
```

## 🎯 Key Features in Detail

### Intelligent Analysis Pipeline
1. **Extract Abstractions** - Identify core components and patterns
2. **Analyze Relationships** - Map dependencies and interactions
3. **Determine Order** - Structure optimal learning sequence
4. **Generate Chapters** - Create detailed course content
5. **Review & Enhance** - Refine and improve material
6. **Create Tutorials** - Build interactive exercises

### Real-Time Architecture
- **WebSocket Updates**: Live progress tracking
- **Atomic Operations**: Prevent race conditions
- **Lease-Based Claims**: Handle worker failures gracefully
- **Auto-Scaling**: Database scales automatically with load

### Security First
- **OAuth Only**: No API keys in code
- **Encrypted Tokens**: Secure credential storage
- **Docker Isolation**: Sandboxed execution
- **CSRF Protection**: Built-in security headers

## 🧪 Development

### Available Scripts

```bash
# Development
bun run dev              # Start all services
bun run dev:web         # Start web only
bun run dev:worker      # Start worker only

# Building
bun run build           # Build all packages
bun run typecheck       # Check TypeScript
bun run lint            # Run linting

# Testing
bun run test            # Run tests
bun run e2e             # E2E tests

# Utilities
bun run clean           # Clean build artifacts
bun run setup           # Initial setup
```

See [Development Guide](docs/DEVELOPMENT.md) for complete workflow documentation.

## 🐳 Docker Deployment

### Build and Deploy

```bash
# Build CLI image from monorepo root
bun run build:docker

# Authenticate with Claude (using bunx in Bun image)
docker run -it fondation/cli:latest bunx claude auth

# Deploy worker
docker run -d \
  --name fondation-worker \
  -e CONVEX_URL=your-convex-url \
  fondation/cli:authenticated
```

See [Deployment Guide](docs/DEPLOYMENT.md) for production deployment.

## 📊 Performance

| Metric | Value |
|--------|-------|
| **Job Pickup** | < 5 seconds |
| **Small Repo** | 2-5 minutes |
| **Large Repo** | 10-30 minutes |
| **Success Rate** | 95%+ |
| **Bundle Size** | ~476KB (CLI) |
| **Memory Usage** | 500MB-1.5GB |

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create your feature branch
3. Follow our code style (Biome)
4. Write tests for new features
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Anthropic](https://anthropic.com) for Claude AI
- [Convex](https://convex.dev) for real-time database
- [Vercel](https://vercel.com) for Next.js and hosting
- All our contributors and users

## 🔗 Links

- [Documentation](docs/)
- [Issue Tracker](https://github.com/your-org/fondation/issues)
- [Discussions](https://github.com/your-org/fondation/discussions)
- [Changelog](CHANGELOG.md)

---

<div align="center">

**Built with ❤️ by the Fondation Team**

[Website](https://fondation.dev) • [Twitter](https://twitter.com/fondation) • [Discord](https://discord.gg/fondation)

</div>
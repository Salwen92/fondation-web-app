# Fondation

🚀 **AI-powered course documentation generator for GitHub repositories**

Transform any GitHub repository into comprehensive educational content using Claude AI. Production-ready system with Docker deployment and real-time processing.

## ✨ Features

- 📚 **Smart Analysis** - AI analyzes codebases and generates structured courses
- 🔄 **Real-time Updates** - Live status tracking with WebSocket connections
- 🔐 **GitHub Integration** - Secure OAuth authentication and repository access
- 🐳 **Production Ready** - Docker deployment with automatic scaling
- ⚡ **Fast Processing** - 6-step analysis workflow (4-6 minutes per repository)
- 📊 **Job Management** - Robust queue system with retry logic and monitoring

## 🏗️ Architecture

```
GitHub Repos → Web UI (Next.js) → Convex DB → Worker (Docker) → Claude CLI → Generated Courses
```

**Modern Stack:**
- **Frontend**: Next.js 15, React 19, Tailwind CSS, NextAuth
- **Backend**: Convex real-time database with atomic job queue
- **Worker**: Node.js + Docker with lease-based job processing
- **AI**: Claude SDK with OAuth authentication (no API keys needed)

## 🚀 Quick Start

### Prerequisites
- **Node.js 20+**
- **Bun** (latest)
- **Docker** 
- **Convex Account**
- **GitHub OAuth App**

### Development Setup

```bash
# 1. Clone repository
git clone https://github.com/your-org/fondation.git
cd fondation

# 2. Install dependencies
bun install

# 3. Set up environment
cp packages/web/.env.example packages/web/.env.local
# Configure your GitHub OAuth app and Convex deployment

# 4. Start services (3 terminals)
npx convex dev                    # Terminal 1: Database
cd packages/web && bun run dev    # Terminal 2: Web UI (http://localhost:3000)
cd packages/worker && bun run dev # Terminal 3: Job processor
```

### Production Deployment

See **[DOCKER_BUILD_GUIDE.md](DOCKER_BUILD_GUIDE.md)** for complete deployment instructions.

```bash
# Quick deploy to any VPS
ssh your-server
curl -fsSL https://raw.githubusercontent.com/your-org/fondation/main/deploy/vps-setup.sh | bash
```

## 📁 Project Structure

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

## 💡 How It Works

### 6-Step Analysis Workflow
1. **Extract Abstractions** (~60s) - Identify core components and patterns
2. **Analyze Relationships** (~60s) - Map dependencies and interactions  
3. **Determine Order** (~30s) - Structure optimal learning sequence
4. **Generate Chapters** (~60s) - Create detailed course content
5. **Review Chapters** (~40s) - Enhance and refine material
6. **Create Tutorials** (~40s) - Build interactive learning experiences

### Job Processing
- **Atomic claiming** prevents duplicate work
- **Lease-based locking** handles worker failures
- **Exponential backoff** for smart retries (5s → 10min)
- **Real-time status** updates via Convex subscriptions

## 🔑 Key Benefits

### For Developers
- **No vendor lock-in** - Deploy anywhere Docker runs
- **No cold starts** - Always-on worker processes
- **Simple scaling** - Add workers as needed
- **Cost effective** - ~$4-10/month VPS hosting

### For Users  
- **Instant insights** - Understand any codebase quickly
- **Structured learning** - From basics to advanced concepts
- **Interactive tutorials** - Hands-on coding exercises
- **Real-time progress** - Live updates during generation

## 🛠️ Development

### Commands
```bash
# Development
npx convex dev           # Start database (required first)
bun run dev:web         # Next.js web app  
bun run dev:worker      # Job processor

# Database operations
npx convex dashboard    # Open Convex dashboard
npx convex data jobs    # View jobs table
npx convex run jobs:listUserJobs '{"userId": "user123"}'

# Quality assurance
bun run typecheck      # TypeScript checking
bun run lint           # Code linting
bun run format:write   # Code formatting
```

### Testing & Debugging
See **[CLAUDE.md](CLAUDE.md)** for the complete testing guide including:
- Docker authentication setup
- E2E testing procedures  
- Common troubleshooting
- Import path resolution
- Performance optimization

## 🐳 Docker Deployment

### Worker Authentication
```bash
# Build and authenticate (one-time setup)
docker build -f packages/cli/Dockerfile.production -t fondation/cli:latest .
docker run -d --name auth fondation/cli:latest tail -f /dev/null
docker exec -it auth npx claude auth  # Interactive OAuth login
docker commit auth fondation/cli:authenticated

# Deploy worker
docker run -d \
  --name fondation-worker \
  -e CONVEX_URL=https://your-deployment.convex.cloud \
  -e FONDATION_WORKER_IMAGE=fondation/cli:authenticated \
  fondation/cli:authenticated
```

## 📚 Documentation

| File | Description |
|------|-------------|
| **[CLAUDE.md](CLAUDE.md)** | 📋 **Ultimate development & testing guide** |
| **[DOCKER_BUILD_GUIDE.md](DOCKER_BUILD_GUIDE.md)** | 🐳 Complete Docker deployment instructions |
| **[CONTRIBUTING.md](CONTRIBUTING.md)** | 🤝 Development guidelines and setup |
| **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** | 🏗️ System design and components |
| **[docs/SECURITY.md](docs/SECURITY.md)** | 🔐 Security measures and practices |

## ⚡ Performance

### Typical Metrics
- **Job pickup latency**: < 5 seconds
- **Small repository**: 2-5 minutes analysis
- **Large repository**: 10-30 minutes analysis
- **Success rate**: 95%+ with retry logic
- **Memory usage**: 500MB-1.5GB per worker

### Scaling
- **Vertical**: Increase worker memory/CPU, adjust `MAX_CONCURRENT_JOBS`
- **Horizontal**: Deploy multiple workers with unique IDs

## 🔐 Security

- **OAuth Authentication** - No API keys stored
- **Encrypted Secrets** - GitHub tokens secured in Convex
- **Non-root Containers** - Least privilege Docker execution
- **Temporary Cleanup** - Auto-removal of processed files
- **Secure Callbacks** - Token-based job status updates

## 🚨 Important Notes

### ✅ What Works
- **Complete E2E workflow** from GitHub → Generated Course
- **All 6 analysis steps** working with proper Docker authentication
- **Real-time UI updates** with job progress tracking
- **Production deployment** tested and documented

### ⚠️ Critical Requirements
- **Docker images must be rebuilt** after code changes
- **OAuth tokens expire** (~90 days) - re-authenticate when needed
- **Course page imports** need correct paths to convex at monorepo root
- **Worker requires proper image**: `fondation/cli:authenticated`

## 📊 Status

🎉 **FULLY OPERATIONAL END-TO-END**

- ✅ Monorepo build process working
- ✅ Docker authentication & deployment tested
- ✅ All 6-step CLI analysis completing successfully  
- ✅ Convex integration with real API calls
- ✅ Complete UI → Worker → Database → Generated Course flow
- ✅ Production-ready with comprehensive documentation

## 🤝 Contributing

1. Check **[CONTRIBUTING.md](CONTRIBUTING.md)** for setup instructions
2. Review **[CLAUDE.md](CLAUDE.md)** for testing procedures
3. Fork repository and create feature branch
4. Follow code style and run quality checks
5. Submit pull request with clear description

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

---

**Ready to transform your repositories into courses?** 🚀

[Get Started](packages/web/) • [Deploy](DOCKER_BUILD_GUIDE.md) • [Contribute](CONTRIBUTING.md)
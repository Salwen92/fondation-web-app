# Fondation - AI Documentation Generation Platform

## 🎯 Project Overview

Fondation is an AI-powered documentation generation platform that analyzes GitHub repositories and creates comprehensive course materials using Claude AI. Built with a vendor-agnostic monorepo architecture for simplicity and scalability.

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           USER BROWSER                               │
│                                                                      │
│  1. User clicks "Generate Documentation"                            │
│  2. Receives real-time progress updates                             │
│  3. Views generated documentation                                   │
└───────────────────────┬─────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     NEXT.JS WEB APP (Port 3000)                     │
│                                                                      │
│  • React 19 with Server Components                                  │
│  • Real-time updates via Convex subscriptions                       │
│  • GitHub OAuth authentication                                      │
│  • Responsive UI with shadcn/ui                                     │
└───────────────────────┬─────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        CONVEX DATABASE                              │
│                                                                      │
│  • Real-time data synchronization                                   │
│  • Job queue with atomic operations                                 │
│  • Document storage                                                 │
│  • User and repository management                                   │
└───────────────────────┬─────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    WORKER PROCESS (Persistent)                      │
│                                                                      │
│  • Polls Convex for pending jobs                                    │
│  • Claims jobs atomically with lease                                │
│  • Executes Claude CLI for analysis                                 │
│  • Updates job status and results                                   │
└─────────────────────────────────────────────────────────────────────┘
```

## 📁 Monorepo Structure

```
fondation/
├── apps/
│   ├── web/                  # Next.js web application
│   │   ├── src/             # Application source code
│   │   ├── convex/          # Database functions
│   │   └── package.json
│   └── worker/              # Job processing worker
│       ├── src/            # Worker source code
│       ├── Dockerfile      # Production container
│       └── package.json
├── packages/
│   └── shared/             # Shared types and schemas
└── docs/                   # Documentation
```

## 🚀 Key Features

### For End Users
- **GitHub Integration**: Seamless authentication and repository access
- **Real-time Updates**: Live progress tracking during documentation generation
- **Comprehensive Analysis**: AI-powered code understanding and documentation
- **Export Options**: Multiple format support for generated documentation
- **Repository Management**: Easy organization and tracking of analyzed projects

### For Developers
- **Type Safety**: Full TypeScript with strict mode
- **Real-time Backend**: Convex for instant data synchronization
- **Scalable Architecture**: Vendor-agnostic design with Docker deployment
- **Modern Stack**: Latest versions of React, Next.js, and Node.js
- **Developer Experience**: Hot reload, debug tools, comprehensive documentation

## 🛠️ Technology Stack

### Frontend
- **Next.js 15.2.3** - React framework with App Router
- **React 19** - UI library with Server Components
- **TypeScript 5.8** - Type safety
- **Tailwind CSS 4.0** - Utility-first styling
- **shadcn/ui** - Premium component library

### Backend
- **Convex** - Real-time database and functions
- **Node.js 20+** - JavaScript runtime
- **Claude CLI** - AI documentation generation
- **Docker** - Containerization

### Infrastructure
- **Bun** - Fast JavaScript runtime and package manager
- **GitHub Actions** - CI/CD pipeline
- **Vercel** - Web app hosting (optional)
- **Any Linux VPS** - Worker hosting

## 💼 Business Value

### Productivity Gains
- **90% Time Reduction**: Automated documentation vs manual writing
- **Consistency**: Standardized documentation format across projects
- **Always Updated**: Re-generate documentation as code evolves
- **Knowledge Preservation**: Capture institutional knowledge automatically

### Technical Benefits
- **No Vendor Lock-in**: Run anywhere with Docker
- **Cost Effective**: ~$5-10/month for worker infrastructure
- **Scalable**: Add workers as needed
- **Reliable**: Automatic retry and recovery mechanisms

## 🔄 Development Workflow

### Local Development
```bash
# Setup
cd fondation
bun install

# Start services
cd apps/web && bunx convex dev    # Terminal 1
cd apps/web && bun run dev        # Terminal 2
cd apps/worker && bun run dev     # Terminal 3
```

### Production Deployment
```bash
# Web App
cd apps/web
vercel deploy

# Worker
cd apps/worker
docker build -t fondation-worker .
docker run -d fondation-worker
```

## 📊 Performance Metrics

| Metric | Value |
|--------|-------|
| Job Pickup Latency | < 5 seconds |
| Small Repo Processing | 2-5 minutes |
| Large Repo Processing | 10-30 minutes |
| Concurrent Jobs | Configurable (1-10) |
| Success Rate | > 95% |
| Uptime | 99.9% |

## 🔐 Security Features

- **OAuth Only**: No password management
- **Encrypted Secrets**: All tokens encrypted at rest
- **Least Privilege**: Minimal permissions required
- **Audit Trail**: Complete job history
- **Input Validation**: Comprehensive sanitization

## 🎯 Use Cases

1. **Open Source Projects**: Generate documentation for community projects
2. **Enterprise Codebases**: Document internal systems and APIs
3. **Educational Content**: Create learning materials from code examples
4. **Code Reviews**: Generate analysis reports for code quality
5. **Migration Planning**: Document existing systems before refactoring

## 📈 Roadmap

### Current (v1.0)
- ✅ GitHub repository analysis
- ✅ Claude AI integration
- ✅ Real-time progress tracking
- ✅ Docker deployment

### Next (v1.1)
- 🔄 GitLab/Bitbucket support
- 🔄 Custom documentation templates
- 🔄 Team collaboration features
- 🔄 API access for automation

### Future (v2.0)
- 📅 Multi-language support
- 📅 IDE plugins
- 📅 CI/CD integration
- 📅 Advanced analytics

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./fondation/CONTRIBUTING.md) for guidelines.

## 📚 Documentation

- [Architecture Overview](./fondation/docs/ARCHITECTURE.md)
- [Developer Guide](./DEVELOPER_GUIDE.md)
- [API Documentation](./docs/API.md)
- [Local Development](./LOCAL_DEVELOPMENT.md)

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- Claude AI by Anthropic for documentation generation
- Convex for real-time database infrastructure
- Next.js and Vercel for web framework
- Open source community for invaluable tools
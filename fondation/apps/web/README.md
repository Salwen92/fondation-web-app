# Fondation Web App

AI-powered documentation generation platform that analyzes GitHub repositories and creates comprehensive course materials using Claude AI.

## 🚀 Quick Start

```bash
# Install dependencies
bun install

# Start all services
./start-dev.sh

# Or start services individually:
bunx convex dev        # Backend
bun run dev           # Frontend (http://localhost:3000)
cd scaleway-gateway && bun run dev  # Gateway (http://localhost:8081)
```

## 📋 Prerequisites

- **Bun** (latest version)
- **Node.js** (v18+)
- **Git**
- **GitHub Account** (for OAuth)
- **Anthropic API Key** (for Claude AI)

## 🏗️ Architecture

```
USER → NEXT.JS → CONVEX → SCALEWAY GATEWAY → SCALEWAY WORKER
   ↑                ↑                              ↓
   └────────────────┴──────── CALLBACKS ──────────┘
```

### Components

- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS
- **Backend**: Convex real-time database
- **Gateway**: Express.js API gateway
- **Worker**: Node.js job processor with Fondation CLI

## 🔧 Configuration

### Environment Variables

Create `.env.local`:

```env
# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_DEPLOYMENT=your-deployment

# GitHub OAuth (via NextAuth)
AUTH_SECRET=your-auth-secret
AUTH_GITHUB_ID=your-github-client-id
AUTH_GITHUB_SECRET=your-github-client-secret

# Scaleway Gateway
SCALEWAY_GATEWAY_URL=http://localhost:8081

# Worker (for production Docker build)
ANTHROPIC_API_KEY=sk-ant-your-key
```

## 📦 Project Structure

```
fondation-web-app/
├── src/                    # Next.js application
│   ├── app/               # App router pages
│   ├── components/        # React components
│   └── lib/              # Utilities
├── convex/                # Backend functions
│   ├── jobs.ts           # Job management
│   ├── repositories.ts   # GitHub repos
│   └── docs.ts           # Document storage
├── scaleway-gateway/      # API gateway
│   └── server-gateway.ts # Request routing
├── scaleway-worker/       # Job processor
│   └── worker.js         # Fondation CLI integration
└── public/               # Static assets
```

## 🚀 Development

### Code Quality

```bash
# Run type checks
bun run typecheck

# Run linter
bun run lint

# Run both
bun run check

# Format code
bun run format:write
```

### Testing

```bash
# Run E2E test
1. Start all services: ./start-dev.sh
2. Navigate to http://localhost:3000
3. Login with GitHub
4. Select a repository
5. Click "Générer le cours"
6. Monitor progress
7. View generated documentation
```

## 🔐 Authentication

The app uses GitHub OAuth for authentication:

1. User clicks login
2. Redirected to GitHub OAuth
3. GitHub returns with token
4. Session created via NextAuth
5. User synced with Convex

## 🎯 Features

- **Repository Analysis**: Analyzes any GitHub repository
- **AI Documentation**: Generates comprehensive docs with Claude
- **Real-time Updates**: Live progress tracking
- **French UI**: Complete French localization
- **Multiple Formats**: Chapters, tutorials, and reference docs
- **Markdown Rendering**: Full markdown support with syntax highlighting

## 📝 API Endpoints

### Frontend API Routes

- `POST /api/analyze-proxy` - Start documentation generation
- `POST /api/webhook/job-callback` - Receive progress updates
- `POST /api/jobs/[id]/cancel` - Cancel running job
- `GET /api/jobs/[id]/status` - Get job status

### Gateway Endpoints

- `POST /analyze` - Trigger worker job
- `POST /cancel/:jobId` - Cancel worker process
- `GET /status` - View active jobs

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   lsof -ti:3000 | xargs kill -9
   lsof -ti:8081 | xargs kill -9
   ```

2. **Convex connection issues**
   ```bash
   bunx convex dev --clear-cache
   ```

3. **TypeScript errors**
   ```bash
   rm -rf .next node_modules
   bun install
   bun run build
   ```

## 🚢 Deployment

### Scaleway Deployment

1. Build Docker images:
   ```bash
   cd scaleway-gateway
   docker build -t gateway .
   
   cd ../scaleway-worker
   docker build --build-arg ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY -t worker .
   ```

2. Push to Scaleway Registry

3. Deploy as Serverless Containers/Jobs

### Vercel Deployment

```bash
# Frontend only
vercel deploy
```

## 📄 License

Private - All rights reserved

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Run `bun run check`
4. Submit pull request

## 📧 Support

For issues, contact the development team or open an issue in the repository.
# Fondation Web App

AI-powered documentation generation platform that analyzes GitHub repositories and creates comprehensive course materials using Claude AI.

## 🚀 Quick Start

```bash
# Install dependencies
bun install

# Start development services
bunx convex dev        # Backend (Convex)
bun run dev           # Frontend (http://localhost:3000)

# Or run both:
bun run dev:all
```

## 📋 Prerequisites

- **Bun** (latest version)
- **Node.js** (v18+)
- **Git**
- **GitHub Account** (for OAuth)

## 🏗️ Architecture

```
USER → NEXT.JS → CONVEX DB (Queue) ← WORKER (Docker) → CLAUDE CLI
   ↑                ↑                        ↓
   └────────────────┴──────── STATUS ────────┘
```

### Components

- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS
- **Backend**: Convex real-time database with job queue
- **Worker**: Docker container polling Convex for jobs
- **AI**: Claude CLI for content generation

## 🔧 Configuration

### Environment Variables

Create `.env.local` from the example:

```bash
cp .env.example .env.local
```

Required variables:
- `AUTH_SECRET`: NextAuth secret (generate with `npx auth secret`)
- `GITHUB_CLIENT_ID`: GitHub OAuth app ID
- `GITHUB_CLIENT_SECRET`: GitHub OAuth app secret
- `NEXT_PUBLIC_CONVEX_URL`: Convex deployment URL
- `WORKER_GATEWAY_URL`: Worker service URL (optional, for production)

### GitHub OAuth Setup

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create new OAuth App with:
   - Homepage URL: `http://localhost:3000`
   - Callback URL: `http://localhost:3000/api/auth/callback/github`

## 📁 Project Structure

```
apps/web/
├── src/
│   ├── app/             # Next.js app router pages
│   ├── components/      # React components
│   ├── hooks/          # Custom React hooks
│   └── lib/            # Utilities and helpers
├── convex/             # Convex backend
│   ├── _generated/     # Auto-generated types
│   ├── schema.ts       # Database schema
│   ├── queue.ts        # Job queue implementation
│   └── jobs.ts         # Job management
├── public/             # Static assets
└── styles/             # Global styles
```

## 🗄️ Database Schema

### Core Tables

- **users**: GitHub authenticated users
- **repositories**: GitHub repositories
- **jobs**: Processing queue with status tracking
- **docs**: Generated documentation

### Job Queue

Jobs use atomic claiming with lease-based locking:
- Status progression: `pending` → `claimed` → `processing` → `completed`
- Automatic retry with exponential backoff (5s → 10min)
- Lease expiration recovery for failed workers

## 🚀 Development

### Local Development

```bash
# Start Convex backend
bunx convex dev

# In another terminal, start Next.js
bun run dev

# Access at http://localhost:3000
```

### Testing

```bash
# Type checking
bun run typecheck

# Linting
bun run lint

# Format code
bun run format
```

## 🐳 Production Deployment

### Web App (Vercel)

```bash
# Deploy to Vercel
vercel deploy
```

### Worker (Docker)

See [Worker Documentation](../worker/README.md) for deployment instructions.

## 🔑 Security

- OAuth authentication via GitHub
- Session-based auth with NextAuth
- Secure token validation for job callbacks
- Environment variables for sensitive data

## 📚 API Routes

- `/api/auth/*` - NextAuth endpoints
- `/api/analyze-proxy` - Job submission proxy
- `/api/webhook/job-callback` - Job status updates
- `/api/jobs/[id]/cancel` - Job cancellation

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make your changes
4. Submit pull request

## 📄 License

MIT - See LICENSE file for details
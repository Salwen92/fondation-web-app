# Fondation Web App

Next.js web application for the Fondation AI-powered course generation platform. Provides GitHub OAuth authentication, repository management, job queue monitoring, and course viewing interfaces.

## 🚀 Quick Start

```bash
# From monorepo root:
npx convex dev        # Start Convex database (required first)

# In separate terminal:
cd packages/web
bun run dev           # Frontend (http://localhost:3000)
```

## 📋 Prerequisites

- **Bun** (latest version)
- **Node.js** (v18+)
- **Git**
- **GitHub Account** (for OAuth)

## 🏗️ Architecture

```
GitHub OAuth → Next.js UI → Convex DB → Worker (Docker) → Claude CLI
     ↓           ↓              ↓           ↓
  User Auth  Job Creation   Job Queue   Analysis
                              ↓
                    Real-time Status Updates
```

### Components

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Database**: Convex real-time database with atomic job queue
- **Authentication**: NextAuth with GitHub OAuth
- **Real-time**: Convex subscriptions for live job status updates
- **Localization**: French UI for progress tracking (Étape 1 sur 6, etc.)

## 🔧 Configuration

### Environment Variables

Create `.env.local` from the example:

```bash
cp .env.example .env.local
```

Required variables:
```bash
# Authentication
AUTH_SECRET=                      # Generate with: npx auth secret
GITHUB_CLIENT_ID=                 # GitHub OAuth app client ID
GITHUB_CLIENT_SECRET=             # GitHub OAuth app client secret

# Database
NEXT_PUBLIC_CONVEX_URL=           # https://your-deployment.convex.cloud

# Optional
WORKER_GATEWAY_URL=               # Worker health endpoint (production only)
```

### GitHub OAuth Setup

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Create new OAuth App with:
   - **Application name**: `Fondation Local Dev`
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
3. Copy Client ID and Client Secret to `.env.local`

## 📁 Project Structure

```
packages/web/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── api/               # API routes
│   │   ├── auth/              # Authentication pages
│   │   ├── course/            # Course viewing pages
│   │   │   └── [owner]/[repo]/[jobId]/  # 8 levels deep!
│   │   └── dashboard/         # Main dashboard
│   ├── components/            # React components
│   │   ├── auth/             # Auth components
│   │   ├── dashboard/        # Dashboard components
│   │   └── repos/            # Repository components
│   ├── hooks/                # Custom React hooks
│   └── lib/                  # Utilities and helpers
├── public/                   # Static assets
└── package.json              # Dependencies and scripts
```

## 🗄️ Database (Convex)

### Database Location
**IMPORTANT**: Convex database is at monorepo root (`/convex/`), not in web package.

### Core Tables
- **users**: GitHub authenticated users with OAuth tokens
- **repositories**: GitHub repositories with access metadata
- **jobs**: Processing queue with atomic claiming and lease-based locking
- **docs**: Generated course content and analysis results

### Job States
- `pending` → `claimed` → `running` → `completed`
- Failed jobs retry with exponential backoff
- Expired leases return jobs to queue automatically

### 6-Step Analysis Progress
Jobs display French progress messages with 1-based indexing:
1. **Étape 1 sur 6**: Extraction des abstractions (~60s)
2. **Étape 2 sur 6**: Analyse des relations (~60s)
3. **Étape 3 sur 6**: Ordonnancement des chapitres (~30s)
4. **Étape 4 sur 6**: Génération des chapitres (~60s)
5. **Étape 5 sur 6**: Révision des chapitres (~40s)
6. **Étape 6 sur 6**: Création des tutoriels (~40s)

## 🚀 Development

### Local Development

**Prerequisites**: Convex must be running first!

```bash
# Terminal 1: Start Convex (from monorepo root)
npx convex dev

# Terminal 2: Start web app
cd packages/web
bun run dev

# Access at http://localhost:3000
```

### Quality Assurance

```bash
cd packages/web

# Type checking
bun run typecheck

# Linting
bun run lint

# Format code
bun run format:write

# Build for production
bun run build
```

## 🐳 Production Deployment

### Web App (Vercel)

1. Connect GitHub repository to Vercel
2. Set environment variables in Vercel dashboard:
   - `AUTH_SECRET`
   - `GITHUB_CLIENT_ID` 
   - `GITHUB_CLIENT_SECRET`
   - `NEXT_PUBLIC_CONVEX_URL`
3. Deploy automatically on push to main branch

### Worker Deployment

See `../../docs/DOCKER_BUILD_GUIDE.md` and `../../docs/CLAUDE_INTEGRATION.md` for complete worker deployment instructions.

## 🔑 Security

- **GitHub OAuth**: Secure authentication without storing passwords
- **NextAuth Sessions**: Encrypted session tokens
- **Job Callbacks**: Token-based validation for status updates
- **Environment Variables**: All secrets stored in `.env.local`
- **HTTPS Only**: Production requires secure connections

## 📚 API Routes

- `/api/auth/*` - NextAuth authentication endpoints
- `/api/auth/store-token` - Store GitHub OAuth tokens in Convex
- `/api/jobs/[id]/cancel` - Cancel running jobs
- `/api/jobs/[id]/status` - Get job status
- `/api/webhook/job-callback` - Worker job status callbacks
- `/api/clear-stuck-jobs` - Admin utility for stuck jobs

## ⚠️ Important Notes

### Course Page Import Paths
Course pages are **8 levels deep** in the directory structure:
```
packages/web/src/app/course/[owner]/[repo]/[jobId]/
```

To import from Convex at monorepo root, use:
```typescript
// ✅ CORRECT (8 levels up)
import { api } from '../../../../../../../../convex/_generated/api';

// ❌ WRONG (too few levels)
import { api } from '../../convex/_generated/api';
```

### Job Processing
- Jobs are created via UI but processed by separate Worker service
- Status updates happen via Convex real-time subscriptions
- Worker must use authenticated Docker image: `fondation/cli:authenticated`

## 🤝 Contributing

See `CONTRIBUTING.md` for detailed development setup and guidelines.

## 🔗 Related Documentation

- `README.md` - Main project overview
- `DOCKER_BUILD_GUIDE.md` - Worker deployment
- `../../docs/CLAUDE_INTEGRATION.md` - E2E testing guide
- `CONTRIBUTING.md` - Development setup
- `../worker/README.md` - Worker service details

## 📄 License

MIT - See LICENSE file for details
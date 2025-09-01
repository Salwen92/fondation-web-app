# Getting Started - 5 Minute Setup 🚀

Get Fondation running on your machine in under 5 minutes!

## Prerequisites

Ensure you have these exact versions installed:

| Tool | Required Version | Check Command | Install Guide |
|------|-----------------|---------------|---------------|
| **Node.js** | 20.0+ | `node --version` | [nodejs.org](https://nodejs.org/) |
| **Bun** | 1.2.0+ | `bun --version` | [bun.sh](https://bun.sh/) |
| **Docker** | 20.10+ | `docker --version` | [docker.com](https://docker.com/) |
| **Git** | 2.0+ | `git --version` | [git-scm.com](https://git-scm.com/) |

## Step 1: Clone & Setup (1 minute)

```bash
# Clone the repository
git clone https://github.com/your-org/fondation.git
cd fondation

# Install dependencies and build
bun run setup
```

Expected output:
```
✓ Dependencies installed
✓ TypeScript compiled
✓ Packages built
Setup complete in 45.2s
```

## Step 2: Configure Environment (2 minutes)

```bash
# Copy environment template
cp .env.example .env.local

# Open in your editor
code .env.local  # or vim, nano, etc.
```

**Required variables to set:**

```env
# GitHub OAuth (required)
GITHUB_CLIENT_ID=your_github_oauth_app_id
GITHUB_CLIENT_SECRET=your_github_oauth_app_secret

# Auth Secret (required)
AUTH_SECRET=generate_with_openssl_rand_base64_32
```

### Quick GitHub OAuth Setup:
1. Go to https://github.com/settings/applications/new
2. Fill in:
   - **Application name**: Fondation Local
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
3. Click "Register application"
4. Copy Client ID and Client Secret to `.env.local`

### Generate Auth Secret:
```bash
# Generate and copy this value
openssl rand -base64 32
```

## Step 3: Start Development (1 minute)

```bash
# Start all services
bun run dev
```

This starts three services in parallel:
- 🗄️ **Convex Database** (port 8080)
- 🌐 **Next.js Web** (port 3000)
- ⚙️ **Worker Service** (port 8081)

Expected output:
```
[convex] ✓ Connected to Convex deployment
[web]    ✓ Ready on http://localhost:3000
[worker] ✓ Worker started and ready
[worker] 🔍 Polling for jobs...
```

## Step 4: Verify Everything Works (1 minute)

### 1. Open the Web UI
Navigate to http://localhost:3000

You should see:
![Landing Page](https://placeholder.com/landing-page.png)
- Fondation logo and title
- "Sign in with GitHub" button
- Clean, modern interface

### 2. Sign In
Click "Sign in with GitHub" and authorize the app.

After signing in, you'll see:
- Dashboard with your GitHub username
- Empty repository list (initially)
- "Add Repository" button

### 3. Test Repository Analysis
1. Click "Add Repository"
2. Enter a GitHub repository URL (e.g., `https://github.com/facebook/react`)
3. Click "Analyze"

You should see:
```
Status: pending → claimed → analyzing → completed
Progress: Étape 1 sur 6 → Étape 2 sur 6 → ... → Étape 6 sur 6
```

Progress messages are displayed in French:
- Étape 1/6: Extraction des abstractions
- Étape 2/6: Analyse des relations
- Étape 3/6: Ordonnancement des chapitres
- Étape 4/6: Génération des chapitres
- Étape 5/6: Révision des chapitres
- Étape 6/6: Création des tutoriels

## Quick Commands Reference

| Command | Description |
|---------|-------------|
| `bun run dev` | Start all services |
| `bun run dev:web` | Start only web UI |
| `bun run dev:worker` | Start only worker |
| `bun run dev:convex` | Start only database |
| `bun run typecheck` | Check TypeScript |
| `bun run lint` | Run linting |
| `bun run build` | Build all packages |

## Troubleshooting Quick Fixes

### "Port 3000 already in use"
```bash
lsof -ti:3000 | xargs kill -9
```

### "Cannot connect to Convex"
```bash
# Delete Convex config and regenerate
grep -v CONVEX .env.local > .env.local.tmp
mv .env.local.tmp .env.local
bun run dev
```

### "Module not found" errors
```bash
bun run clean:all
bun install
bun run build
```

### Docker authentication issues
```bash
# Authenticate CLI for worker
docker run -it fondation/cli:latest npx claude auth
# Follow browser authentication flow
```

## Next Steps

✅ **You're all set!** Your development environment is ready.

Now you can:
- 📖 Read the [Architecture Overview](./ARCHITECTURE.md) to understand the system
- 💻 Check the [Development Guide](./DEVELOPMENT.md) for workflow tips
- 🚀 See the [Deployment Guide](./DEPLOYMENT.md) for production setup
- 🔧 Review [Troubleshooting](./TROUBLESHOOTING.md) for common issues

## Environment Variables Reference

See `.env.example` for all available options with descriptions:
- **Required**: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `AUTH_SECRET`
- **Auto-generated**: `CONVEX_URL`, `NEXT_PUBLIC_CONVEX_URL`
- **Optional**: Worker settings, Claude configuration, debug options

---

**Need help?** Check [Troubleshooting](./TROUBLESHOOTING.md) or open an issue on GitHub.
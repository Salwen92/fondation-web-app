# Getting Started with Fondation

Welcome to Fondation! This guide will have you up and running in under 10 minutes. 🚀

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 20.x or higher
  ```bash
  node --version  # Should output v20.x.x or higher
  ```

- **Bun**: Latest version (our primary package manager)
  ```bash
  curl -fsSL https://bun.sh/install | bash
  bun --version  # Should output 1.x.x
  ```

- **Docker**: For CLI containerization
  ```bash
  docker --version  # Should output Docker version 20.x or higher
  ```

- **Git**: For version control
  ```bash
  git --version  # Should output git version 2.x or higher
  ```

## Quick Start (3 Steps)

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/your-org/fondation.git
cd fondation

# One-command setup - installs dependencies and builds all packages
bun run setup
```

Expected output:
```
$ bun install
✔ Installed 500+ packages
$ bun run build
✔ Built shared package
✔ Built CLI package (476KB bundle)
✔ Built web package
✔ Built worker package
```

### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env.local

# Edit with your values (see detailed instructions below)
nano .env.local  # or use your preferred editor
```

Required variables for development:

```bash
# GitHub OAuth (required for authentication)
GITHUB_CLIENT_ID=your_github_oauth_app_id
GITHUB_CLIENT_SECRET=your_github_oauth_app_secret

# Auth Secret (generate with: openssl rand -base64 32)
AUTH_SECRET=your_generated_secret_here

# Application URL (for local development)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**To create GitHub OAuth App:**
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in:
   - Application name: `Fondation Local`
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Copy the Client ID and Client Secret to your `.env.local`

### 3. Start Development Environment

```bash
# Start all services (Convex, Web, Worker)
bun run dev
```

Expected output:
```
[convex] ✓ Connected to Convex deployment
[convex] ✓ Watching for changes in convex/
[web]    ▲ Next.js 15.5.1 ready on http://localhost:3000
[worker] ✓ Worker service started, polling for jobs...
```

## Verify Everything Works

### 1. Check Web Interface
Open http://localhost:3000 in your browser:
- You should see the Fondation landing page
- Click "Sign in with GitHub" to test authentication
- After signing in, you'll see the dashboard

### 2. Check Convex Dashboard
1. Look for the Convex URL in your terminal output
2. Visit https://dashboard.convex.dev
3. You should see your development deployment with:
   - `users` table (after first login)
   - `repositories` table
   - `jobs` table
   - Real-time function logs

### 3. Test Job Processing
1. In the web UI, click "Dashboard"
2. Connect a GitHub repository
3. Click "Generate Course" to create a job
4. Watch the job progress through stages:
   - `pending` → `claimed` → `analyzing` → `completed`

### 4. Verify CLI Build
```bash
# Test the CLI bundle was created correctly
ls -lh packages/cli/dist/cli.bundled.cjs
# Should show: -rwxr-xr-x  476K  cli.bundled.cjs

# Test CLI help
node packages/cli/dist/cli.bundled.cjs --help
```

## Service URLs & Dashboards

Once running, you can access:

| Service | URL | Description |
|---------|-----|-------------|
| **Web App** | http://localhost:3000 | Main application UI |
| **Convex Dashboard** | https://dashboard.convex.dev | Database console & logs |
| **GitHub OAuth** | GitHub Settings → Applications | Manage OAuth app |

## Environment Variables Reference

Complete list for development (see `.env.example` for production):

```bash
# Authentication (Required)
GITHUB_CLIENT_ID=           # GitHub OAuth App ID
GITHUB_CLIENT_SECRET=        # GitHub OAuth App Secret
AUTH_SECRET=                 # Random secret for session encryption

# URLs (Auto-configured)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Application URL
NEXTAUTH_URL=http://localhost:3000         # NextAuth callback URL

# Convex (Auto-generated when you run 'bun run dev')
NEXT_PUBLIC_CONVEX_URL=     # Convex deployment URL
CONVEX_DEPLOYMENT=           # Deployment identifier

# Worker (Optional)
WORKER_GATEWAY_URL=http://localhost:8081   # Worker service URL

# Claude CLI (Only for Docker production)
# Note: CLI uses OAuth, not API keys in development
```

## Next Steps

✅ **You're now ready to develop!** Here's what to explore next:

1. **Understand the architecture**: Read [ARCHITECTURE.md](./ARCHITECTURE.md)
2. **Learn development workflow**: Read [DEVELOPMENT.md](./DEVELOPMENT.md)
3. **Explore available commands**: Run `bun run` to see all scripts
4. **Make your first change**: Try editing `packages/web/src/app/page.tsx`

## Common First-Time Setup Issues

### Issue: "Cannot connect to Convex"
**Solution**: Convex will auto-configure on first run. Wait for:
```
✓ Created new Convex project
✓ Saved deployment to .env.local
```

### Issue: "GitHub authentication fails"
**Solution**: Verify your OAuth callback URL is exactly:
```
http://localhost:3000/api/auth/callback/github
```

### Issue: "Port 3000 already in use"
**Solution**: Kill the process using the port:
```bash
lsof -ti:3000 | xargs kill -9
# Or change the port in packages/web/package.json
```

### Issue: "TypeScript errors on first build"
**Solution**: Build shared package first:
```bash
bun run build:shared
bun run build
```

## Getting Help

- **Documentation**: All docs are in the `docs/` folder
- **Troubleshooting**: See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Architecture questions**: See [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Development workflow**: See [DEVELOPMENT.md](./DEVELOPMENT.md)

---

🎉 **Welcome to Fondation!** You're now part of the AI-powered course generation revolution.
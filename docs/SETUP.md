# Developer Setup Guide

## Prerequisites

Before setting up the Fondation web application, ensure you have the following installed:

- **Node.js**: Version 20.0.0 or higher
- **Bun**: Latest version (recommended) or npm/yarn
- **Git**: For version control
- **GitHub Account**: For OAuth authentication
- **Convex Account**: For backend services (free tier available)

### Installing Bun (Recommended)

```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Windows (WSL)
curl -fsSL https://bun.sh/install | bash

# Verify installation
bun --version
```

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd fondation-web-app

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Start Convex backend
bunx convex dev

# In a new terminal, start Next.js
bun run dev

# Open http://localhost:3000
```

## Detailed Setup Steps

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd fondation-web-app

# Install dependencies with Bun (fastest)
bun install

# Or with npm
npm install

# Or with yarn
yarn install
```

### 2. GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the application details:

| Field | Value |
|-------|-------|
| Application name | Fondation Dev (or your choice) |
| Homepage URL | `http://localhost:3000` |
| Authorization callback URL | `http://localhost:3000/api/auth/callback/github` |
| Application description | (Optional) |

4. Click "Register application"
5. Copy the **Client ID**
6. Generate and copy a new **Client Secret**

### 3. Convex Setup

1. Create a Convex account at [convex.dev](https://convex.dev)
2. Install Convex CLI (if not using bunx):
   ```bash
   npm install -g convex
   ```
3. Initialize Convex in the project:
   ```bash
   bunx convex dev
   ```
4. This will:
   - Create a new Convex project (or link to existing)
   - Generate TypeScript types
   - Start the Convex development server
   - Add CONVEX_DEPLOYMENT to `.env.local`
   - Add NEXT_PUBLIC_CONVEX_URL to `.env.local`

### 4. Environment Configuration

Create a `.env` file in the root directory:

```bash
# Copy the example file
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Authentication
AUTH_SECRET="<generate-with-command-below>"
NEXTAUTH_SECRET="<same-as-auth-secret>"
NEXTAUTH_URL="http://localhost:3000"

# GitHub OAuth
GITHUB_CLIENT_ID="<your-github-client-id>"
GITHUB_CLIENT_SECRET="<your-github-client-secret>"

# The following will be added automatically by Convex:
# NEXT_PUBLIC_CONVEX_URL="https://your-instance.convex.cloud"
# CONVEX_DEPLOYMENT="dev:your-instance"
```

Generate AUTH_SECRET:
```bash
npx auth secret
# or
openssl rand -base64 32
```

### 5. Database Schema Setup

The Convex schema is already defined in `convex/schema.ts`. When you run `bunx convex dev`, it will:
- Deploy the schema to your Convex instance
- Generate TypeScript types in `convex/_generated/`

Verify the schema is deployed:
1. Open [Convex Dashboard](https://dashboard.convex.dev)
2. Select your project
3. Check the "Data" tab for tables: `users`, `repositories`, `jobs`

### 6. Running the Application

#### Development Mode

```bash
# Terminal 1: Start Convex (if not already running)
bunx convex dev

# Terminal 2: Start Next.js development server
bun run dev
# or
npm run dev
```

The application will be available at:
- Application: http://localhost:3000
- Convex Dashboard: https://dashboard.convex.dev

#### Production Build

```bash
# Build the application
bun run build

# Start production server
bun run start
```

### 7. Verify Setup

1. **Check Next.js**: Navigate to http://localhost:3000
   - You should see the landing page

2. **Test Authentication**:
   - Click "Sign in with GitHub"
   - Authorize the application
   - You should be redirected to the dashboard

3. **Check Convex**:
   - Open Convex Dashboard
   - Verify user record was created in the `users` table

4. **Test Repository Fetching**:
   - On the dashboard, repositories should auto-fetch
   - Or click "Refresh" to manually fetch

## Development Commands

### Available Scripts

```bash
# Development
bun run dev          # Start development server with Turbo
bun run build        # Build for production
bun run start        # Start production server
bun run preview      # Build and start production

# Code Quality
bun run check        # Run linting and type checking
bun run lint         # Run ESLint
bun run lint:fix     # Fix ESLint issues
bun run typecheck    # Run TypeScript compiler check
bun run format:check # Check Prettier formatting
bun run format:write # Fix Prettier formatting

# Convex
bunx convex dev      # Start Convex dev server
bunx convex deploy   # Deploy to production
bunx convex logs     # View function logs
bunx convex dashboard # Open Convex dashboard
```

### Project Structure

```
fondation-web-app/
├── .env                    # Environment variables (create from .env.example)
├── .env.local             # Convex-generated variables
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── (auth)/       # Authentication routes
│   │   ├── (dashboard)/  # Protected routes
│   │   ├── api/          # API routes
│   │   └── layout.tsx    # Root layout
│   ├── components/        # React components
│   ├── lib/              # Utilities
│   ├── server/           # Server-side code
│   └── styles/           # CSS files
├── convex/               # Convex backend
│   ├── _generated/       # Auto-generated types
│   ├── schema.ts         # Database schema
│   └── *.ts             # Convex functions
├── public/              # Static assets
└── docs/                # Documentation
```

## Common Development Tasks

### Adding a New Convex Function

1. Create a new file in `convex/` directory:
```typescript
// convex/myfunction.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const myQuery = query({
  args: { param: v.string() },
  handler: async (ctx, args) => {
    // Implementation
  },
});
```

2. Types are auto-generated when Convex dev server detects changes

3. Use in components:
```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

const result = useQuery(api.myfunction.myQuery, { param: "value" });
```

### Adding UI Components

We use shadcn/ui for components:

```bash
# Add a new component
bunx shadcn@latest add dialog

# This will:
# 1. Install required dependencies
# 2. Add component to src/components/ui/
# 3. Update tailwind.config.ts if needed
```

### Updating Dependencies

```bash
# Check for updates
bun update --dry-run

# Update all dependencies
bun update

# Update specific package
bun add package@latest
```

## Troubleshooting

### Common Issues

#### Port 3000 Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 bun run dev
```

#### Convex Connection Issues
```bash
# Restart Convex dev server
bunx convex dev --once  # Run once to sync
bunx convex dev        # Start dev server
```

#### TypeScript Errors After Schema Changes
```bash
# Regenerate Convex types
bunx convex dev --once

# Restart TypeScript server in VS Code
Cmd+Shift+P -> "TypeScript: Restart TS Server"
```

#### Environment Variables Not Loading
- Ensure `.env` file is in root directory
- Restart the development server after changes
- Check variable names match exactly (case-sensitive)

### Debug Mode

Enable debug logging:

```typescript
// For NextAuth debugging
// In src/server/auth/config.ts
debug: process.env.NODE_ENV === "development"

// For Convex debugging
// Check Convex dashboard logs

// For Next.js debugging
// Add to next.config.js
module.exports = {
  reactStrictMode: true,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
}
```

## IDE Setup

### VS Code Recommended Extensions

Create `.vscode/extensions.json`:
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "csstools.postcss"
  ]
}
```

### VS Code Settings

Create `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

## Testing

### Manual Testing Checklist

- [ ] Authentication flow works
- [ ] User data syncs to Convex
- [ ] Repositories fetch from GitHub
- [ ] Repository cards display correctly
- [ ] Job creation works
- [ ] Error states handled gracefully
- [ ] Responsive design works
- [ ] Toast notifications appear

### Performance Testing

```bash
# Run Lighthouse audit
npm run build
npm run start
# Open Chrome DevTools > Lighthouse > Generate report

# Bundle analysis
ANALYZE=true bun run build
```

## Deployment Preparation

Before deploying to production:

1. **Environment Variables**: Set production values
2. **Convex Production**: Deploy with `bunx convex deploy`
3. **Build Test**: Run `bun run build` successfully
4. **Type Check**: Run `bun run typecheck` with no errors
5. **Lint Check**: Run `bun run lint` with no errors
6. **Security Audit**: Run `bun audit`

## Getting Help

- **Documentation**: Check `/docs` folder
- **Roadmap**: See `/roadmap` folder for planned features
- **Convex Docs**: https://docs.convex.dev
- **Next.js Docs**: https://nextjs.org/docs
- **NextAuth Docs**: https://authjs.dev
- **shadcn/ui**: https://ui.shadcn.com

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Ensure all tests pass
5. Run code quality checks
6. Submit a pull request

## License

[To be added]
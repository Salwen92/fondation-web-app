# Fondation Web Application Documentation

## Overview

Fondation is an AI-powered documentation generation platform that automatically creates comprehensive documentation for GitHub repositories. Built with Next.js 15, Convex, and NextAuth.js, it provides a seamless experience for developers to generate and manage documentation for their projects.

## Table of Contents

- [Architecture Overview](./ARCHITECTURE.md)
- [API Documentation](./API.md)
- [Authentication Guide](./AUTHENTICATION.md)
- [Developer Setup](./SETUP.md)
- [Convex Database Schema](./CONVEX-SCHEMA.md)
- [Troubleshooting](./TROUBLESHOOTING.md)

## Quick Start

```bash
# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your GitHub OAuth credentials

# Start Convex development server
bunx convex dev

# Start Next.js development server
bun run dev
```

## Current Implementation Status

### ✅ Phase 1.1: Foundation & Authentication (Complete)
- GitHub OAuth integration
- User session management
- Convex database setup
- Basic UI components with shadcn/ui

### ✅ Phase 1.2: Repository Listing & Job Creation (Complete)
- Fetch and display GitHub repositories
- Create documentation generation jobs
- Repository caching in Convex
- Responsive grid layout

### 🚧 Phase 1.3: Cloud Run Setup (Pending)
- Container configuration for CLI execution
- Job execution backend
- Callback system for status updates

### 📅 Phase 2: Execution & Feedback (Future)
- Real-time job status updates
- Log streaming with virtual scrolling
- Code display with syntax highlighting
- Result visualization

## Tech Stack

### Frontend
- **Next.js 15.2.3**: React framework with App Router
- **React 19**: Latest React with Server Components
- **TypeScript 5.8**: Type-safe development
- **Tailwind CSS 4.0**: Utility-first CSS
- **shadcn/ui**: High-quality UI components

### Backend & Database
- **Convex 1.25**: Real-time backend platform
- **NextAuth.js 5.0 (Beta)**: Authentication solution
- **Octokit 22.0**: GitHub API client

### Development Tools
- **Bun**: Fast JavaScript runtime and package manager
- **ESLint 9**: Code linting
- **Prettier**: Code formatting
- **Zod 3.24**: Runtime type validation

## Project Structure

```
fondation-web-app/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── (auth)/          # Authentication pages
│   │   ├── (dashboard)/     # Protected dashboard pages
│   │   └── api/             # API routes
│   ├── components/          # React components
│   │   ├── auth/           # Authentication components
│   │   ├── dashboard/      # Dashboard components
│   │   ├── repos/          # Repository components
│   │   └── ui/             # shadcn/ui components
│   ├── lib/                # Utility functions
│   ├── server/             # Server-side code
│   │   └── auth/          # Auth configuration
│   └── styles/             # Global styles
├── convex/                 # Convex backend
│   ├── _generated/        # Auto-generated Convex files
│   ├── schema.ts          # Database schema
│   ├── users.ts           # User functions
│   ├── repositories.ts    # Repository functions
│   └── jobs.ts            # Job functions
├── docs/                   # Documentation
├── roadmap/               # Development roadmap
└── public/                # Static assets
```

## Key Features

### 🔐 Authentication
- Secure GitHub OAuth 2.0 integration
- Session persistence with JWT tokens
- Automatic user profile syncing

### 📚 Repository Management
- Fetch repositories from authenticated user's GitHub account
- Cache repository data in Convex for performance
- Display repositories in responsive grid layout
- Manual refresh capability

### 💼 Job System
- Create documentation generation jobs
- Track job status (pending, running, completed, failed)
- Secure callback tokens for job updates
- Job history and management

### 🎨 User Interface
- Clean, modern design with shadcn/ui
- Responsive layout for all screen sizes
- Toast notifications for user feedback
- Loading states and error handling

## Performance Targets

| Metric | Target | Current Status |
|--------|--------|---------------|
| Bundle Size | <200KB | ✅ Achieved |
| Lighthouse Score | >80 | ✅ Achieved |
| Time to Interactive | <2s | ✅ Achieved |
| Type Coverage | 100% | ✅ Achieved |

## Security Considerations

- Environment variables validated with Zod schemas
- GitHub OAuth scopes limited to necessary permissions
- Secure token storage in HTTP-only cookies
- CSRF protection via NextAuth.js
- Input validation on all user inputs
- SQL injection prevention via Convex ORM

## Contributing

Please refer to the [Developer Setup Guide](./SETUP.md) for detailed instructions on setting up the development environment.

## License

[License information to be added]

## Support

For issues and questions:
- GitHub Issues: [Repository Issues Page]
- Documentation: This docs folder
- Roadmap: See `/roadmap` folder for development plans
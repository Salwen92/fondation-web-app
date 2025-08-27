# Fondation Backlog

This document tracks known issues, improvements, and features that need to be implemented. Think of it as a project-wide GitHub Issues tracker.

## 🚨 Critical Issues

### 1. Remove Outdated API Routes
**Priority**: HIGH  
**Status**: TODO  
**Files**: 
- `fondation/apps/web/src/app/api/analyze-proxy/route.ts`
- `fondation/apps/web/src/app/api/jobs/[id]/cancel/route.ts`

**Description**: These API routes reference the old gateway architecture and should be removed or updated to work with the new Convex-based job queue.

**Solution**: 
- Remove analyze-proxy route (jobs are created directly via Convex)
- Update cancel route to use Convex mutations

---

### 2. Duplicate Code Between Root and Monorepo
**Priority**: HIGH  
**Status**: TODO  
**Files**: 
- `/src/*` (root)
- `/fondation/apps/web/src/*` (monorepo)

**Description**: There are duplicate source files in both the root and the monorepo structure. The root files should be removed.

**Solution**: 
- Remove `/src`, `/convex`, `/public` directories from root
- Keep only the monorepo structure in `/fondation`

---

## 🔧 Technical Debt

### 3. Environment Variables Consolidation
**Priority**: MEDIUM  
**Status**: TODO  
**Files**: 
- `fondation/apps/web/src/env.js`

**Description**: The env.js file still has mixed authentication variable names (AUTH_SECRET vs NEXTAUTH_SECRET).

**Solution**: 
- Standardize on AUTH_* prefix
- Update all references throughout the codebase

---

### 4. Missing Worker Health Check Implementation
**Priority**: MEDIUM  
**Status**: TODO  
**Files**: 
- `fondation/apps/worker/src/health.ts`

**Description**: The health check endpoint should be fully implemented with proper metrics.

**Solution**: 
- Implement memory usage tracking
- Add job processing metrics
- Include Convex connection status

---

### 5. Missing Tests
**Priority**: MEDIUM  
**Status**: TODO  
**Files**: 
- All components and utilities

**Description**: No test files exist for the application.

**Solution**: 
- Add unit tests for utilities
- Add component tests with React Testing Library
- Add E2E tests with Playwright

---

## ✨ Features to Implement

### 6. Job Cancellation UI
**Priority**: LOW  
**Status**: TODO  
**Files**: 
- `fondation/apps/web/src/components/repos/job-actions.tsx`

**Description**: Users cannot cancel running jobs from the UI.

**Solution**: 
- Add cancel button to job card
- Implement Convex mutation for job cancellation
- Handle worker cleanup on cancellation

---

### 7. Job Retry UI
**Priority**: LOW  
**Status**: TODO  
**Files**: 
- `fondation/apps/web/src/components/repos/repo-card.tsx`

**Description**: Failed jobs cannot be retried from the UI.

**Solution**: 
- Add retry button for failed jobs
- Reset job status in Convex
- Trigger worker to pick up job again

---

### 8. Export Documentation
**Priority**: LOW  
**Status**: TODO  
**Files**: 
- New feature

**Description**: Users cannot export generated documentation in different formats.

**Solution**: 
- Add export buttons (PDF, Markdown, HTML)
- Implement server-side rendering for exports
- Store exports temporarily for download

---

## 📚 Documentation Issues

### 9. Missing API Documentation
**Priority**: LOW  
**Status**: TODO  
**Files**: 
- `docs/API.md`

**Description**: API documentation doesn't cover new Convex functions and worker endpoints.

**Solution**: 
- Document all Convex functions
- Document worker health/metrics endpoints
- Add examples for common operations

---

### 10. Deployment Guide Incomplete
**Priority**: MEDIUM  
**Status**: TODO  
**Files**: 
- New file needed

**Description**: No comprehensive deployment guide for production.

**Solution**: 
- Create `DEPLOYMENT.md`
- Cover Vercel deployment for web app
- Cover VPS setup for worker
- Include monitoring setup

---

## 🐛 Known Bugs

### 11. Repository Refresh Race Condition
**Priority**: LOW  
**Status**: TODO  
**Files**: 
- `fondation/apps/web/src/components/dashboard/dashboard-content.tsx`

**Description**: Rapid clicking of refresh button can cause duplicate repository entries.

**Solution**: 
- Add debouncing to refresh button
- Check for existing repos before inserting

---

### 12. Large Repository Timeout
**Priority**: MEDIUM  
**Status**: TODO  
**Files**: 
- `fondation/apps/worker/src/cli-executor.ts`

**Description**: Very large repositories (>1GB) may timeout during cloning.

**Solution**: 
- Implement shallow clone option
- Add configurable timeout
- Stream progress updates during clone

---

## 🔒 Security Improvements

### 13. Rate Limiting
**Priority**: MEDIUM  
**Status**: TODO  
**Files**: 
- `fondation/apps/web/src/middleware.ts`

**Description**: No rate limiting on API endpoints.

**Solution**: 
- Implement rate limiting middleware
- Add per-user quotas
- Store limits in Convex

---

### 14. Input Validation
**Priority**: HIGH  
**Status**: TODO  
**Files**: 
- Various API routes and Convex functions

**Description**: Not all user inputs are properly validated.

**Solution**: 
- Add Zod schemas for all inputs
- Sanitize repository URLs
- Validate branch names

---

## 🎨 UI/UX Improvements

### 15. Dark Mode Support
**Priority**: LOW  
**Status**: TODO  
**Files**: 
- `fondation/apps/web/src/app/layout.tsx`
- CSS files

**Description**: No dark mode support.

**Solution**: 
- Implement theme provider
- Add dark mode variants to Tailwind
- Add theme toggle button

---

### 16. Mobile Responsiveness
**Priority**: MEDIUM  
**Status**: PARTIAL  
**Files**: 
- Various components

**Description**: Some components don't work well on mobile.

**Solution**: 
- Review all components for mobile layout
- Fix overflow issues
- Improve touch interactions

---

## 🚀 Performance Optimizations

### 17. Repository List Pagination
**Priority**: LOW  
**Status**: TODO  
**Files**: 
- `fondation/apps/web/src/components/repos/repository-list.tsx`

**Description**: All repositories load at once.

**Solution**: 
- Implement pagination or infinite scroll
- Add search/filter functionality
- Cache repository data

---

### 18. Bundle Size Optimization
**Priority**: LOW  
**Status**: TODO  
**Files**: 
- `fondation/apps/web/next.config.js`

**Description**: Bundle size could be reduced.

**Solution**: 
- Analyze bundle with webpack-bundle-analyzer
- Lazy load heavy components
- Optimize imports

---

## 📊 Monitoring & Analytics

### 19. Error Tracking
**Priority**: MEDIUM  
**Status**: TODO  
**Files**: 
- New integration needed

**Description**: No error tracking in production.

**Solution**: 
- Integrate Sentry or similar
- Add error boundaries
- Track worker errors

---

### 20. Usage Analytics
**Priority**: LOW  
**Status**: TODO  
**Files**: 
- New integration needed

**Description**: No usage analytics.

**Solution**: 
- Add privacy-friendly analytics (Plausible, Umami)
- Track key metrics
- Create dashboard

---

## 🔄 DevOps & CI/CD

### 21. GitHub Actions Setup
**Priority**: MEDIUM  
**Status**: TODO  
**Files**: 
- `.github/workflows/*`

**Description**: No CI/CD pipeline.

**Solution**: 
- Add build and test workflow
- Add deployment workflow
- Add dependency updates

---

### 22. Docker Compose for Development
**Priority**: LOW  
**Status**: TODO  
**Files**: 
- `fondation/docker-compose.yml`

**Description**: Docker compose file exists but may need updates.

**Solution**: 
- Verify docker-compose works
- Add development database
- Include all services

---

## 📝 Notes

- Items marked as HIGH priority should be addressed first
- This backlog should be updated as issues are resolved
- Consider converting to GitHub Issues for better tracking
- Add estimates and assignees as team grows

## Contributing

To add a new item to the backlog:
1. Add it to the appropriate section
2. Include priority (HIGH/MEDIUM/LOW)
3. List affected files
4. Provide clear description and solution

To claim an item:
1. Change status to IN_PROGRESS
2. Add your name and start date
3. Create a PR when complete
# Package Installation Timeline

## Philosophy: Start Minimal, Add As Needed

This document tracks when and why each package should be installed, following the principle of minimal initial setup with incremental additions.

## Installation by Version

### 🟢 v0.1 - Core Pipeline (Week 1-2)
**Goal**: Minimal working authentication and job creation  
**Bundle Impact**: Base ~200KB

```bash
# Day 1: Absolute essentials only
npm create next-app@latest fondation-web --typescript --tailwind --app
npm install convex@^1.0.0
npm install next-auth@5.0.0-beta.25
npm install zod@3.24.2

# Day 2: Minimal UI (only what's needed for login)
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card avatar dropdown-menu toast
npm install clsx@^2.1.1 tailwind-merge@^3.0.2
npm install lucide-react@^0.483.0
npm install sonner@^2.0.3

# Day 3: Form handling (for login/settings)
npm install react-hook-form@^7.54.2
npm install @hookform/resolvers@^4.1.3
npm install bcryptjs@^3.0.2

# Day 4: GitHub integration
npm install @octokit/rest@^21.1.1
npm install uuid@^11.1.0
```

### 🟡 v0.2 - Execution & Feedback (Week 3-4)
**Goal**: Add real-time updates and code display  
**Bundle Impact**: +100KB (total ~300KB)

```bash
# Day 11: Data management (now we need it)
npm install @tanstack/react-query@^5.50.0
npm install zustand@^5.0.3
npm install date-fns@^4.1.0

# Day 12: Real-time logs display
npm install react-virtuoso@^4.12.6
npx shadcn-ui@latest add badge progress tabs separator skeleton

# Day 13: Code & markdown display
npm install @uiw/react-codemirror@^4.23.12
npm install @codemirror/lang-javascript@^6.2.4
npm install @codemirror/lang-markdown@^6.3.2
npm install react-markdown@^10.1.0
npm install remark-gfm@^4.0.1
```

### 🟠 v0.3 - User Experience (Week 5-7)
**Goal**: Polish UX with dashboard, search, and chat  
**Bundle Impact**: +100KB (total ~400KB)

```bash
# Day 19: Dashboard & analytics
npm install recharts@^2.15.2
npm install @tanstack/react-table@^8.0.0
npx shadcn-ui@latest add table calendar popover select checkbox

# Day 20: Advanced search & filtering
npm install cmdk@^1.1.1
npm install react-day-picker@^9.6.7
npx shadcn-ui@latest add command input

# Day 21: Configuration UI
npm install immer@^10.1.1
npm install superjson@^2.2.1
npx shadcn-ui@latest add accordion slider switch label textarea

# Day 22: Environment & export
npm install @t3-oss/env-nextjs@^0.10.1
npm install html-to-image@^1.11.13

# Day 25: AI & Chat features
npm install ai@^4.3.16
npm install @ai-sdk/react@^1.2.11
npm install @dqbd/tiktoken@^1.0.21

# Day 26: Theme & mobile
npm install next-themes@^0.4.6
npm install vaul@^1.1.2
npx shadcn-ui@latest add alert-dialog sheet
```

### 🔴 v0.4 - Team Features (Week 8-10)
**Goal**: Multi-user collaboration  
**Bundle Impact**: +50KB (total ~450KB)

```bash
# Day 31: Email notifications
npm install resend@^4.1.2
npm install @react-email/components

# Day 33: Advanced permissions
npm install casl@^6.0.0

# Day 35: Audit logging
npm install winston@^3.0.0
```

### 🟣 v1.0 - Production Ready (Week 11-14)
**Goal**: Security, payments, monitoring  
**Bundle Impact**: +50KB (total ~500KB)

```bash
# Day 40: Payments
npm install stripe@^14.0.0

# Day 42: Monitoring & analytics
npm install @sentry/nextjs@^7.0.0
npm install posthog-js@^1.246.0
npm install posthog-node@^4.17.2

# Day 44: Security
npm install helmet@^7.0.0
npm install express-rate-limit@^7.0.0

# Day 46: Performance
npm install @next/bundle-analyzer@^15.0.0
```

## Package Categories

### 🎨 UI/UX Packages
| Package | Version | Size | When to Install |
|---------|---------|------|-----------------|
| shadcn-ui | 0.1 | 0KB* | Day 1 (components as needed) |
| lucide-react | 0.1 | 15KB | Day 2 (icons) |
| sonner | 0.1 | 8KB | Day 2 (toasts) |
| cmdk | 0.3 | 12KB | When search needed |
| vaul | 0.3 | 10KB | When mobile drawer needed |
| react-day-picker | 0.3 | 25KB | When date picker needed |

*Shadcn components are copied, not bundled

### 📊 Data & State
| Package | Version | Size | When to Install |
|---------|---------|------|-----------------|
| @tanstack/react-query | 0.2 | 25KB | When caching needed |
| zustand | 0.2 | 8KB | When global state needed |
| immer | 0.3 | 16KB | When complex state updates |
| superjson | 0.3 | 5KB | When serialization needed |

### 🔧 Developer Tools
| Package | Version | Size | When to Install |
|---------|---------|------|-----------------|
| zod | 0.1 | 12KB | Day 1 (validation) |
| react-hook-form | 0.1 | 25KB | Day 3 (forms) |
| @t3-oss/env-nextjs | 0.3 | 2KB | When env validation needed |
| @hookform/resolvers | 0.1 | 2KB | Day 3 (with react-hook-form) |

### 📈 Analytics & Monitoring
| Package | Version | Size | When to Install |
|---------|---------|------|-----------------|
| recharts | 0.3 | 150KB | When charts needed |
| @sentry/nextjs | 1.0 | 50KB | Production only |
| posthog-js | 1.0 | 40KB | Optional analytics |

## Decision Tree for Package Installation

```
Need a new feature?
├── Can it be done with existing packages?
│   └── Yes → Use existing packages
│   └── No → Continue
├── Is it core functionality?
│   └── Yes → Install in current version
│   └── No → Defer to next version
├── What's the bundle size impact?
│   └── <10KB → Install if needed
│   └── 10-50KB → Evaluate necessity
│   └── >50KB → Strong justification required
└── Is there a lighter alternative?
    └── Yes → Use the alternative
    └── No → Install if critical
```

## Bundle Size Guidelines

### Per Version Targets
- v0.1: <200KB (bare minimum)
- v0.2: <300KB (+logs, code display)
- v0.3: <400KB (+charts, chat)
- v0.4: <450KB (+team features)
- v1.0: <500KB (+production features)

### Package Size Budget
- Critical features: Up to 50KB per package
- Nice-to-have features: Up to 20KB per package
- Optional features: Up to 10KB per package

### Monitoring Bundle Size
```bash
# After each major package addition
npm run build
npm run analyze  # Requires @next/bundle-analyzer

# Check specific package size
npm list [package-name] --depth=0
npx bundlephobia [package-name]
```

## Packages to Avoid (Too Heavy)

❌ **Do Not Install Unless Absolutely Necessary:**
- moment.js (67KB) → Use date-fns (modular)
- lodash (71KB) → Use native JS or specific lodash functions
- axios (27KB) → Use native fetch
- @emotion/\* → Use Tailwind CSS
- material-ui → Use shadcn/ui
- antd → Use shadcn/ui

## Lazy Loading Strategy

For heavy packages that are rarely used:

```typescript
// Don't import at top level
// import { HeavyComponent } from 'heavy-package';

// Do lazy load when needed
const HeavyComponent = dynamic(
  () => import('heavy-package').then(mod => mod.HeavyComponent),
  { 
    loading: () => <Skeleton />,
    ssr: false 
  }
);
```

## Performance Checklist

Before adding any package:
- [ ] Check bundle size with bundlephobia
- [ ] Look for lighter alternatives
- [ ] Consider if it can be lazy loaded
- [ ] Evaluate if custom implementation is simpler
- [ ] Test impact on Lighthouse score
- [ ] Document why it's necessary

## Notes

1. **Start with native solutions**: Always check if the browser/Next.js provides a native solution before adding a package.

2. **Progressive enhancement**: Each version should be fully functional without packages from future versions.

3. **User value**: Every package must provide clear user value, not just developer convenience.

4. **Review regularly**: Audit packages quarterly and remove unused ones.

5. **Tree shaking**: Ensure all packages support tree shaking for optimal bundle size.
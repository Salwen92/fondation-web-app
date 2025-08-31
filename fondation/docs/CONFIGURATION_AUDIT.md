# Fondation Monorepo Configuration Audit
Generated: Sun Aug 31 15:55:02 CET 2025

## Configuration Files Inventory

/Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation/.env.example
/Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation/.env.local
/Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation/biome.json
/Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation/package.json
/Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation/packages/cli/.claude/mcp.json
/Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation/packages/cli/.claude/settings.local.json
/Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation/packages/cli/.env
/Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation/packages/cli/.fondation.example.json
/Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation/packages/cli/.mcp.json
/Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation/packages/cli/.npmrc
/Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation/packages/cli/Dockerfile.production
/Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation/packages/cli/package-lock.json
/Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation/packages/cli/package.json
/Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation/packages/cli/tsconfig.json
/Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation/packages/shared/package.json
/Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation/packages/shared/tsconfig.json
/Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation/packages/web/.env
/Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation/packages/web/.env.example
/Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation/packages/web/.env.local
/Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation/packages/web/empty.json
/Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation/packages/web/next.config.js
/Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation/packages/web/package.json
/Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation/packages/web/postcss.config.js
/Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation/packages/web/tsconfig.json
/Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation/packages/worker/package.json
/Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation/packages/worker/tsconfig.json
/Users/salwen/Documents/Cyberscaling/fondation-web-app/fondation/tsconfig.json

## Dependency Analysis

### Root Package
  - @types/dompurify: ^3.2.0
  - isomorphic-dompurify: ^2.26.0

### Root DevDependencies
  - @biomejs/biome: ^2.2.2
  - @types/node: ^20.14.10
  - concurrently: ^9.2.1
  - convex: ^1.26.2
  - prettier: ^3.5.3
  - typescript: ^5.8.2

### cli
Dependencies:
  - @anthropic-ai/claude-code: 1.0.51
  - @types/js-yaml: ^4.0.9
  - @types/react: ^19.1.8
  - commander: ^14.0.0
  - cosmiconfig: ^9.0.0
  - ink: ^6.0.0
  - marked: ^15.0.12
  - marked-terminal: ^7.3.0
  - pino: 9.7.0
  - pino-pretty: ^13.0.0
  - react: ^19.1.0
  - yaml: ^2.8.0
  - zod: ^3.25.67
DevDependencies:
  - @biomejs/biome: ^2.0.6
  - @types/marked-terminal: ^6.1.1
  - @types/node: ^20.19.4
  - esbuild: ^0.25.6
  - husky: ^9.1.7
  - lint-staged: ^16.1.2
  - tsx: ^4.0.0
  - typescript: ^5.8.2

### shared
Dependencies:
  - zod: ^3.24.2
DevDependencies:
  - @types/node: ^20.14.10
  - typescript: ^5.8.2

### web
Dependencies:
  - @octokit/rest: ^22.0.0
  - @radix-ui/react-alert-dialog: ^1.1.15
  - @radix-ui/react-avatar: ^1.1.10
  - @radix-ui/react-dropdown-menu: ^2.1.16
  - @radix-ui/react-slot: ^1.2.3
  - @t3-oss/env-nextjs: ^0.12.0
  - @tailwindcss/typography: ^0.5.16
  - class-variance-authority: ^0.7.1
  - clsx: ^2.1.1
  - convex: ^1.26.1
  - framer-motion: ^12.23.12
  - highlight.js: ^11.11.1
  - lucide-react: ^0.541.0
  - mermaid: ^11.10.1
  - next: ^15.2.3
  - next-auth: 5.0.0-beta.25
  - next-themes: ^0.4.6
  - react: ^19.0.0
  - react-dom: ^19.0.0
  - react-markdown: ^10.1.0
  - rehype-autolink-headings: ^7.1.0
  - rehype-highlight: ^7.0.2
  - rehype-pretty-code: ^0.14.1
  - rehype-raw: ^7.0.0
  - rehype-sanitize: ^6.0.0
  - rehype-slug: ^6.0.0
  - remark-gfm: ^4.0.1
  - remark-mermaid: ^0.2.0
  - shiki: ^3.11.0
  - sonner: ^2.0.7
  - tailwind-merge: ^3.3.1
  - uuid: ^11.1.0
  - zod: ^3.24.2
DevDependencies:
  - @eslint/eslintrc: ^3.3.1
  - @tailwindcss/postcss: ^4.0.15
  - @types/node: ^20.14.10
  - @types/react: ^19.0.0
  - @types/react-dom: ^19.0.0
  - cors: ^2.8.5
  - eslint: ^9.23.0
  - eslint-config-next: ^15.2.3
  - express: ^5.1.0
  - postcss: ^8.5.3
  - prettier: ^3.5.3
  - prettier-plugin-tailwindcss: ^0.6.11
  - tailwindcss: ^4.0.15
  - typescript: ^5.8.2
  - typescript-eslint: ^8.27.0

### worker
Dependencies:
  - convex: ^1.26.1
  - js-yaml: ^4.1.0
DevDependencies:
  - @types/js-yaml: ^4.0.9
  - @types/node: ^20.14.10
  - tsx: ^4.0.0
  - typescript: ^5.8.2

## Version Conflicts

### TypeScript Versions:
   4     "typescript": "^5.8.2"
   1     "typescript": "^5.8.2",

### React Versions:
   1     "react": "^19.0.0",
   1     "react": "^19.1.0",

### Node Types Versions:
   4     "@types/node": "^20.14.10",
   1     "@types/node": "^20.19.4",

### Convex Versions:
   2     "convex": "^1.26.1",
   1     "convex": "^1.26.2",

### Zod Versions:
   2     "zod": "^3.24.2"
   1     "zod": "^3.25.67"

## TypeScript Configuration Analysis

### tsconfig.json
{
  "target": "ES2022",
  "module": "ESNext",
  "moduleResolution": "node",
  "jsx": null,
  "strict": true,
  "esModuleInterop": true,
  "skipLibCheck": true,
  "forceConsistentCasingInFileNames": true,
  "noEmit": null,
  "composite": true
}
### packages/cli/tsconfig.json
{
  "target": null,
  "module": "ESNext",
  "moduleResolution": "bundler",
  "jsx": "react-jsx",
  "strict": null,
  "esModuleInterop": null,
  "skipLibCheck": null,
  "forceConsistentCasingInFileNames": null,
  "noEmit": false,
  "composite": true
}
### packages/shared/tsconfig.json
{
  "target": "ES2022",
  "module": "ESNext",
  "moduleResolution": "node",
  "jsx": null,
  "strict": true,
  "esModuleInterop": true,
  "skipLibCheck": true,
  "forceConsistentCasingInFileNames": true,
  "noEmit": false,
  "composite": true
}
### packages/web/tsconfig.json
### packages/worker/tsconfig.json
{
  "target": null,
  "module": null,
  "moduleResolution": null,
  "jsx": null,
  "strict": null,
  "esModuleInterop": null,
  "skipLibCheck": null,
  "forceConsistentCasingInFileNames": null,
  "noEmit": false,
  "composite": true
}
### packages/web/tsconfig.json (manual check)
    "moduleResolution": "bundler",
    "target": "es2022",
    "moduleDetection": "force",
    "module": "ESNext",
    "jsx": "preserve",
    "node_modules"

## Build Configuration

### Build Tools in Use:

### Package Build Scripts:
cli:
  - build: tsc
  - build:cli: node scripts/bundle-cli.js --production
  - build:cli:dev: node scripts/bundle-cli.js
  - build:cli:simple: npm run build && cp -r prompts dist/
  - prebuild:cli: npm run build
shared:
  - build: tsc
web:
  - build: next build
worker:
  - build: tsc --project .

## Environment Variables Audit

### .env.example
AUTH_SECRET
CLI_PATH
CONVEX_DEPLOYMENT
CONVEX_URL
FONDATION_WORKER_IMAGE
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
HEARTBEAT_INTERVAL
LEASE_TIME
MAX_CONCURRENT_JOBS
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_CONVEX_URL
NEXTAUTH_SECRET
NEXTAUTH_URL
NODE_ENV
POLL_INTERVAL
SKIP_ENV_VALIDATION
TEMP_DIR
VERBOSE
WORKER_GATEWAY_URL
WORKER_ID
WORKER_MODE
### packages/web/.env.example
AUTH_SECRET
CONVEX_DEPLOYMENT
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
NEXT_PUBLIC_CONVEX_URL
NEXTAUTH_SECRET
NEXTAUTH_URL
WORKER_GATEWAY_URL
### packages/cli/.env
GITHUB_TOKEN
### packages/web/.env
ANTHROPIC_API_KEY
AUTH_SECRET
CONVEX_DEPLOYMENT
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
NEXT_PUBLIC_CONVEX_URL
NEXTAUTH_SECRET
NEXTAUTH_URL
SCALEWAY_GATEWAY_URL

### Variables Used in Code:
AUTH_SECRET
CLAUDE_MODEL
CLAUDE_OUTPUT_DIR
CLI_PATH
CONVEX_DEPLOYMENT
CONVEX_URL
DEBUG_KEYS
DOCKER_CONTAINER
ENCRYPTION_KEY
FONDATION_WORKER_IMAGE
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
HEARTBEAT_INTERVAL
LEASE_TIME
MAX_CONCURRENT_JOBS
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_CONVEX_URL
NEXT_PUBLIC_LOG_ENDPOINT
NEXTAUTH_SECRET
NEXTAUTH_URL
NODE_ENV
PACKAGE_JSON
POLL_INTERVAL
TEMP_DIR
VERCEL_URL
WORKER_GATEWAY_URL
WORKER_ID

## Identified Conflicts & Issues

### 1. Dependency Version Conflicts
- **React**: Inconsistent versions (^19.0.0 vs ^19.1.0)
- **@types/node**: Inconsistent versions (^20.14.10 vs ^20.19.4)
- **@types/react**: CLI has ^19.1.8, web has ^19.0.0
- **Convex**: Root has ^1.26.2, packages have ^1.26.1
- **Zod**: Inconsistent versions (^3.24.2 vs ^3.25.67)
- **Biome**: CLI has older version (^2.0.6 vs ^2.2.2 in root)

### 2. TypeScript Configuration Conflicts
- **moduleResolution**: Inconsistent (root: "node", cli: "bundler", web: "bundler")
- **jsx**: Different settings (cli: "react-jsx", web: "preserve", others: null)
- **target**: Not consistently defined across packages
- **Inheritance**: Some packages don't properly extend root config

### 3. Build System Issues
- **CLI**: Uses custom esbuild script (bundle-cli.js) + TypeScript
- **Web**: Uses Next.js build
- **Worker**: Uses plain TypeScript compilation
- **Shared**: Uses plain TypeScript compilation
- **No standardized build orchestration**

### 4. Environment Variable Issues
- **Missing in .env.example but used in code**:
  - CLAUDE_MODEL, CLAUDE_OUTPUT_DIR
  - DEBUG_KEYS, ENCRYPTION_KEY
  - DOCKER_CONTAINER
  - NEXT_PUBLIC_LOG_ENDPOINT
  - PACKAGE_JSON
  - VERCEL_URL
  
- **Defined but not used**:
  - VERBOSE (in .env.example)
  - NODE_ENV (in .env.example but always set by runtime)
  
- **Duplicate/Redundant**:
  - AUTH_SECRET and NEXTAUTH_SECRET (same purpose)
  - Multiple .env files across packages

### 5. Configuration File Redundancies
- **Multiple .env files**: Root, web, cli all have separate .env files
- **Duplicate package-lock.json**: CLI has its own (should use bun.lockb)
- **Empty/unused files**: packages/web/empty.json
- **ESLint remnants**: Despite switching to Biome

### 6. Package Manager Conflicts
- **Mixed lock files**: package-lock.json in CLI vs bun.lockb in root
- **NPM scripts in CLI**: Uses npm instead of bun in some scripts

### 7. Missing Standardization
- **No workspace protocol**: Not using workspace:* for internal dependencies
- **Inconsistent script naming**: build vs build:cli vs prebuild:cli
- **No shared dev dependencies**: Each package duplicates common deps

## Resolution Plan

### Phase 1: Dependency Standardization (Priority: HIGH)
1. **Align React versions** → Use ^19.1.0 everywhere
2. **Align @types/node** → Use ^20.19.4 everywhere  
3. **Align @types/react** → Use ^19.1.8 everywhere
4. **Align Convex** → Use ^1.26.2 everywhere
5. **Align Zod** → Use ^3.25.67 everywhere
6. **Remove duplicate Biome** → Use only root ^2.2.2

### Phase 2: TypeScript Configuration (Priority: HIGH)
1. **Root tsconfig.json**: Keep as base with strict defaults
2. **CLI tsconfig.json**: Only override for bundler needs
3. **Web tsconfig.json**: Only override for Next.js needs
4. **Worker/Shared**: Minimal overrides, inherit most from root
5. **Standardize moduleResolution**: Use "bundler" for build packages, "node" for libraries

### Phase 3: Environment Variables (Priority: HIGH)
1. **Consolidate to single .env.example** at root
2. **Add missing variables** that are used in code
3. **Remove duplicate AUTH_SECRET/NEXTAUTH_SECRET** → Use only AUTH_SECRET
4. **Document each variable** with comments
5. **Remove package-specific .env files**

### Phase 4: Clean Up Redundancies (Priority: MEDIUM)
1. **Remove packages/cli/package-lock.json** → Use bun.lockb
2. **Delete packages/web/empty.json**
3. **Remove ESLint config remnants**
4. **Clean up duplicate .env files**
5. **Update CLI scripts** to use bun instead of npm

### Phase 5: Package Manager Standardization (Priority: MEDIUM)
1. **Use bun everywhere** in scripts
2. **Remove package-lock.json files**
3. **Add .npmrc to force bun usage**
4. **Update Docker builds** to use bun

### Phase 6: Build System Improvements (Priority: LOW)
1. **Document why different build tools** are needed
2. **Standardize output directories** (all to dist/)
3. **Align script naming conventions**
4. **Consider workspace protocol** for internal deps

### Implementation Order
1. Fix dependency versions (can break builds if not done)
2. Fix TypeScript configs (affects compilation)
3. Fix environment variables (affects runtime)
4. Clean up redundancies (housekeeping)
5. Standardize package manager (consistency)
6. Improve build system (optimization)

### Testing After Each Phase
- Run `bun run typecheck` after dependency changes
- Run `bun run build` after TypeScript changes
- Test full E2E flow after environment changes
- Verify Docker builds still work

## Final Status

Audit complete. Found:
- 6 dependency version conflicts
- 4 TypeScript configuration inconsistencies
- 8 missing environment variables
- 5 redundant configuration files
- 2 package manager conflicts

Total issues to resolve: 25

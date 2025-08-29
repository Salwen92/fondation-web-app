# Monorepo Build Separation Plan

## 🎯 **OBJECTIVES**
1. Make each package buildable independently 
2. Properly separate source (.ts) from build artifacts (.js)
3. Remove cross-package contamination
4. Enable standalone deployment of web and worker
5. Fix TypeScript compilation issues

## 📦 **PACKAGE STRUCTURE (TARGET STATE)**

```
packages/
├── shared/          # Types & utilities (buildable independently)
│   ├── src/         # Only .ts files
│   └── dist/        # Only .js/.d.ts files
├── web/             # Next.js app (standalone)
│   ├── src/         # Only .tsx/.ts files  
│   ├── convex/      # Convex backend code
│   └── .next/       # Build artifacts
├── worker/          # Job processor (standalone)
│   ├── src/         # Only .ts files
│   └── dist/        # Only .js/.d.ts files
└── cli/             # CLI tool (standalone)
    ├── src/         # Only .ts/.tsx files
    └── dist/        # Only .js files + bundle
```

## 🚫 **DEPENDENCY RULES**

### ✅ ALLOWED:
- worker → shared (via workspace protocol)
- web → shared (via workspace protocol) 
- cli → shared (via workspace protocol)

### ❌ FORBIDDEN:
- worker → web (direct imports)
- web → worker
- cli → web  
- cli → worker

## 📋 **EXECUTION PHASES**

### **Phase 1: Clean Source Contamination** ⚠️  
- Remove all .js/.d.ts files from src/ directories
- Ensure src/ contains ONLY TypeScript source files
- Clean dist/ directories completely

### **Phase 2: Fix Cross-Package Dependencies**
- Remove worker imports from `../../web/convex/_generated/`
- Create proper interface in shared package for Convex types
- Use dependency injection pattern for Convex client

### **Phase 3: Fix TypeScript Configuration**
- Create proper project references between packages
- Ensure each package can build in isolation
- Fix tsconfig inheritance chain

### **Phase 4: Implement Proper Build Pipeline**
- Use TypeScript for all packages (consistent tooling)
- Implement proper build order: shared → worker/web/cli
- Add build validation scripts

### **Phase 5: Docker Integration Fix**
- Update Dockerfile to work with clean build artifacts
- Implement proper runtime configuration for Convex API access
- Test end-to-end deployment

### **Phase 6: Validation & Testing**
- Verify each package builds independently 
- Test monorepo build script
- Validate Docker deployment works

## 🔧 **TECHNICAL IMPLEMENTATION**

### Convex Dependency Solution:
Instead of direct imports, use runtime configuration:

```typescript
// In worker - NO direct imports from web
const convexConfig = {
  url: process.env.CONVEX_URL,
  // API methods loaded at runtime via environment
}
```

### Build Order:
```bash
1. bun run build --filter '@fondation/shared'
2. bun run build --filter '@fondation/worker'  
3. bun run build --filter '@fondation/web'
4. bun run build --filter '@fondation-io/fondation' # CLI
```

## ✅ **SUCCESS CRITERIA**
- [ ] Each package builds independently without errors
- [ ] No .js files in src/ directories 
- [ ] Worker runs without direct web imports
- [ ] Docker deployment works with clean artifacts
- [ ] Monorepo build completes successfully
- [ ] Web app can run standalone
- [ ] Worker can run standalone

## 🚀 **IMMEDIATE ACTIONS**
1. Clean contaminated source directories
2. Remove forbidden cross-package imports  
3. Fix TypeScript configurations
4. Rebuild each package cleanly
5. Update Docker build process

**PRIORITY**: HIGH - Current state prevents proper development and deployment
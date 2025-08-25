# Claude Enhancement Tracker

**Branch:** `audit/claude-fixes`  
**Worktree:** `/Users/salwen/Documents/Cyberscaling/fondation-claude-fixes`  
**Start Date:** August 25, 2025  
**Base Commit:** `0bf4e7c`

## Code Quality Rules & Checkpoints

### 🔒 Non-Negotiable Rules
1. **Read Before Edit**: Always read entire files before making changes
2. **Type Safety First**: Never introduce `any` types or unsafe casts
3. **Test After Change**: Run type checking and linting after each modification
4. **Atomic Commits**: One logical change per commit with descriptive message
5. **French UI Preservation**: Maintain French localization throughout
6. **Architecture Respect**: Follow existing patterns and boundaries

### 🎯 Quality Checkpoints
- [ ] TypeScript compilation passes: `bun run typecheck`
- [ ] ESLint passes: `bun run lint`
- [ ] All imports resolve correctly
- [ ] No console.log statements in production code
- [ ] French translations maintained
- [ ] Existing functionality preserved

---

## 🚨 Priority 0 Fixes (Production Blockers)

### F-19: Production URLs (CRITICAL)
**Files:** `src/components/repos/repo-card.tsx:106`, `src/app/course/[owner]/[repo]/[jobId]/course-content.tsx:118`  
**Issue:** Hardcoded localhost URLs prevent production deployment  
**Status:** ❌ Pending  
**Estimate:** 30 minutes  

**Implementation Plan:**
1. Create `src/lib/config.ts` for environment-aware URLs
2. Replace hardcoded callbacks with dynamic generation
3. Test in both dev and simulated production environment

**Progress Tracking:**
- [ ] Read affected files completely
- [ ] Create configuration utility
- [ ] Update repo-card.tsx callback URL
- [ ] Update course-content.tsx callback URL  
- [ ] Test URL generation in different environments
- [ ] Commit atomic change with descriptive message

### F-14: Database Schema Type Safety (CRITICAL)
**Files:** `convex/schema.ts:42`, `convex/jobs.ts:122`, `convex/cloudRun.ts:21`  
**Issue:** `v.any()` usage allows invalid data structures  
**Status:** ❌ Pending  
**Estimate:** 45 minutes  

**Implementation Plan:**
1. Define strongly typed interfaces for job results
2. Replace `v.any()` with proper schema definitions
3. Update all mutation handlers to use typed schemas

**Progress Tracking:**
- [ ] Read all affected Convex files completely
- [ ] Design JobResult interface based on worker output
- [ ] Update schema.ts with typed result schema
- [ ] Update jobs.ts mutation handlers
- [ ] Update cloudRun.ts mutation handlers
- [ ] Test schema migrations work correctly
- [ ] Commit atomic change with descriptive message

---

## ⚠️ Priority 1 Fixes (High Impact)

### F-15: Unsafe Database Casting
**Files:** `convex/docs.ts:348`  
**Issue:** `docId as any` bypasses Convex type safety  
**Status:** ❌ Pending  
**Estimate:** 15 minutes  

### F-20: Accessibility Support  
**Files:** Throughout UI components  
**Issue:** Zero ARIA labels exclude disabled users  
**Status:** ❌ Pending  
**Estimate:** 2 hours  

### F-08: Translation Logic Centralization
**Files:** `src/components/repos/repo-card.tsx:34-74`  
**Issue:** Hardcoded translations scattered across components  
**Status:** ❌ Pending  
**Estimate:** 1.5 hours  

---

## 📋 Priority 2 Fixes (Quality Improvements)

### F-10: Production Console Logging
**Files:** `src/app/(dashboard)/page.tsx:16`  
**Issue:** Session data exposed in production logs  
**Status:** ❌ Pending  
**Estimate:** 10 minutes  

### F-13: Environment Path Hardcoding
**Files:** `scaleway-worker/worker.js:198-201`  
**Issue:** Development paths break deployment portability  
**Status:** ❌ Pending  
**Estimate:** 15 minutes  

### F-12: Mock Data Replacement
**Files:** `src/components/repos/repo-card.tsx:84`  
**Issue:** Mock language data displays incorrect information  
**Status:** ❌ Pending  
**Estimate:** 1 hour  

---

## 🔄 Progress Tracking System

### Current Session State
```json
{
  "activeWorktree": "/Users/salwen/Documents/Cyberscaling/fondation-claude-fixes",
  "currentBranch": "audit/claude-fixes", 
  "baseCommit": "0bf4e7c",
  "filesModified": [],
  "lastCheckpoint": "Enhancement tracker created",
  "nextTask": "F-19: Fix production URL hardcoding"
}
```

### Session Recovery Protocol
If I lose context, I will:
1. Check `git status` in the Claude fixes worktree
2. Review this tracker file for current progress
3. Run quality checkpoints to ensure no regressions
4. Continue from the last incomplete task
5. Update progress tracking before proceeding

### Quality Assurance Commands
```bash
# Always run before committing
cd /Users/salwen/Documents/Cyberscaling/fondation-claude-fixes
bun run typecheck    # Must pass
bun run lint        # Must pass  
git status          # Review all changes
git diff --cached   # Review staged changes
```

---

## 📊 Success Metrics

### Technical Metrics
- [ ] 100% TypeScript compilation success
- [ ] 0 ESLint errors or warnings
- [ ] All hardcoded URLs replaced with dynamic generation
- [ ] All `v.any()` types replaced with proper interfaces
- [ ] Basic ARIA support added to interactive elements

### Functional Metrics  
- [ ] Course generation works in simulated production environment
- [ ] All existing functionality preserved
- [ ] No regression in loading times or UI responsiveness
- [ ] French translations maintained throughout

### Process Metrics
- [ ] Each commit represents one logical change
- [ ] All commits have descriptive messages
- [ ] No temporary or debugging code committed
- [ ] Enhancement tracker updated after each task

---

*This tracker will be updated continuously throughout the enhancement process to maintain accountability and progress visibility.*
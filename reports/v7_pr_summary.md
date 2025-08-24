# PR: V7 Regeneration Hardening & Data Cleanup

## Overview
Implements idempotent document regeneration and resolves duplicate chapter rendering issue.

## What Changed

### Core Changes
- **convex/schema.ts**: Added tracking fields (sourceKey, runId, updatedAt) for deduplication
- **convex/docs.ts**: Implemented idempotent upsert logic with source key derivation
- **course-content.tsx**: Retained v5 read-path deduplication as fallback safety
- **New layout**: Added course/layout.tsx for consistent course viewer structure

### Key Features
1. **Source Key Derivation**: Creates deterministic keys from `repositoryId:normalizedSlug:title`
2. **Empty Content Guards**: Rejects chapters/tutorials with empty content
3. **Idempotent Upsert**: Updates existing docs instead of creating duplicates
4. **Cleanup Function**: Removes existing duplicates with smart selection
5. **Statistics Tracking**: Reports inserted/updated/skipped/rejected/deleted counts

## Why It's Safe

### Protection Mechanisms
- **Idempotent**: Multiple regenerations produce same result (verified: 0 inserts on re-run)
- **Content Guards**: Prevents empty documents from entering database
- **Atomic Operations**: All changes succeed or none apply
- **Backward Compatible**: V5 client-side deduplication retained as fallback

### Verification Results
- ✅ Single chapter entry (no duplicates)
- ✅ Chapter renders with full content (9,235 chars)
- ✅ Tutorial/Reference load normally
- ✅ No data issue badges displayed
- ✅ Regeneration creates 0 new docs (idempotent)

## Rollback Plan

If issues arise:
1. `git revert HEAD` - Revert this commit
2. `npx convex deploy` - Deploy previous functions
3. Run `cleanupDuplicates` with dryRun first to assess
4. Contact team if data restoration needed

## Testing Evidence

### Before Fix
- 6 documents (1 duplicate group)
- Empty 0-byte chapter alongside populated version

### After Fix
- 5 documents (0 duplicates)
- Clean regeneration with stats: inserted=0, updated=1, deleted=4

## External Artifacts
Runtime artifacts (screenshots, dumps, manifests) excluded from git per .gitignore rules.

## Commit Info
- Branch: `fix/v7-regen-hardening`
- Commit: 7874417
- Files: 7 changed, 646 insertions, 35 deletions

## Related Issues
Resolves: Duplicate chapter rendering in course viewer

## Review Checklist
- [ ] Schema migrations handled correctly
- [ ] Convex functions deployed successfully
- [ ] No runtime artifacts in repository
- [ ] Client-side deduplication still functional
- [ ] Regeneration confirmed idempotent
# Phase 2: Search & Filtering - Implementation Notes

## Current State Analysis (Baseline)
**Date:** 2025-01-09  
**Branch:** phase-2-search-filtering  
**Previous:** Phase 1 completed successfully

### Existing Architecture Study
- **Course Hub Location:** `/packages/web/src/app/dashboard/docs/page.tsx`
- **Current Filtering:** Shows only completed courses with deduplication
- **Data Source:** `useQuery(api.jobs.listUserJobs)` and `useQuery(api.repositories.listUserRepositories)`
- **State Management:** React.useMemo for completedJobsPerRepo
- **UI Pattern:** Grid layout with course cards

### Components to Study
1. `/components/repos/repo-card.tsx` - Current card structure
2. `/app/dashboard/docs/page.tsx` - Current filtering logic  
3. `/components/ui/` - Available shadcn components
4. Existing search patterns in codebase

### Phase 2 Scope (APPROVED)
✅ Simple client-side search by course name/repository name  
✅ Status filters (All, Completed, Failed, In Progress)  
✅ Sort options (Date, Name, Doc Count)  
✅ No backend changes needed  

## Quality Standards for This Phase
- [ ] Study existing patterns thoroughly
- [ ] Maintain French language consistency
- [ ] Use existing shadcn components only
- [ ] Test desktop AND mobile with Playwright MCP
- [ ] Run typecheck && lint && format:check after each change
- [ ] Atomic commits with detailed messages

## Implementation Plan
1. Analyze current filtering patterns
2. Study shadcn input and select components  
3. Create search utilities (client-side only)
4. Implement search bar component
5. Add filter/sort controls
6. Update main page with search functionality
7. Test thoroughly on all viewports

## Files to Modify/Create (Planned)
- **NEW:** `components/course/course-search-bar.tsx`
- **NEW:** `components/course/course-filters.tsx` 
- **NEW:** `lib/course-search.ts`
- **MODIFY:** `app/dashboard/docs/page.tsx`

**NEVER TOUCH:** Any files in packages/cli/
# Phase 2: Course Search & Filtering

**Complexity: Low**  
**Estimated Effort: 2-3 days**

## Objective
Add basic search and filtering capabilities to the Course Hub for improved course discoverability.

## Detailed Action Plan

### 1. Create Search Components
**File: `packages/web/src/components/course/course-search-bar.tsx`** (NEW)
- Create reusable search input component
- Add search icon and clear functionality  
- Implement debounced search input (300ms delay)
- Add keyboard shortcuts (Ctrl+K to focus)

**File: `packages/web/src/components/course/course-filters.tsx`** (NEW)
- Create filter dropdown component
- Add status filters: All, Completed, Failed, In Progress
- Add sort options: Date Created (desc/asc), Name (A-Z/Z-A), Docs Count (high/low)
- Use shadcn dropdown-menu component

### 2. Enhance Course Hub Page
**File: `packages/web/src/app/dashboard/docs/page.tsx`** (MODIFY)
- Add search bar above course grid (line ~137)
- Add filters section below search bar
- Implement search state management with React.useState
- Modify completedJobsPerRepo useMemo to include search/filter logic
- Add empty state for "No courses found" with current search terms

### 3. Add Search Utilities
**File: `packages/web/src/lib/course-search.ts`** (NEW)
- Create searchCourses function for repository name/description matching
- Create filterCourses function for status/date filtering  
- Create sortCourses function for different sort options
- Use fuzzy string matching for better search results

### 4. Update Layout and Styling  
**File: `packages/web/src/app/dashboard/docs/page.tsx`** (MODIFY)
- Adjust grid layout to accommodate search/filter section
- Add responsive design for mobile search
- Update empty state messaging with search context
- Add search result count display ("8 cours trouvés")

### 5. State Management Enhancement
- Add search state persistence in sessionStorage
- Implement URL query params for shareable search results
- Add clear filters functionality

## Files Modified/Created
- **NEW:** `packages/web/src/components/course/course-search-bar.tsx`
- **NEW:** `packages/web/src/components/course/course-filters.tsx` 
- **NEW:** `packages/web/src/lib/course-search.ts`
- **MODIFY:** `packages/web/src/app/dashboard/docs/page.tsx`

## Expected Outcome
Users can search courses by name/description, filter by status, and sort results. Search state is persistent and URLs are shareable.
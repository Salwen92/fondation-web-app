# Phase 3: Course Interaction Enhancements

**Complexity: Low-Medium**  
**Estimated Effort: 3-4 days**

## Objective
Enhance user interaction with courses through improved navigation, preview capabilities, and bulk actions.

## Detailed Action Plan

### 1. Recently Viewed Courses
**File: `packages/web/src/hooks/use-recent-courses.tsx`** (NEW)  
- Create hook to track course visits in localStorage
- Store course ID, timestamp, and basic metadata
- Limit to 5 most recent courses
- Implement automatic cleanup of old entries

**File: `packages/web/src/components/course/recent-courses.tsx`** (NEW)
- Create horizontal scrollable recent courses section
- Display course cards in compact format
- Add "View All Recent" link
- Show last visited timestamp

**File: `packages/web/src/app/dashboard/docs/page.tsx`** (MODIFY)
- Add recent courses section above main course grid (line ~120)
- Only show section when user has recent courses
- Track course visits when "Voir le cours" is clicked

### 2. Course Preview Modal
**File: `packages/web/src/components/course/course-preview-modal.tsx`** (NEW)
- Create modal showing course overview
- Display first 3 document titles and summaries
- Show total documents, generation date, repository info
- Add quick actions: View Full Course, Regenerate, Delete
- Use shadcn dialog component

**File: `packages/web/src/components/repos/repo-card.tsx`** (MODIFY)  
- Add "Preview" button next to "Voir le Cours" button (line ~275)
- Implement preview modal state management
- Add preview functionality for completed courses only

### 3. Bulk Course Actions
**File: `packages/web/src/components/course/bulk-actions-toolbar.tsx`** (NEW)
- Create floating action bar for bulk operations
- Add select all/none functionality
- Include actions: Delete Selected, Export Selected
- Show selected count and total count

**File: `packages/web/src/app/dashboard/docs/page.tsx`** (MODIFY)
- Add checkbox to each course card for selection
- Implement multi-select state management
- Add bulk actions toolbar above course grid
- Handle bulk delete with confirmation modal

### 4. Course Sharing & Export
**File: `packages/web/src/lib/course-sharing.ts`** (NEW)
- Create shareable course link generation
- Implement course metadata export (JSON format)
- Add copy-to-clipboard functionality
- Generate public course URLs

**File: `packages/web/src/components/course/share-course-modal.tsx`** (NEW)
- Create sharing modal with link generation
- Add social media sharing buttons
- Include export options (metadata, PDF link)
- Copy link button with toast confirmation

### 5. Enhanced Course Cards  
**File: `packages/web/src/components/repos/repo-card.tsx`** (MODIFY)
- Add quick action menu (3-dot menu) to each card
- Include actions: Preview, Share, Export, Delete
- Add selection checkbox for bulk operations
- Improve card hover states and interactions

### 6. Course Management Utilities
**File: `packages/web/src/lib/course-management.ts`** (NEW)
- Create course deletion utility functions
- Implement course export functionality  
- Add course sharing utilities
- Handle batch operations efficiently

## Files Modified/Created
- **NEW:** `packages/web/src/hooks/use-recent-courses.tsx`
- **NEW:** `packages/web/src/components/course/recent-courses.tsx`
- **NEW:** `packages/web/src/components/course/course-preview-modal.tsx`
- **NEW:** `packages/web/src/components/course/bulk-actions-toolbar.tsx`
- **NEW:** `packages/web/src/components/course/share-course-modal.tsx`
- **NEW:** `packages/web/src/lib/course-sharing.ts`
- **NEW:** `packages/web/src/lib/course-management.ts`
- **MODIFY:** `packages/web/src/app/dashboard/docs/page.tsx`
- **MODIFY:** `packages/web/src/components/repos/repo-card.tsx`

## Expected Outcome
Users can preview courses, track recently viewed courses, perform bulk operations, and easily share course links. Enhanced interaction patterns make course management more efficient.
# Phase 3: Essential Course Interactions (REVISED)

**Complexity: Low**  
**Estimated Effort: 3-4 days**

## Objective
Add essential course interaction features that improve navigation and sharing without overcomplicating the core documentation generation mission.

## Detailed Action Plan

### 1. Recently Viewed Courses
**File: `packages/web/src/hooks/use-recent-courses.tsx`** (NEW)  
- Track last 5 course visits in localStorage
- Store course ID, name, timestamp only
- Auto-cleanup old entries (30 days)

**File: `packages/web/src/app/dashboard/docs/page.tsx`** (MODIFY)
- Add "Recently Viewed" section above course grid if user has history
- Show 3 most recent courses in compact horizontal layout
- Track visits when "Voir le cours" button is clicked

### 2. Course Preview Modal
**File: `packages/web/src/components/course/course-preview-modal.tsx`** (NEW)
- Show course overview: title, description, document count, generation date
- Display first 3 document titles as preview
- Add "View Full Course" and "Close" buttons only
- Use existing shadcn dialog component

**File: `packages/web/src/components/repos/repo-card.tsx`** (MODIFY)  
- Add small "Preview" button (eye icon) next to "Voir le Cours" 
- Only show for completed courses
- Open preview modal on click

### 3. Simple Course Sharing
**File: `packages/web/src/lib/course-sharing.ts`** (NEW)
- Generate shareable course URLs (`/course/{owner}/{repo}/latest`)
- Create copy-to-clipboard function
- No complex permissions - just public URL generation

**File: `packages/web/src/components/course/share-button.tsx`** (NEW)
- Simple share button with copy link functionality
- Show toast confirmation when link copied
- No social media integrations or export options

**File: `packages/web/src/components/repos/repo-card.tsx`** (MODIFY)
- Add share button to completed course cards
- Small share icon in card header

## Removed from Original Plan
- ❌ Bulk actions toolbar (not needed for individual course generation)
- ❌ Course export in multiple formats (overengineered)
- ❌ Course management utilities (too complex)
- ❌ Social sharing buttons (unnecessary)

## Files Modified/Created
- **NEW:** `packages/web/src/hooks/use-recent-courses.tsx`
- **NEW:** `packages/web/src/components/course/course-preview-modal.tsx`
- **NEW:** `packages/web/src/components/course/share-button.tsx`
- **NEW:** `packages/web/src/lib/course-sharing.ts`
- **MODIFY:** `packages/web/src/app/dashboard/docs/page.tsx`
- **MODIFY:** `packages/web/src/components/repos/repo-card.tsx`

## Expected Outcome
Users can quickly return to recently viewed courses, preview course content before entering, and easily share course links with their team. Simple, focused improvements that enhance the core documentation experience.
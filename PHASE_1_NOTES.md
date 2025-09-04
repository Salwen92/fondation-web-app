# PHASE 1: Course Hub Foundation - Implementation Notes

## Objective
Transform "Documentation" → "Mes Cours" and display ALL course statuses for complete visibility.

## File Analysis Summary

### Files Requiring Changes

#### 1. Navigation Menu (`/dashboard/layout.tsx`)
- **Line 62**: `<span>Documentation</span>` → `<span>Mes Cours</span>`
- **Impact**: Main navigation header
- **Testing**: Verify navigation link still works

#### 2. Main Page Headers (`/dashboard/docs/page.tsx`)
- **Line 55**: Page title "Documentation" → "Mes Cours"  
- **Line 87**: Secondary title "Documentation" → "Mes Cours"
- **Lines 58-59**: Description text needs course-focused messaging
- **Line 90**: Count message needs course terminology

#### 3. Query Logic Changes (`/dashboard/docs/page.tsx`)
- **Current**: Only shows `status === 'completed'` jobs (line 37)
- **Required**: Show ALL job statuses (pending, claimed, cloning, analyzing, gathering, running, completed, failed, dead, canceled)
- **Dependencies**: `jobs.listUserJobs` query already returns all jobs

### Design Pattern Analysis

#### Status Badge System Required
- **Colors**: Success (green), Warning (yellow), Error (red), Info (blue), Neutral (gray)
- **Icons**: From existing imports (CheckCircle, Clock, XCircle, AlertCircle)
- **Existing Pattern**: Similar to course-content.tsx status display (lines 108-132)

#### Card Enhancement Strategy
- **Current Cards**: Repository-focused metadata
- **Enhancement**: Add status badges, creation timestamps, error handling
- **Existing Icons**: Book, Calendar, ExternalLink, FileText already imported

### Technical Constraints

#### Biome Configuration
- **Quotes**: Single quotes for strings, double for JSX
- **Line Width**: 100 characters max
- **Formatting**: 2-space indentation, trailing commas

#### TypeScript Requirements
- **Strict Typing**: All job status types must be properly typed
- **Import Types**: Use `import type` for type-only imports
- **No Unused Variables**: Strict enforcement

#### Design System Consistency
- **Glass Morphism**: `.glass` and `.glass-hover` classes
- **Gradients**: Purple-to-pink gradient patterns
- **Colors**: Border, muted, foreground color tokens
- **French Language**: All user-facing text in French

## Implementation Strategy

### Step 1: Rename Navigation (Low Risk)
1. Update navigation text in dashboard layout
2. Update page headers and descriptions
3. Test navigation functionality
4. Verify responsive behavior

### Step 2: Expand Job Display (Medium Risk)
1. Remove completed job filter
2. Add status badge component inline
3. Test with various job states
4. Ensure error handling for missing data

### Step 3: Enhanced Status Display (Medium Risk)
1. Create status mapping function
2. Add appropriate icons and colors
3. Handle edge cases (unknown status)
4. Test visual hierarchy

### Step 4: Error State Handling (High Care)
1. Display failed job error messages
2. Add retry functionality hooks
3. Handle empty/null data gracefully
4. Maintain existing error boundaries

## Validation Checklist

### Functional Testing
- [ ] Navigation link works correctly
- [ ] All job statuses visible
- [ ] Status badges display properly
- [ ] Error messages show for failed jobs
- [ ] Mobile responsive layout
- [ ] Empty states work correctly

### Code Quality
- [ ] TypeScript compiles without errors
- [ ] Biome linting passes
- [ ] No new console warnings
- [ ] Proper French language consistency
- [ ] Design system adherence

### Regression Testing
- [ ] Existing course viewing still works
- [ ] Real-time updates don't break
- [ ] Authentication flow unaffected
- [ ] Performance remains acceptable

## Risk Assessment

### Low Risk Changes
- Navigation text updates
- Page header modifications
- Color and icon additions

### Medium Risk Changes
- Query logic modifications
- Status display logic
- Card layout enhancements

### High Care Areas
- Error state handling
- Data type assumptions
- Real-time update compatibility

## Implementation Plan

1. **Rename Phase**: Update all text references
2. **Query Phase**: Modify job filtering logic
3. **Display Phase**: Add status badges and enhanced metadata
4. **Polish Phase**: Error handling and edge cases
5. **Testing Phase**: Comprehensive validation across all states

Ready to proceed with methodical implementation.
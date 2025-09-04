# Phase 5: Export & Integration

**Complexity: Medium**  
**Estimated Effort: 3-4 days**

## Objective
Add practical export options and basic integrations that help users use generated documentation in their workflow.

## Detailed Action Plan

### 1. Simple Export Options
**File: `packages/web/src/lib/course-export.ts`** (NEW)
- Export course as single markdown file (concatenated docs)
- Export as ZIP file with individual markdown files
- Generate PDF export link (using existing course viewer)
- Add export with custom formatting options (headers, TOC)

**File: `packages/web/src/components/course/export-menu.tsx`** (NEW)
- Dropdown menu with export options
- Show export progress for large courses
- Add download links with proper filenames
- Simple export customization (include/exclude sections)

### 2. GitHub Integration
**File: `packages/web/src/lib/github-integration.ts`** (NEW)
- Create GitHub issue with generated documentation link
- Add option to create PR with documentation updates
- Simple webhook to auto-regenerate on repository updates
- Connect to existing GitHub OAuth for permissions

**File: `packages/web/src/components/course/github-actions.tsx`** (NEW)
- "Share to GitHub" button for creating issues
- "Create Documentation PR" for repositories user has access to
- "Setup Auto-Sync" for webhook configuration
- Show GitHub connection status

### 3. Offline Reading Support
**File: `packages/web/src/lib/offline-export.ts`** (NEW)
- Generate self-contained HTML file with embedded CSS/JS
- Create progressive web app (PWA) manifest for offline access
- Add "Save for Offline" functionality
- Include search within offline version

**File: `packages/web/src/components/course/offline-actions.tsx`** (NEW)
- "Save for Offline Reading" button
- PWA install prompt for mobile users
- Offline status indicator
- Sync button to update offline version

### 4. Team Sharing (Simple)
**File: `packages/web/src/lib/team-sharing.ts`** (NEW)
- Generate shareable team dashboard URLs
- Create simple team invitation links (no complex permissions)
- Add basic team course organization
- Simple team member listing

**File: `packages/web/src/components/team/simple-team-view.tsx`** (NEW)
- Basic team course listing
- Add/remove team members by email
- Share team dashboard link
- Show team generation activity

### 5. API Access
**File: `packages/web/src/app/api/course/[courseId]/export/route.ts`** (NEW)
- REST API endpoint for course data export
- Support JSON, markdown, and HTML formats
- Add API key authentication for programmatic access
- Rate limiting and basic security

**File: `packages/web/src/components/settings/api-settings.tsx`** (NEW)
- Generate and manage API keys
- Show API usage examples
- Add API rate limit information
- Simple API documentation

### 6. Integration with Documentation Tools
**File: `packages/web/src/lib/doc-tool-integration.ts`** (NEW)
- Export format compatible with GitBook
- Generate Notion import format
- Create Confluence import format
- Add Obsidian vault export

**File: `packages/web/src/components/course/integration-menu.tsx`** (NEW)
- "Export to..." menu with popular documentation tools
- One-click export with proper formatting
- Copy import instructions for each tool
- Show compatibility status

## Files Modified/Created
- **NEW:** `packages/web/src/lib/course-export.ts`
- **NEW:** `packages/web/src/lib/github-integration.ts`
- **NEW:** `packages/web/src/lib/offline-export.ts`
- **NEW:** `packages/web/src/lib/team-sharing.ts`
- **NEW:** `packages/web/src/lib/doc-tool-integration.ts`
- **NEW:** `packages/web/src/components/course/export-menu.tsx`
- **NEW:** `packages/web/src/components/course/github-actions.tsx`
- **NEW:** `packages/web/src/components/course/offline-actions.tsx`
- **NEW:** `packages/web/src/components/course/integration-menu.tsx`
- **NEW:** `packages/web/src/components/team/simple-team-view.tsx`
- **NEW:** `packages/web/src/components/settings/api-settings.tsx`
- **NEW:** `packages/web/src/app/api/course/[courseId]/export/route.ts`

## Expected Outcome
Users can export generated documentation in formats that fit their workflow, integrate with existing tools, share with team members, and access documentation offline. Practical integrations that extend Fondation's value without departing from its core mission of documentation generation.
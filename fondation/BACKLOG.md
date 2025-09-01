# Fondation Backlog

## UI/UX Improvements

### 🔴 High Priority

#### Add Cancel Functionality to Regeneration Modal
- **Component**: `/packages/web/src/components/repos/regenerate-modal.tsx`
- **Issue**: No way to cancel a regeneration once started
- **User Impact**: Users must wait 3-5 minutes or refresh page (loses context)
- **Solution**: 
  - Add "Annuler" button in modal during processing
  - Call cancel mutation when clicked
  - Show confirmation: "Êtes-vous sûr de vouloir annuler la régénération?"
  - Keep existing content intact on cancellation
- **Added**: 2025-09-01

### 🟡 Medium Priority

#### Translate Initial Job Status Messages
- **Issue**: "Analyzing codebase..." appears in English initially
- **Location**: Job creation in `convex/jobs.ts`
- **Fix**: Change to French: "Analyse du code en cours..."
- **Added**: 2025-09-01

## Technical Debt

### Step Progress Message Consistency
- **Issue**: Step 6 shows "Finalisation de l'analyse" instead of "Création des tutoriels"
- **Location**: `/packages/worker/src/cli-executor.ts`
- **Note**: Verify if this is intentional or needs alignment
- **Added**: 2025-09-01

## Features

### Real-time Progress Percentage Within Steps
- **Enhancement**: Show sub-progress within each step (e.g., "Generating chapter 3 of 8")
- **Benefit**: Better user feedback for long-running steps
- **Added**: 2025-09-01
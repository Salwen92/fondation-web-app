3. **Find the core orchestration logic** in `src/ui-analyze-all.tsx:235-485` (the `runWorkflow` function)

### Questions to Investigate

Before coding, explore these questions:

- How does each step communicate its results to the next step?
- What happens when a step fails? How is the error propagated?
- How does the skip logic work? (Hint: look at `src/ui-analyze-all.tsx:243-251`)
- What information is tracked in the logs?

## Step 2: Implement Core Functionality

Let's build a simplified workflow orchestrator for a document processing pipeline. Create a new file called `document-workflow.ts`:

```typescript
// TODO: Add necessary imports
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

// TODO: Define your workflow step interface
interface WorkflowStep {
  // HINT: Look at src/ui-analyze-all.tsx:15 for the WorkflowStep type
  // Your step should have: id, name, description, status
}

// TODO: Define your workflow state interface
interface DocumentWorkflowState {
  // HINT: Model this after AnalyzeAllState in src/ui-analyze-all.tsx:18-35
  // Include: currentStepIndex, overallProgress, logs, workflowSteps, error
}

// TODO: Define your workflow steps
const DOCUMENT_PROCESSING_STEPS: WorkflowStep[] = [
  // Step 1: Extract text from document
  {
    id: 'extract',
    name: 'Extract Text',
    description: 'Extracting text content from input document',
    status: 'pending'
  },
  // TODO: Add 2 more steps following the same pattern
];

class DocumentWorkflowOrchestrator {
  private state: DocumentWorkflowState;
  private outputDir: string;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
    // TODO: Initialize state with default values
    this.state = {
      // HINT: Look at src/ui-analyze-all.tsx:81-98 for initialization pattern
    };
  }

  // TODO: Implement addLog method
  private addLog(message: string): void {
    // HINT: Look at src/ui-analyze-all.tsx:100-105 for the pattern
  }

  // TODO: Implement updateWorkflowStep method
  private updateWorkflowStep(stepId: string, status: string): void {
    // HINT: Look at src/ui-analyze-all.tsx:114-121 for the pattern
  }

  // TODO: Implement ensureOutputDirectory method
  private async ensureOutputDirectory(): Promise<void> {
    // HINT: Look at src/ui-analyze-all.tsx:225-233 for the pattern
  }

  // TODO: Implement executeStep method
  private async executeStep(stepId: string, inputFile: string, outputFile: string): Promise<void> {
    // This should:
    // 1. Update step status to 'running'
    // 2. Add log entry
    // 3. Simulate processing (or implement real logic)
    // 4. Write output file
    // 5. Update step status to 'completed'
  }

  // TODO: Implement runWorkflow method
  async runWorkflow(inputFile: string): Promise<void> {
    try {
      await this.ensureOutputDirectory();
      
      // Step 1: Extract text
      const extractOutput = join(this.outputDir, 'step1_extracted.txt');
      
      // TODO: Check if file exists and implement skip logic
      // HINT: Look at src/ui-analyze-all.tsx:243-251 for skip pattern
      
      // TODO: Execute step if not skipping
      
      // TODO: Verify output was created
      
      // TODO: Update progress
      
      // TODO: Implement Steps 2 and 3 following the same pattern
      
    } catch (error) {
      // TODO: Implement error handling
      // HINT: Look at src/ui-analyze-all.tsx:447-475 for error handling pattern
    }
  }

  // TODO: Add getter methods for state access
  getState(): DocumentWorkflowState {
    return { ...this.state };
  }
}
```

### Implementation Hints

1. **State Updates**: Always use immutable updates when modifying state arrays
2. **File Validation**: Check that files exist before proceeding to next step
3. **Progress Calculation**: Update `overallProgress` as `stepIndex / totalSteps`
4. **Error Context**: Include step information in error messages

## Step 3: Add Real-World Features

Enhance your workflow orchestrator with production-ready features:

### 3.1: Add Resume Capability

```typescript
// TODO: Add to DocumentWorkflowOrchestrator class

private async checkExistingOutput(outputFile: string, stepId: string): Promise<boolean> {
  if (existsSync(outputFile)) {
    this.updateWorkflowStep(stepId, 'completed');
    this.addLog(`[SKIP] Using existing file: ${outputFile}`);
    return true;
  }
  return false;
}

// TODO: Update runWorkflow to use this method before each step
```

### 3.2: Add Detailed Error Handling

```typescript
// TODO: Add error types to your state interface
interface WorkflowError {
  message: string;
  details?: string;
  type?: 'file-system' | 'processing' | 'validation';
  step?: string;
}

// TODO: Add error handling method
private handleStepError(error: Error, stepId: string): void {
  // HINT: Look at src/ui-analyze-all.tsx:191-220 for error handling patterns
}
```

### 3.3: Add Progress Callbacks

```typescript
// TODO: Add callback interface
interface ProgressCallback {
  onStepStart?(stepId: string, stepName: string): void;
  onStepComplete?(stepId: string, stepName: string): void;
  onProgress?(current: number, total: number): void;
  onLog?(message: string): void;
}

// TODO: Update constructor to accept callbacks
// TODO: Call callbacks at appropriate times in runWorkflow
```

## Step 4: Test and Validate

Create a test file `test-document-workflow.ts`:

```typescript
import { DocumentWorkflowOrchestrator } from './document-workflow';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';

async function testBasicWorkflow() {
  console.log('🧪 Testing basic workflow execution...');
  
  // Setup test environment
  const testDir = './test-output';
  const inputFile = join(testDir, 'input.txt');
  
  // TODO: Create test input file
  await mkdir(testDir, { recursive: true });
  await writeFile(inputFile, 'Sample document content for testing');
  
  // TODO: Create and run workflow
  const orchestrator = new DocumentWorkflowOrchestrator(testDir);
  
  // TODO: Add progress tracking
  const state = orchestrator.getState();
  console.log('Initial state:', state);
  
  // TODO: Run workflow and verify results
  
  // TODO: Check that all expected files were created
  
  // TODO: Verify state shows completion
  
  console.log('✅ Basic workflow test passed');
}

async function testResumeCapability() {
  console.log('🧪 Testing resume capability...');
  
  // TODO: Run workflow partially
  // TODO: Simulate interruption
  // TODO: Restart workflow
  // TODO: Verify it skips completed steps
  
  console.log('✅ Resume capability test passed');
}

async function testErrorHandling() {
  console.log('🧪 Testing error handling...');
  
  // TODO: Create scenario that will cause an error
  // TODO: Verify error is captured correctly
  // TODO: Verify workflow stops appropriately
  
  console.log('✅ Error handling test passed');
}

// TODO: Run all tests
async function runTests() {
  try {
    await testBasicWorkflow();
    await testResumeCapability();
    await testErrorHandling();
    console.log('🎉 All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

runTests();
```

### Validation Checklist

- [ ] Workflow executes all steps in correct order
- [ ] Progress is tracked accurately at each step
- [ ] Logs provide clear information about what's happening
- [ ] Skip logic works when restarting workflow
- [ ] Errors are caught and reported with context
- [ ] Output files are created as expected
- [ ] State reflects current workflow status

## Step 5: Integration and Polish

### 5.1: Add TypeScript Strict Mode Compliance

```typescript
// TODO: Review your code for:
// - Proper null/undefined checks
// - Explicit return types on all methods
// - No 'any' types
// - Proper error type handling
```

### 5.2: Add Comprehensive Logging

Following the pattern in `src/ui-analyze-all.tsx:100-105`, enhance your logging:

```typescript
// TODO: Add different log levels
private addLog(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = `[${level.toUpperCase()}] ${timestamp}: ${message}`;
  // TODO: Implement based on the proto project pattern
}
```

### 5.3: Add Configuration Support

```typescript
// TODO: Add configuration interface
interface WorkflowConfig {
  maxRetries: number;
  skipExisting: boolean;
  logLevel: 'info' | 'warn' | 'error';
}

// TODO: Update constructor to accept config
// TODO: Use config in workflow logic
```

## Success Criteria

Verify your implementation meets these requirements:

- [ ] ✅ **Multi-step coordination**: Workflow executes 3+ steps in correct sequence
- [ ] ✅ **State management**: All workflow state is properly tracked and updated
- [ ] ✅ **File-based communication**: Steps read from previous step outputs
- [ ] ✅ **Error handling**: Failures are caught and don't corrupt the workflow
- [ ] ✅ **Resume capability**: Can skip completed steps when restarting
- [ ] ✅ **Progress tracking**: Real-time progress updates with detailed logging
- [ ] ✅ **Type safety**: Full TypeScript compliance with proper types
- [ ] ✅ **Testing**: Comprehensive tests verify all functionality

## Extension Challenges

Ready for more? Try these advanced features:

### Challenge 1: Parallel Step Execution
Modify the orchestrator to support steps that can run in parallel:

```typescript
// TODO: Add parallel step support
interface ParallelWorkflowStep extends WorkflowStep {
  dependencies: string[]; // Step IDs this step depends on
  canRunInParallel: boolean;
}

// TODO: Implement dependency resolution
// TODO: Execute independent steps concurrently
```

### Challenge 2: Dynamic Step Generation
Add support for steps that generate additional steps at runtime:

```typescript
// TODO: Add dynamic step interface
interface DynamicStep extends WorkflowStep {
  generateSubSteps?(context: any): WorkflowStep[];
}

// TODO: Implement dynamic step injection
// TODO: Update progress calculation for dynamic steps
```

### Challenge 3: Workflow Composition
Create a system for composing workflows from smaller, reusable workflows:

```typescript
// TODO: Add workflow composition
interface ComposableWorkflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  inputs: string[];
  outputs: string[];
}

// TODO: Implement workflow composition logic
// TODO: Handle cross-workflow dependencies
```

### Challenge 4: Real-time UI Integration
Build a React component that displays workflow progress in real-time, similar to `src/ui-analyze-all.tsx`:

```typescript
// TODO: Create React component for workflow visualization
// TODO: Implement real-time updates using WebSockets or polling
// TODO: Add interactive controls (pause, resume, cancel)
```
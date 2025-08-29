### Investigation Questions

Before implementing, examine the existing code to understand these patterns:

1. **Three-Stage Architecture**: How do `ChapterGenerator`, `ChapterReviewer`, and `TutorialGenerator` work together?
2. **Template Interpolation**: Look at `src/chapter-generator.ts:204` - how are variables replaced in templates?
3. **Parallel Processing**: Examine `src/chapter-generator.ts:84` - how does the system handle multiple concurrent operations?
4. **File Management**: Check `src/utils/file-generation.ts:14` - how does the system avoid unnecessary work?

**Key Patterns to Identify:**
- Class-based design with options interfaces
- Async/await with Promise.all for parallel execution
- Template string replacement with variable interpolation
- Smart file existence checking before generation

## Step 2: Implement Core Pipeline Classes

Let's build a mini version of the three-stage pipeline. Create a new file for your implementation:

```typescript
// mini-pipeline.ts
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

// TODO: Define the data structures for our mini pipeline
interface MiniAbstraction {
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface MiniPipelineOptions {
  inputData: MiniAbstraction[];
  outputDir: string;
  template: string;
  // TODO: Add progress callback similar to chapter-generator.ts:54
  onProgress?: (message: string, stage: string) => void;
}

// TODO: Implement the first stage - MiniGenerator
class MiniGenerator {
  constructor(private options: MiniPipelineOptions) {}

  async generate(): Promise<string[]> {
    // TODO: Create output directory (hint: see chapter-generator.ts:62)
    
    // TODO: Process each abstraction in parallel (hint: see chapter-generator.ts:84)
    const generationPromises = this.options.inputData.map(async (item, index) => {
      // TODO: Implement template interpolation (hint: see chapter-generator.ts:204)
      return this.generateContent(item, index);
    });

    // TODO: Wait for all generations to complete
    return Promise.all(generationPromises);
  }

  private async generateContent(abstraction: MiniAbstraction, index: number): Promise<string> {
    // TODO: Replace template variables with actual values
    // Template format: "# {name}\n\n{description}\n\nDifficulty: {difficulty}"
    let content = this.options.template;
    
    // TODO: Implement variable replacement (similar to chapter-generator.ts:204-216)
    // Replace {name}, {description}, {difficulty}, {index}
    
    return content;
  }
}
```

**Your Implementation Tasks:**

1. Complete the `MiniGenerator.generate()` method using the parallel processing pattern from `src/chapter-generator.ts:84`
2. Implement template interpolation in `generateContent()` using string replacement like `src/chapter-generator.ts:204`
3. Add progress callbacks similar to `src/chapter-generator.ts:102`

<details>
<summary>💡 Hint: Template Interpolation</summary>

```typescript
// Pattern from chapter-generator.ts:204-216
const content = template
  .replace(/{name}/g, abstraction.name)
  .replace(/{description}/g, abstraction.description)
  .replace(/{difficulty}/g, abstraction.difficulty)
  .replace(/{index}/g, index.toString());
```
</details>

## Step 3: Add Review and Formatting Stages

Now implement the second and third stages of the pipeline:

```typescript
// TODO: Implement the second stage - MiniReviewer
class MiniReviewer {
  constructor(private options: MiniPipelineOptions) {}

  async review(generatedContent: string[]): Promise<string[]> {
    // TODO: Process content in parallel for review
    const reviewPromises = generatedContent.map(async (content, index) => {
      // TODO: Add review metadata and formatting improvements
      return this.reviewContent(content, index);
    });

    return Promise.all(reviewPromises);
  }

  private async reviewContent(content: string, index: number): Promise<string> {
    // TODO: Add review metadata (timestamp, version, etc.)
    // TODO: Improve formatting (add sections, improve structure)
    
    const reviewHeader = `<!-- Reviewed on ${new Date().toISOString()} -->\n`;
    const improvedContent = content + '\n\n## Summary\n\nThis content covers the key concepts effectively.';
    
    return reviewHeader + improvedContent;
  }
}

// TODO: Implement the third stage - MiniFormatter
class MiniFormatter {
  constructor(private options: MiniPipelineOptions) {}

  async format(reviewedContent: string[]): Promise<void> {
    // TODO: Save formatted content to files
    const formatPromises = reviewedContent.map(async (content, index) => {
      const fileName = `output_${index}.md`;
      const filePath = resolve(this.options.outputDir, fileName);
      
      // TODO: Add file existence checking (hint: see utils/file-generation.ts:14)
      if (this.shouldSkipFile(filePath)) {
        this.options.onProgress?.(`Skipping existing: ${fileName}`, 'format');
        return;
      }

      this.options.onProgress?.(`Formatting: ${fileName}`, 'format');
      
      // TODO: Write formatted content to file
      await writeFile(filePath, content, 'utf-8');
      
      this.options.onProgress?.(`Completed: ${fileName}`, 'format');
    });

    await Promise.all(formatPromises);
  }

  private shouldSkipFile(filePath: string): boolean {
    // TODO: Implement file existence logic (hint: see utils/file-generation.ts:14-26)
    return false;
  }
}
```

**Your Implementation Tasks:**

1. Complete the `MiniReviewer` to add metadata and improve content structure
2. Implement `MiniFormatter.shouldSkipFile()` using the pattern from `src/utils/file-generation.ts:14`
3. Add proper file writing with error handling

<details>
<summary>💡 Hint: File Existence Check</summary>

```typescript
// Pattern from utils/file-generation.ts:14-26
private shouldSkipFile(filePath: string): boolean {
  const exists = existsSync(filePath);
  // Skip if file exists and we're not forcing overwrite
  return exists && !this.options.force;
}
```
</details>

## Step 4: Create the Complete Pipeline

Now let's tie everything together with proper resource management:

```typescript
// TODO: Implement the main pipeline orchestrator
class MiniPipeline {
  private generator: MiniGenerator;
  private reviewer: MiniReviewer;
  private formatter: MiniFormatter;

  constructor(private options: MiniPipelineOptions) {
    this.generator = new MiniGenerator(options);
    this.reviewer = new MiniReviewer(options);
    this.formatter = new MiniFormatter(options);
  }

  async run(): Promise<void> {
    // TODO: Implement listener management (hint: see chapter-generator.ts:78-82)
    const originalMaxListeners = process.getMaxListeners();
    
    try {
      // TODO: Calculate required listeners for parallel processing
      const requiredListeners = this.options.inputData.length * 3; // 3 stages
      process.setMaxListeners(Math.max(originalMaxListeners, requiredListeners + 10));

      // TODO: Run the three stages sequentially
      console.log('Stage 1: Generating content...');
      const generated = await this.generator.generate();

      console.log('Stage 2: Reviewing content...');
      const reviewed = await this.reviewer.review(generated);

      console.log('Stage 3: Formatting output...');
      await this.formatter.format(reviewed);

      console.log('Pipeline completed successfully!');
    } finally {
      // TODO: Reset listeners (hint: see chapter-generator.ts:147)
      process.setMaxListeners(originalMaxListeners);
    }
  }
}

// TODO: Create a helper function for easy usage (similar to generateChaptersFromYaml)
export async function runMiniPipeline(
  abstractions: MiniAbstraction[],
  outputDir: string,
  template: string,
  options?: { force?: boolean }
): Promise<void> {
  const pipeline = new MiniPipeline({
    inputData: abstractions,
    outputDir,
    template,
    onProgress: (message, stage) => console.log(`[${stage.toUpperCase()}] ${message}`)
  });

  await pipeline.run();
}
```

**Your Implementation Tasks:**

1. Complete the resource management using the pattern from `src/chapter-generator.ts:78-147`
2. Add proper error handling for each stage
3. Implement progress tracking throughout the pipeline

## Step 5: Test and Validate

Create a test script to validate your implementation:

```typescript
// test-mini-pipeline.ts
import { runMiniPipeline } from './mini-pipeline';

async function testPipeline() {
  const testData: MiniAbstraction[] = [
    {
      name: 'File Handler',
      description: 'Manages file operations with smart caching and error recovery.',
      difficulty: 'medium'
    },
    {
      name: 'Event Emitter',
      description: 'Provides pub/sub pattern for loose coupling between components.',
      difficulty: 'easy'
    },
    {
      name: 'State Machine',
      description: 'Complex state transitions with validation and rollback support.',
      difficulty: 'hard'
    }
  ];

  const template = `# {name}

## Overview
{description}

## Difficulty Level
**{difficulty}**

## Chapter {index}
This is chapter number {index} in our tutorial series.

---
*Generated by Mini Pipeline*
`;

  try {
    await runMiniPipeline(testData, './test-output', template);
    console.log('✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testPipeline();
```

### Validation Steps

1. **Run the test**: `npx ts-node test-mini-pipeline.ts`
2. **Check output files**: Verify that files are created in `./test-output/`
3. **Test file skipping**: Run again to ensure existing files are skipped
4. **Verify content**: Check that template variables are properly replaced

**Expected Output Structure:**
```
test-output/
├── output_0.md  # File Handler content
├── output_1.md  # Event Emitter content
└── output_2.md  # State Machine content
```

## Step 6: Add Advanced Features

Enhance your pipeline with features from the real system:

### A. Add File Name Generation

```typescript
// TODO: Implement smart file naming (hint: see utils/file-generation.ts:37-50)
function generateFileName(index: number, name: string): string {
  const normalized = name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '_');
  
  return `chapter_${index}_${normalized}.md`;
}
```

### B. Add Progress Tracking

```typescript
// TODO: Enhanced progress tracking with timing
interface ProgressInfo {
  stage: string;
  completed: number;
  total: number;
  currentItem: string;
  startTime: number;
}

function trackProgress(info: ProgressInfo): void {
  const elapsed = Date.now() - info.startTime;
  const percentage = Math.round((info.completed / info.total) * 100);
  console.log(`[${info.stage}] ${percentage}% (${info.completed}/${info.total}) - ${info.currentItem} (${elapsed}ms)`);
}
```

### C. Add Error Recovery

```typescript
// TODO: Add retry logic and error handling
async function withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      console.log(`Attempt ${attempt} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  throw new Error('Max retries exceeded');
}
```

## Success Criteria

Verify your implementation meets these requirements:

- [ ] **Three-stage pipeline works**: Generate → Review → Format sequence completes
- [ ] **Template interpolation**: Variables are properly replaced in content
- [ ] **Parallel processing**: Multiple items process simultaneously
- [ ] **File management**: Existing files are skipped appropriately
- [ ] **Resource management**: Listeners are properly managed
- [ ] **Error handling**: Pipeline recovers gracefully from errors
- [ ] **Progress tracking**: User sees real-time status updates

## Extension Challenges

For advanced learners, try these additional features:

### Challenge 1: Claude SDK Integration
Integrate actual AI generation using the Claude SDK pattern from `src/chapter-generator.ts:225`:

```typescript
// TODO: Add real AI generation
async function generateWithAI(prompt: string): Promise<string> {
  // Use the query pattern from chapter-generator.ts:225-238
  // Add proper abort controller and message handling
}
```

### Challenge 2: YAML Configuration
Add YAML-based configuration like the real system:

```typescript
// TODO: Support YAML input files
interface PipelineConfig {
  abstractions: MiniAbstraction[];
  templates: Record<string, string>;
  outputSettings: {
    directory: string;
    fileNamePattern: string;
  };
}
```

### Challenge 3: Template System Integration
Connect your pipeline to the actual [Prompt Template System](chapter_7_prompt_template_system.md):

```typescript
// TODO: Use real prompt templates
import { loadTemplate, interpolateTemplate } from '../prompt-template-system';

async function generateWithTemplate(templateName: string, variables: Record<string, string>): Promise<string> {
  const template = await loadTemplate(templateName);
  return interpolateTemplate(template, variables);
}
```

### Challenge 4: Performance Optimization
Add performance monitoring and optimization:

```typescript
// TODO: Add performance metrics
interface PerformanceMetrics {
  stageTimings: Record<string, number>;
  memoryUsage: NodeJS.MemoryUsage;
  throughput: number; // items per second
}
```

## Integration Points

Your mini pipeline connects to these other proto systems:
- **[Content Analysis Framework](chapter_6_content_analysis_framework.md)**: Provides the abstractions to process
- **[Prompt Template System](chapter_7_prompt_template_system.md)**: Supplies the templates for content generation
- **[File Generation Utilities](chapter_9_file_generation_utilities.md)**: Handles the file management operations
- **[React-based Terminal UI](chapter_1_react_based_terminal_ui.md)**: Displays progress and status updates

Understanding how your pipeline fits into this larger ecosystem helps you see how complex systems are built from modular, reusable components.
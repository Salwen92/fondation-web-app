# Interactive Tutorial: Content Analysis Framework

**Estimated Time**: 45-90 minutes  
**Difficulty Level**: Intermediate  
**Prerequisites**: Complete Chapter 2 (Claude SDK Integration) and Chapter 3 (Schema Validation Framework)

## Learning Objectives

By the end of this tutorial, you will be able to:

- Build a 6-phase analysis pipeline that processes codebases systematically
- Implement Zod schemas for strongly-typed YAML data validation
- Create dynamic prompt interpolation for contextual AI interactions
- Use parallel processing to optimize chapter generation performance
- Integrate message logging for debugging AI interactions
- Apply the Content Analysis Framework patterns to analyze any codebase

## User Story

```
As a developer learning proto
I want to build my own Content Analysis Framework
So that I can understand how complex codebases are systematically analyzed and transformed into learning materials

Acceptance Criteria:
- [ ] Implement a 3-phase mini-pipeline (extract, analyze, generate)
- [ ] Use Zod schemas to validate YAML data structures
- [ ] Create prompt templates with variable interpolation
- [ ] Process multiple items in parallel safely
- [ ] Log AI interactions for debugging
- [ ] Generate structured output that could feed downstream processes
```

## Step 1: Explore the Foundation

Before building our own framework, let's understand the existing implementation.

### Investigate the Main Pipeline

Look at the 6-phase workflow in `src/analyze-all.ts:78-157`:

```typescript
// Step 1: Extract core abstractions (5-15 key concepts)
// Step 2: Analyze relationships (how concepts connect)  
// Step 3: Order chapters (optimal learning sequence)
// Step 4: Generate chapters (educational content)
// Step 5: Review chapters (quality assurance)
// Step 6: Generate tutorials (interactive materials)
```

**Questions to investigate:**
1. How does `runPrompt()` in `src/analyze-all.ts:11-43` handle variable interpolation?
2. What happens if any step fails? (Check `src/analyze-all.ts:86-88`)
3. How are output directories managed? (See `src/analyze-all.ts:45-50`)

### Examine Schema Validation

Study the Zod schemas in `src/chapter-generator.ts:15-45`:

```typescript
const AbstractionSchema = z.object({
  name: z.string(),
  description: z.string(),
  file_paths: z.array(z.string()),
});
```

**Key patterns to understand:**
- How schemas ensure data quality at each phase boundary
- Why relationships use numeric indices (`from_abstraction: z.number()`)
- How `ChapterOrderYamlSchema` maintains sequence information

### Find Message Logging Integration

Explore how debugging is handled in `src/utils/messageLogger.ts:42-65`:

```typescript
async logSDKMessage(message: SDKMessage, direction: 'incoming' | 'outgoing' = 'incoming')
```

## Step 2: Implement Core Functionality

Now let's build a simplified 3-phase Content Analysis Framework.

### Create the Project Structure

```bash
mkdir mini-content-analyzer
cd mini-content-analyzer
npm init -y
npm install zod yaml @anthropic-ai/claude-code @types/node typescript
```

### Build the Schema Foundation

Create `src/schemas.ts`:

```typescript
import { z } from 'zod';

// TODO: Define AbstractionSchema based on src/chapter-generator.ts:16-20
export const AbstractionSchema = z.object({
  // Add name, description, file_paths fields
});

export const AbstractionsSchema = z.array(AbstractionSchema);

// TODO: Define RelationshipSchema based on src/chapter-generator.ts:25-30
export const RelationshipSchema = z.object({
  // Add from_abstraction, to_abstraction, label, evidence fields
});

export const RelationshipsSchema = z.object({
  summary: z.string(),
  relationships: z.array(RelationshipSchema),
});

// Export TypeScript types
export type Abstraction = z.infer<typeof AbstractionSchema>;
export type Relationships = z.infer<typeof RelationshipsSchema>;
```

**Hint**: Follow the exact pattern from `src/chapter-generator.ts:16-35`. The `from_abstraction` and `to_abstraction` should be numbers representing array indices.

### Implement the Core Analyzer

Create `src/analyzer.ts`:

```typescript
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';
import * as yaml from 'yaml';
import { query, type SDKMessage } from '@anthropic-ai/claude-code';
import { AbstractionsSchema, RelationshipsSchema, type Abstraction } from './schemas';

export class MiniContentAnalyzer {
  constructor(
    private projectPath: string,
    private outputDir: string
  ) {}

  async runAnalysis(): Promise<void> {
    // TODO: Implement the 3-phase pipeline
    // Phase 1: Extract abstractions
    // Phase 2: Analyze relationships  
    // Phase 3: Generate summary

    console.log('[START] Mini Content Analysis');
    
    // Ensure output directory exists
    await this.ensureOutputDirectory();
    
    try {
      // TODO: Call each phase method
      
      console.log('[SUCCESS] Analysis complete!');
    } catch (error) {
      console.error('[ERROR] Analysis failed:', error);
      throw error;
    }
  }

  private async ensureOutputDirectory(): Promise<void> {
    // TODO: Create output directory if it doesn't exist
    // Hint: Use pattern from src/analyze-all.ts:45-50
  }

  private async extractAbstractions(): Promise<Abstraction[]> {
    console.log('Phase 1: Extracting abstractions...');
    
    const prompt = `Analyze this project and identify 3-5 core abstractions.
For each abstraction, provide:
- name: Short descriptive name
- description: 2-3 sentence explanation
- file_paths: Array of relevant file paths

Output as YAML array.`;

    // TODO: Use Claude SDK to analyze the project
    // TODO: Parse and validate the response using AbstractionsSchema
    // TODO: Save to step1_abstractions.yaml
    
    return []; // Replace with actual implementation
  }

  private async analyzeRelationships(abstractions: Abstraction[]): Promise<void> {
    console.log('Phase 2: Analyzing relationships...');
    
    // TODO: Create prompt that references the abstractions
    // TODO: Query Claude SDK for relationships
    // TODO: Validate using RelationshipsSchema
    // TODO: Save to step2_relationships.yaml
  }

  private async generateSummary(): Promise<void> {
    console.log('Phase 3: Generating summary...');
    
    // TODO: Read both YAML files
    // TODO: Create a summary report
    // TODO: Save to step3_summary.md
  }
}
```

**Implementation hints:**
- Follow the error handling pattern from `src/analyze-all.ts:86-88`
- Use the same query options structure as `src/chapter-generator.ts:225-232`
- Handle YAML parsing with try/catch and schema validation

## Step 3: Add Real-World Features

### Implement Dynamic Prompt Interpolation

Study the variable replacement in `src/chapter-generator.ts:204-216`:

```typescript
const prompt = promptTemplate
  .replace(/{project_name}/g, projectName)
  .replace(/{abstraction_name}/g, abstraction.name.trim())
  // ... more replacements
```

Add to your `analyzer.ts`:

```typescript
private interpolatePrompt(template: string, variables: Record<string, string>): string {
  let result = template;
  
  // TODO: Replace all {variable_name} patterns with actual values
  // Hint: Use the same pattern as src/chapter-generator.ts:204-216
  
  return result;
}

private createAbstractionsPrompt(): string {
  const template = `Analyze the project at {project_path} and identify {count} core abstractions.

Project: {project_name}
Focus on the most important architectural concepts.

Output format: YAML array with name, description, file_paths for each.`;

  return this.interpolatePrompt(template, {
    project_path: this.projectPath,
    project_name: this.projectPath.split('/').pop() || 'project',
    count: '3-5'
  });
}
```

### Add Parallel Processing Support

Implement safe parallel processing using the pattern from `src/chapter-generator.ts:78-148`:

```typescript
async processAbstractionsInParallel(abstractions: Abstraction[]): Promise<string[]> {
  const originalMaxListeners = process.getMaxListeners();
  
  try {
    // TODO: Increase max listeners to handle parallel operations
    // Hint: Follow src/chapter-generator.ts:81-82
    
    const promises = abstractions.map(async (abstraction, index) => {
      // TODO: Process each abstraction
      // Return a result with index to maintain order
      return { index, result: `Processed ${abstraction.name}` };
    });

    const results = await Promise.all(promises);
    
    // TODO: Sort by index and extract results
    // Hint: Use pattern from src/chapter-generator.ts:137-142
    
    return results.map(r => r.result);
    
  } finally {
    // TODO: Reset max listeners
    // Hint: src/chapter-generator.ts:147
  }
}
```

### Integrate Message Logging

Add debugging support using the message logger pattern:

```typescript
import { messageLogger } from './utils/messageLogger'; // You'll need to copy this

async analyzeWithLogging(prompt: string): Promise<string> {
  await messageLogger.logUserPrompt(prompt);
  
  const messages: SDKMessage[] = [];
  let result = '';
  
  for await (const message of query({ /* ... */ })) {
    messages.push(message);
    await messageLogger.logSDKMessage(message);
    
    if (message.type === 'result') {
      result += message.result;
    }
  }
  
  return result;
}
```

## Step 4: Test and Validate

### Create Test Data

Create `test-project/` with sample files:

```
test-project/
├── src/
│   ├── main.ts
│   ├── config.ts
│   └── utils/
│       └── helper.ts
├── package.json
└── README.md
```

Add some realistic content to test your analyzer.

### Build Integration Tests

Create `test/analyzer.test.ts`:

```typescript
import { MiniContentAnalyzer } from '../src/analyzer';
import { AbstractionsSchema } from '../src/schemas';
import { readFile } from 'node:fs/promises';
import * as yaml from 'yaml';

describe('MiniContentAnalyzer', () => {
  const analyzer = new MiniContentAnalyzer('./test-project', './test-output');

  test('should extract valid abstractions', async () => {
    await analyzer.runAnalysis();
    
    // TODO: Read step1_abstractions.yaml
    // TODO: Parse with yaml.parse()
    // TODO: Validate with AbstractionsSchema.parse()
    // TODO: Assert abstractions.length >= 3
  });

  test('should generate structured relationships', async () => {
    // TODO: Verify step2_relationships.yaml exists and is valid
  });

  test('should handle errors gracefully', async () => {
    // TODO: Test with invalid project path
    // TODO: Verify proper error handling
  });
});
```

### Validate Against Project Standards

Run the same checks used in the main project:

```bash
# Type checking (from package.json:8)
npx tsc --noEmit

# Linting (from package.json:9)  
npx biome lint .

# Format checking
npx biome format --write .
```

## Success Criteria

- [ ] **Implementation works as intended**: Your 3-phase pipeline successfully analyzes a test project
- [ ] **Code follows project conventions**: Uses the same patterns as `src/analyze-all.ts` and `src/chapter-generator.ts`
- [ ] **Tests pass and cover edge cases**: Handles invalid inputs, missing files, and API failures
- [ ] **Integration points function correctly**: YAML files are properly structured and validated
- [ ] **No linting or type errors**: Passes the same checks as the main project

## Debugging Common Issues

### "Schema validation failed"
- Check that your YAML output exactly matches the expected structure
- Verify all required fields are present (name, description, file_paths)
- Ensure arrays and objects are properly formatted

### "Max listeners exceeded"
- You forgot to increase `process.maxListeners` before parallel operations
- Always reset to original value in finally block
- Limit concurrent operations if processing many items

### "Claude SDK query failed"
- Check that your prompt is clear and specific
- Verify allowed tools are appropriate for the task
- Review message logging to see actual API interactions

### "File not found errors"
- Ensure output directory exists before writing files
- Use absolute paths or resolve relative paths correctly
- Check file permissions in the output directory

## Extension Challenges

Ready for more? Try these advanced exercises:

### Performance Optimization Challenge
Implement caching to avoid re-analyzing unchanged files:
- Add file hash checking (see `src/utils/file-generation.ts:64`)
- Skip analysis if input files haven't changed
- Measure and report performance improvements

### Advanced Schema Challenge  
Add relationship validation:
- Ensure `from_abstraction` and `to_abstraction` indices are valid
- Validate that relationships make semantic sense
- Add relationship strength scoring (0-1 scale)

### Integration Challenge
Connect your analyzer to the main pipeline:
- Make your output compatible with `src/chapter-generator.ts`
- Add your analyzer as Phase 0 in the main workflow
- Test end-to-end integration with chapter generation

### UI Challenge
Build a progress visualization:
- Show real-time analysis progress
- Display schema validation results
- Create an interactive output explorer

**Bonus**: Implement your analyzer using the exact same tools and patterns as the main project, then compare your approach with the original implementation in `src/analyze-all.ts`. What design decisions were different? What could be improved?
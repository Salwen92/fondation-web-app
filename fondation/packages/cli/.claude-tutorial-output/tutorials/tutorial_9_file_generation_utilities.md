I'll provide the tutorial content with the scaffolding inline:

### Your Task: Implement the DocumentManager

Create a file `.claude-tutorial-output/document-manager.ts` with this skeleton:

```typescript
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export interface DocumentOptions {
  force?: boolean;
  overwrite?: boolean;
  outputDir?: string;
  addEmojis?: boolean;
}

export interface FileCheck {
  exists: boolean;
  path: string;
  shouldSkip: boolean;
  reason?: string;
}

export class DocumentManager {
  constructor(private options: DocumentOptions = {}) {}

  /**
   * TODO: Implement filename normalization following the project pattern
   * Requirements:
   * - Trim whitespace
   * - Convert to lowercase  
   * - Replace spaces with underscores
   * - Remove special characters (keep only letters, numbers, underscores, hyphens)
   * - Collapse multiple underscores
   * 
   * Hint: Look at src/utils/file-generation.ts:28-35 for the exact pattern
   */
  normalizeDocumentName(name: string): string {
    // TODO: Implement this method
    return name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_-]/g, '_')
      .replace(/_+/g, '_');
  }

  /**
   * TODO: Implement file existence checking with overwrite logic  
   * Requirements:
   * - Check if file exists using Node.js fs functions
   * - Calculate shouldSkip based on existence and options
   * - shouldSkip = true when file exists AND overwrite is false AND force is false
   * - Include helpful reason message
   * 
   * Hint: Look at src/utils/file-generation.ts:14-26 for the pattern
   */
  checkDocumentExists(filePath: string): FileCheck {
    const exists = existsSync(filePath);
    const shouldSkip = exists && !this.options.overwrite && !this.options.force;
    
    return {
      exists,
      path: filePath,
      shouldSkip,
      reason: shouldSkip ? 'File exists and overwrite not enabled' : undefined
    };
  }

  // TODO: Complete the remaining methods...
}
```

**Implementation Challenge**: Complete the missing methods step by step.

## Step 3: Add Real-World Features

Now let's implement the message generation and document creation methods:

```typescript
  createSkipMessage(fileName: string): string {
    const emoji = this.options.addEmojis ? '⏭️  ' : '';
    return `${emoji}Skipping existing file: ${fileName}`;
  }

  createGeneratingMessage(fileName: string): string {
    const emoji = this.options.addEmojis ? '📝 ' : '';
    return `${emoji}Generating: ${fileName}`;
  }

  generateDocument(name: string, content: string): { message: string; created: boolean } {
    // Step 1: Normalize the document name
    const normalizedName = this.normalizeDocumentName(name);
    const fileName = `${normalizedName}.md`;
    
    // Step 2: Construct full file path
    const outputDir = this.options.outputDir || '.claude-tutorial-output';
    const filePath = resolve(outputDir, fileName);
    
    // Step 3: Check if file exists
    const fileCheck = this.checkDocumentExists(filePath);
    
    // Step 4: Return skip message if shouldSkip is true
    if (fileCheck.shouldSkip) {
      return {
        message: this.createSkipMessage(fileName),
        created: false
      };
    }
    
    // Step 5: Create directory if it doesn't exist
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    
    // Step 6: Write file and return generating message
    writeFileSync(filePath, content, 'utf-8');
    
    return {
      message: this.createGeneratingMessage(fileName),
      created: true
    };
  }
```

### Test Your Implementation

Create a test file `.claude-tutorial-output/test-document-manager.ts`:

```typescript
import { DocumentManager } from './document-manager';

function testDocumentManager() {
  console.log('🧪 Testing DocumentManager...\n');
  
  // Test 1: Filename normalization
  const manager = new DocumentManager({ addEmojis: true });
  
  const testNames = [
    'React-based Terminal UI',
    '  Advanced TypeScript Patterns!!!  ',
    'File Generation Utilities & More',
    'Simple Name'
  ];
  
  console.log('📝 Testing filename normalization:');
  testNames.forEach(name => {
    const normalized = manager.normalizeDocumentName(name);
    console.log(`  "${name}" → "${normalized}"`);
  });
  
  // Test 2: Document generation
  console.log('\n📁 Testing document generation:');
  
  const testContent = '# Test Document\n\nThis is a test document.';
  
  // First generation - should create file
  const result1 = manager.generateDocument('Test Document', testContent);
  console.log(`  ${result1.message} (Created: ${result1.created})`);
  
  // Second generation - should skip existing file
  const result2 = manager.generateDocument('Test Document', testContent);
  console.log(`  ${result2.message} (Created: ${result2.created})`);
  
  // Test with overwrite enabled
  const managerOverwrite = new DocumentManager({ addEmojis: true, overwrite: true });
  const result3 = managerOverwrite.generateDocument('Test Document', testContent + '\n\nUpdated content.');
  console.log(`  ${result3.message} (Created: ${result3.created})`);
}

testDocumentManager();
```

Run your test to see how the file generation utilities work:

```bash
cd /Users/sykar-f/workdir/proto
npx tsx .claude-tutorial-output/test-document-manager.ts
```

## Step 4: Test and Validate

Let's create comprehensive tests that cover edge cases:

```typescript
// Add to your test file
function testEdgeCases() {
  console.log('\n🔍 Testing edge cases...\n');
  
  const manager = new DocumentManager({ addEmojis: false });
  
  // Test empty and problematic names
  const edgeCases = [
    '',
    '   ',
    '!!!@#$%^&*()',
    'Normal Name',
    'multiple___underscores',
    'UPPERCASE NAME',
    'name-with-dashes'
  ];
  
  console.log('🚨 Edge case filename normalization:');
  edgeCases.forEach(name => {
    const normalized = manager.normalizeDocumentName(name);
    console.log(`  "${name}" → "${normalized}"`);
  });
  
  // Test force option
  console.log('\n💪 Testing force option:');
  const forceManager = new DocumentManager({ force: true, addEmojis: true });
  const forceResult = forceManager.generateDocument('Test Document', '# Forced update');
  console.log(`  ${forceResult.message} (Created: ${forceResult.created})`);
}

// Call this after your main test
testEdgeCases();
```

### Integration Test with Project Patterns

Let's test integration with the project's existing patterns:

```typescript
import { 
  normalizeFileName, 
  checkFileExists, 
  generateChapterFileName 
} from '../src/utils/file-generation';

function testIntegration() {
  console.log('\n🔗 Testing integration with project utilities...\n');
  
  const testName = 'React-based Terminal UI';
  
  // Compare your implementation with the project's
  const manager = new DocumentManager();
  const yourNormalized = manager.normalizeDocumentName(testName);
  const projectNormalized = normalizeFileName(testName);
  
  console.log('🔄 Comparing normalization:');
  console.log(`  Your impl: "${yourNormalized}"`);
  console.log(`  Project:   "${projectNormalized}"`);
  console.log(`  Match: ${yourNormalized === projectNormalized ? '✅' : '❌'}`);
  
  // Test filename generation patterns
  const chapterFileName = generateChapterFileName(1, testName);
  console.log(`\n📖 Chapter filename: ${chapterFileName}`);
}

testIntegration();
```

## Success Criteria

Verify your implementation meets these requirements:

- [ ] **Filename normalization works correctly** - matches the project's `normalizeFileName` function
- [ ] **File existence checking prevents overwrites** - `shouldSkip` logic works as expected
- [ ] **Progress messages are user-friendly** - includes emojis when enabled
- [ ] **Edge cases are handled gracefully** - empty strings, special characters, etc.
- [ ] **Integration with project patterns** - follows the same conventions as existing code
- [ ] **No TypeScript errors** - code compiles cleanly
- [ ] **Directory creation works** - creates output directories when needed

### Debugging Tips

If you encounter issues:

1. **Filename normalization problems**: Check the regex patterns in `src/utils/file-generation.ts:28-35`
2. **File existence logic errors**: Verify the boolean logic in `src/utils/file-generation.ts:19`
3. **Path resolution issues**: Use `path.resolve()` to handle absolute paths correctly
4. **Permission errors**: Ensure the output directory is writable

## Extension Challenges

### Challenge 1: Metadata Enhancement
Extend your DocumentManager to include generation metadata:

```typescript
interface DocumentMetadata {
  generatedAt: string;
  originalName: string;
  normalizedName: string;
  contentHash?: string;
}

// Add method to your DocumentManager:
generateDocumentWithMetadata(name: string, content: string): {
  message: string;
  created: boolean;
  metadata?: DocumentMetadata;
}
```

### Challenge 2: Batch Document Generation
Implement batch processing capabilities:

```typescript
interface BatchResult {
  successful: string[];
  skipped: string[];
  failed: Array<{ name: string; error: string }>;
}

// Add method:
generateDocuments(documents: Array<{ name: string; content: string }>): BatchResult
```

### Challenge 3: Template Integration
Create a template system that integrates with the file generation utilities:

```typescript
interface DocumentTemplate {
  name: string;
  contentTemplate: string;
  variables: Record<string, string>;
}

// Add method:
generateFromTemplate(template: DocumentTemplate): { message: string; created: boolean }
```

### Challenge 4: Performance Optimization
Implement caching and optimization for large-scale file generation:

```typescript
interface CacheOptions {
  enabled: boolean;
  maxSize: number;
  ttl: number; // time to live in milliseconds
}

// Optimize the DocumentManager with caching for file existence checks
```

### Challenge 5: Advanced Integration
Create a mini workflow system that uses your DocumentManager with the project's existing generators:

```typescript
// Create a workflow that:
// 1. Uses the project's chapter generator pattern
// 2. Integrates with your DocumentManager
// 3. Provides progress callbacks like the existing system
// 4. Handles errors gracefully
// Look at src/chapter-generator.ts:90-115 for inspiration
```
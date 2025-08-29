I'll continue with the tutorial structure without creating the file, focusing on the educational content:

## Step 2: Implement Core Functionality

You'll create a new CustomAnalyzer tool following the existing patterns. Here's the implementation structure:

### Task 2.1: Define Input Schema

Looking at `src/schemas/tools.ts:10-17`, implement your CustomAnalyzer schema:

```typescript
export const CustomAnalyzerToolSchema = z.object({
  file_path: z.string().describe('The absolute path to the file to analyze'),
  analysis_type: z.enum(['complexity', 'size', 'readability']).describe('Type of analysis to perform'),
  include_metrics: z.boolean().optional().default(false).describe('Include detailed metrics'),
  max_lines: z.number().max(1000).optional().describe('Maximum lines to analyze'),
});
```

**Key patterns from the codebase**:
- Required fields use `z.string()` or other base types
- Optional fields add `.optional()` and can have `.default()` values
- Constraints like `.max(600000)` in `src/schemas/tools.ts:16` prevent invalid ranges
- Descriptions help with auto-generated documentation

### Task 2.2: Generate TypeScript Types

Following `src/schemas/tools.ts:155`, create the inferred type:

```typescript
export type CustomAnalyzerToolInput = z.infer<typeof CustomAnalyzerToolSchema>;
```

This gives you compile-time type safety and IDE autocompletion.

### Task 2.3: Create Validation Function

Implement safe validation following `src/schemas/toolResults.ts:70-84`:

```typescript
export function validateCustomAnalyzerInput(input: unknown): {
  success: boolean;
  data?: CustomAnalyzerToolInput;
  error?: z.ZodError;
} {
  const result = CustomAnalyzerToolSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
```

**Why `safeParse`?** Unlike `parse()`, it never throws exceptions, allowing graceful error handling in UI components.

## Step 3: Add Real-World Features

### Task 3.1: Implement Structured Results

Create rich output schemas following `src/schemas/toolResultsStructured.ts:35-40`:

```typescript
export const CustomAnalyzerStructuredResultSchema = z.object({
  filePath: z.string(),
  analysisType: z.string(),
  fileSize: z.number(),
  lineCount: z.number(),
  complexityScore: z.number().optional(),
  readabilityScore: z.number().optional(),
  metrics: z.object({
    functionCount: z.number(),
    variableCount: z.number(),
    commentRatio: z.number(),
  }).optional(),
});
```

### Task 3.2: Build Result Parser

Transform raw strings into structured data:

```typescript
export function parseCustomAnalyzerResult(rawResult: string): CustomAnalyzerStructuredResultSchema {
  // TODO: Parse string like "File: example.ts, Lines: 150, Complexity: 7.2"
  // Extract data and return structured object
  
  const lines = rawResult.split('\n');
  const filePath = extractValue(lines[0], 'File:');
  const lineCount = parseInt(extractValue(lines[1], 'Lines:')) || 0;
  
  return {
    filePath,
    analysisType: 'complexity',
    fileSize: 0, // Would get from file system
    lineCount,
    complexityScore: parseFloat(extractValue(lines[2], 'Complexity:')) || undefined,
  };
}

function extractValue(line: string, prefix: string): string {
  return line.replace(prefix, '').trim();
}
```

### Task 3.3: Add to Tool Registry

Following the pattern in `src/schemas/tools.ts:140-151`, add your tool:

```typescript
export const ToolSchemas = {
  // ... existing tools
  CustomAnalyzer: CustomAnalyzerToolSchema,
} as const;
```

And in `src/schemas/toolResults.ts:35-50`:

```typescript
export const toolResultSchemas = {
  // ... existing tools
  CustomAnalyzer: CustomAnalyzerResultSchema,
} as const;
```

## Step 4: Test and Validate

### Task 4.1: Test Valid Inputs

```typescript
const validInput = {
  file_path: "/Users/test/example.ts",
  analysis_type: "complexity",
  include_metrics: true,
  max_lines: 500
};

const validation = validateCustomAnalyzerInput(validInput);
console.assert(validation.success === true);
console.assert(validation.data?.analysis_type === "complexity");
```

### Task 4.2: Test Invalid Inputs

```typescript
const invalidInputs = [
  // Wrong type for file_path
  { file_path: 123, analysis_type: "complexity" },
  
  // Invalid enum value
  { file_path: "/test", analysis_type: "invalid" },
  
  // Exceeds max constraint
  { file_path: "/test", analysis_type: "size", max_lines: 2000 },
  
  // Missing required field
  { analysis_type: "readability" }
];

invalidInputs.forEach((input, index) => {
  const result = validateCustomAnalyzerInput(input);
  console.assert(result.success === false, `Test ${index} should fail`);
  console.log(`Error ${index}:`, result.error?.issues);
});
```

### Task 4.3: Test Structured Parsing

```typescript
const mockResult = `File: /Users/test/example.ts
Lines: 150
Complexity: 7.2
Functions: 12
Variables: 45`;

const parsed = parseCustomAnalyzerResult(mockResult);
console.assert(parsed.lineCount === 150);
console.assert(parsed.complexityScore === 7.2);
```

### Task 4.4: Error Handling Integration

Test how your validator integrates with the existing error handling system:

```typescript
function simulateToolExecution(input: unknown) {
  const validation = validateCustomAnalyzerInput(input);
  
  if (!validation.success) {
    // Log error details for debugging
    console.error('Validation failed:', validation.error?.issues);
    
    // Return user-friendly error message
    return {
      success: false,
      message: 'Invalid input parameters',
      details: validation.error?.issues.map(issue => 
        `${issue.path.join('.')}: ${issue.message}`
      )
    };
  }
  
  // Proceed with validated data
  return {
    success: true,
    result: `Analysis completed for ${validation.data.file_path}`
  };
}
```

## Step 5: Integration with Existing Systems

### Task 5.1: Connect to UI Components

Following patterns in `src/ui/components/tools/`, your tool would integrate like:

```typescript
// In tool configuration
export const customAnalyzerConfig = {
  name: 'CustomAnalyzer',
  displayName: 'File Analyzer',
  inputSchema: CustomAnalyzerToolSchema,
  resultParser: parseCustomAnalyzerResult,
  category: 'analysis'
};
```

### Task 5.2: Add Error Recovery

Implement graceful degradation when validation fails:

```typescript
export function safeParseCustomAnalyzerResult(rawResult: string) {
  try {
    return parseCustomAnalyzerResult(rawResult);
  } catch (error) {
    // Fallback to basic structure
    return {
      filePath: 'unknown',
      analysisType: 'unknown', 
      fileSize: 0,
      lineCount: 0,
      error: 'Failed to parse result'
    };
  }
}
```

## Success Criteria

- [ ] CustomAnalyzer schema validates required and optional fields correctly
- [ ] Invalid inputs produce descriptive error messages without crashing
- [ ] Structured parser transforms raw results into typed objects
- [ ] Integration follows existing project patterns and conventions
- [ ] Error handling provides graceful degradation
- [ ] Type safety maintained throughout the validation pipeline

## Extension Challenges

### Challenge 1: Advanced Validation
Add custom validation rules:
```typescript
const CustomAnalyzerToolSchema = z.object({
  file_path: z.string()
    .refine(path => path.endsWith('.ts') || path.endsWith('.js'), {
      message: "Only TypeScript and JavaScript files supported"
    }),
  // ... other fields
});
```

### Challenge 2: Conditional Schemas
Create schemas that change based on analysis type:
```typescript
const ConditionalAnalyzerSchema = z.discriminatedUnion('analysis_type', [
  z.object({
    analysis_type: z.literal('complexity'),
    complexity_threshold: z.number().min(1).max(10),
  }),
  z.object({
    analysis_type: z.literal('size'),
    size_units: z.enum(['bytes', 'lines', 'words']),
  }),
]);
```

### Challenge 3: Performance Optimization  
Implement schema caching for frequently validated inputs:
```typescript
const schemaCache = new Map();

export function getCachedValidator(toolName: string) {
  if (!schemaCache.has(toolName)) {
    schemaCache.set(toolName, ToolSchemas[toolName]);
  }
  return schemaCache.get(toolName);
}
```

### Challenge 4: Custom Error Messages
Create user-friendly error formatting:
```typescript
export function formatValidationError(error: z.ZodError): string {
  return error.issues
    .map(issue => {
      const field = issue.path.join('.');
      const message = issue.message.toLowerCase();
      return `• ${field}: ${message}`;
    })
    .join('\n');
}
```

### Challenge 5: Integration Testing
Write integration tests that validate the entire flow:
```typescript
export function testFullValidationFlow() {
  // Test input validation
  // Test tool execution simulation  
  // Test result parsing
  // Test error recovery
  // Verify UI integration points
}
```

This tutorial demonstrates how the Schema Validation Framework provides type safety, error handling, and data consistency throughout the proto application. The patterns you've learned here apply to validating any data structure, from simple tool inputs to complex configuration files.
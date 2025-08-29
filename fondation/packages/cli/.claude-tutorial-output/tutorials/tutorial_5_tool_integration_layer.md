**Exercise 4**: Add the FileStats configuration before the closing bracket of `toolConfigs` (around line 366):

```typescript
  FileStats: {
    name: 'FileStats',
    autoExpand: true,
    formatInput: (input) => getRelativePath(input.file_path),
    parseResult: toolParsers.FileStats,
    getSummary: (_input, result, parsedResult) => {
      if (!result) {
        return null;
      }
      if (parsedResult) {
        return `File stats: ${parsedResult.sizeFormatted} • ${parsedResult.type} • ${parsedResult.modified}`;
      }
      return 'File stats retrieved';
    },
    renderResult: (rawResult, parsedResult) => {
      if (!rawResult) {
        return <Text color="gray">No file stats</Text>;
      }
      
      if (parsedResult) {
        // TODO: Create a custom file stats display component
        return (
          <Box flexDirection="column" paddingX={1}>
            <Box>
              <Text color="blue">📁 </Text>
              <Text bold>{parsedResult.fileName}</Text>
              <Text color="gray"> ({parsedResult.type})</Text>
            </Box>
            <Box marginTop={1}>
              <Text color="green">Size: </Text>
              <Text>{parsedResult.sizeFormatted}</Text>
            </Box>
            <Box>
              <Text color="yellow">Modified: </Text>
              <Text>{parsedResult.modified}</Text>
            </Box>
            {parsedResult.permissions && (
              <Box>
                <Text color="cyan">Permissions: </Text>
                <Text>{parsedResult.permissions}</Text>
              </Box>
            )}
            <Box>
              <Text color="magenta">Access: </Text>
              <Text color={parsedResult.isReadable ? 'green' : 'red'}>
                {parsedResult.isReadable ? '✓' : '✗'} Read
              </Text>
              <Text> </Text>
              <Text color={parsedResult.isWritable ? 'green' : 'red'}>
                {parsedResult.isWritable ? '✓' : '✗'} Write
              </Text>
            </Box>
          </Box>
        );
      }
      
      return <CodeBlock content={rawResult} />;
    },
  },
```

**🎯 Learning Point**: The configuration defines:
- **autoExpand**: Show full content immediately
- **formatInput**: Display relative paths for cleaner UI
- **getSummary**: One-line summary like "File stats: 2.5KB • file • 2024-01-01"
- **renderResult**: Rich visual display with colors and icons

### 3.2 Create a Mock Tool Result

**Exercise 5**: Let's create a simple test to verify our tool integration works. Create a new file `/Users/sykar-f/workdir/proto/test-filestats.ts`:

```typescript
import type { ToolUse } from './src/types/chat';
import { ToolFactory } from './src/ui/components/tools/ToolFactory';

// Mock FileStats tool result
const mockFileStatsToolUse: ToolUse = {
  name: 'FileStats',
  input: {
    file_path: '/Users/sykar-f/workdir/proto/package.json',
    include_permissions: true,
  },
  result: `Name: package.json
Path: /Users/sykar-f/workdir/proto/package.json
Size: 2048
Type: file
Modified: 2024-01-01T10:00:00Z
Created: 2024-01-01T09:00:00Z
Permissions: -rw-r--r--
Readable: true
Writable: true`,
};

// TODO: Test that the tool factory can process this tool use
console.log('Testing FileStats tool integration...');
```

## Step 4: Test and Validate

### 4.1 Verify Schema Validation

**Exercise 6**: Let's test our schema validation:

```typescript
import { ToolSchemas } from './src/schemas/tools';

// Test valid input
const validInput = {
  file_path: '/Users/sykar-f/workdir/proto/package.json',
  include_permissions: true,
};

const result = ToolSchemas.FileStats.safeParse(validInput);
console.log('Valid input test:', result.success ? '✅ PASS' : '❌ FAIL');

// Test invalid input
const invalidInput = {
  // Missing required file_path
  include_permissions: true,
};

const invalidResult = ToolSchemas.FileStats.safeParse(invalidInput);
console.log('Invalid input test:', invalidResult.success ? '❌ FAIL' : '✅ PASS');
```

### 4.2 Test Result Parsing

**Exercise 7**: Test the parser with different result formats:

```typescript
import { parseFileStatsResult } from './src/ui/components/tools/parsers';

// Test normal result
const normalResult = `Name: package.json
Path: /Users/sykar-f/workdir/proto/package.json
Size: 2048
Type: file
Modified: 2024-01-01T10:00:00Z
Created: 2024-01-01T09:00:00Z
Permissions: -rw-r--r--
Readable: true
Writable: true`;

const parsed = parseFileStatsResult(normalResult);
console.log('Parsed result:', {
  success: !!parsed,
  fileName: parsed?.fileName,
  sizeFormatted: parsed?.sizeFormatted,
});

// TODO: Test edge cases
// - Empty result
// - Malformed result
// - Missing permissions (when include_permissions: false)
```

### 4.3 Integration Test

**Exercise 8**: Test the full integration by running the tool through the ToolFactory:

```bash
# Create a simple test runner
npm run test:filestats
# OR
node -r ts-node/register test-filestats.ts
```

Expected behaviors to verify:
- [ ] Schema validation works for both valid and invalid inputs
- [ ] Parser correctly extracts file statistics from raw result
- [ ] UI renders with proper colors, icons, and formatting
- [ ] Summary shows "File stats: 2.0KB • file • 2024-01-01"
- [ ] Error handling works for malformed results

## Success Criteria

Check off each item as you complete it:

- [ ] **Schema Integration**: FileStats schema added to `ToolSchemas` export
- [ ] **Type Safety**: All TypeScript types compile without errors
- [ ] **Result Parsing**: Parser correctly transforms raw results into structured data
- [ ] **UI Configuration**: Tool displays with custom formatting and colors
- [ ] **Input Validation**: Invalid inputs are properly rejected
- [ ] **Error Handling**: Malformed results don't crash the parser
- [ ] **Summary Generation**: Concise summaries are generated for the tool
- [ ] **Visual Consistency**: UI follows the same patterns as other tools

**🎯 Debugging Tips**:
- If schemas don't validate, check the export in `ToolSchemas`
- If parsing fails, add `console.log` statements in your parser
- If UI doesn't render, verify the tool name matches exactly across all files
- Check browser dev tools for TypeScript compilation errors

## Extension Challenges

Ready for more? Try these advanced exercises:

### 1. **Performance Optimization**
Modify the parser to handle very large file results efficiently:
```typescript
// Handle results > 10MB without blocking the UI thread
export function parseFileStatsResult(rawResult: string) {
  if (rawResult.length > 10 * 1024 * 1024) {
    // TODO: Implement streaming parser or result truncation
  }
  // ... existing code
}
```

### 2. **Advanced Features**
Add support for analyzing multiple files:
```typescript
export const FileStatsToolSchema = z.object({
  file_paths: z.array(z.string()).min(1).describe('Paths to analyze'),
  include_permissions: z.boolean().optional().default(true),
  recursive: z.boolean().optional().default(false), // For directories
});
```

### 3. **Custom Result Display**
Create a specialized component for file statistics:
```typescript
// Create src/ui/components/tools/resultDisplays/FileStatsDisplay.tsx
export const FileStatsDisplay = ({ stats }: { stats: FileStatsResult }) => {
  // TODO: Create interactive file stats with:
  // - Progress bars for large files
  // - File type icons
  // - Clickable paths
  // - Expandable permission details
};
```

### 4. **Integration with Other Tools**
Make FileStats work seamlessly with Read and Edit tools:
```typescript
// Add a "Quick Actions" section to FileStats display
const QuickActions = ({ filePath }: { filePath: string }) => (
  <Box flexDirection="row" gap={1}>
    <Text color="blue">[R]ead</Text>
    <Text color="green">[E]dit</Text>
    <Text color="yellow">[C]opy Path</Text>
  </Box>
);
```

### 5. **Error Handling Excellence**
Implement comprehensive error handling:
```typescript
export function parseFileStatsResult(rawResult: string) {
  try {
    // Main parsing logic
  } catch (error) {
    // TODO: Add specific error handling for:
    // - Permission denied
    // - File not found
    // - Invalid file paths
    // - Network timeouts (for remote files)
    
    return {
      error: error.message,
      errorType: 'parsing_error',
      rawResult, // Keep for debugging
    };
  }
}
```

**🏆 Challenge Goal**: Create a FileStats tool that's so polished and useful that it could be merged into the main proto codebase!

---

**🎓 Congratulations!** You've successfully built a complete tool integration from scratch. You now understand:
- How tool schemas provide type safety and validation
- How parsers transform raw results into structured data  
- How configurations define consistent UI behavior
- How all pieces work together in the Tool Integration Layer

This knowledge applies to extending proto with any new tool - whether it's analyzing code, interacting with APIs, or processing data. The Tool Integration Layer's consistent patterns make adding new capabilities straightforward and maintainable.
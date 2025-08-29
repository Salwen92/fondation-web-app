Based on the exploration above, we can see the core types that our mock system will work with. Now let's examine the current implementation:

**Questions to investigate:**
1. How does the `createMessage` factory in `src/utils/mockData.ts:10-22` generate realistic timestamps?
2. What makes the `createToolMessage` function in `src/utils/mockData.ts:24-49` flexible for different scenarios?  
3. How does the `parentToolUseId` enable tool relationships?
4. What tools are covered in `mockToolExamples` and how do they differ?

**Your Task:** Examine the existing mock data in `src/utils/mockData.ts` and identify:
- The message counter pattern
- How random timestamps are generated  
- The structure of tool message creation
- Examples of different tool states

## Step 2: Implement Core Mock Functionality

Now let's build our own mock testing infrastructure. Create a new file for your implementation:

### Create Your Mock Data Factory

**File:** `src/utils/myMockData.ts`

```typescript
import type { Message, ToolStatus } from '../types/chat';

export interface MyMockConversation {
  title: string;
  messages: Message[];
}

// TODO: Initialize a message counter starting at 1
let messageIdCounter = // Your implementation here

// TODO: Create a message factory function
const createMessage = (
  role: Message['role'],
  content: string,
  toolUse?: Message['toolUse'],
  parentToolUseId?: string,
): Message => ({
  // TODO: Generate unique ID using counter
  id: // Your implementation here
  role,
  content,
  // TODO: Generate random timestamp within last hour
  timestamp: // Your implementation here
  // TODO: Conditionally add toolUse if provided
  // TODO: Conditionally add parentToolUseId if provided
});
```

**Hints:**
- Look at `src/utils/mockData.ts:8-22` for the counter and timestamp patterns
- Use `Date.now() - Math.random() * 3600000` for random timestamps
- Use spread operator with conditional properties: `...(condition && { property })`

### Build Tool Message Creation

```typescript
// TODO: Create a tool message factory
const createToolMessage = (
  name: string,
  input: unknown,
  result?: string,
  status: ToolStatus = 'completed',
  error?: boolean,
): Message => {
  // TODO: Create base tool use object
  const baseToolUse = {
    // Your implementation here
  };

  // TODO: Handle error case - return error message
  if (error) {
    return createMessage(/* your parameters */);
  }

  // TODO: Return normal tool message
  return createMessage(/* your parameters */);
};
```

**Hints:**
- Reference `src/utils/mockData.ts:24-49` for the structure
- Error messages should use `'Error: Operation failed'` as result
- Use template literals for content like `'Using tool: ${name}'`

## Step 3: Add Real-World Tool Examples

Now let's create realistic examples for different tools. Build a comprehensive tool library:

### File Operations Mock

```typescript
export const myMockToolExamples = {
  // TODO: Implement Read tool examples
  Read: [
    createToolMessage(
      'Read',
      { file_path: '/src/components/Button.tsx' },
      // TODO: Add realistic file content with line numbers
      // Example: "1→import React from 'react';\n2→import { Box } from 'ink';"
    ),
    // TODO: Add second example with longer content
    createToolMessage(
      'Read',
      { file_path: '/src/utils/helpers.ts' },
      // TODO: Generate array of function definitions
      // Hint: Use Array.from() like in src/utils/mockData.ts:62
    ),
  ],

  // TODO: Implement Write tool examples  
  Write: [
    // TODO: Create successful write example
    // TODO: Create config file write example
  ],

  // TODO: Implement Bash tool examples
  Bash: [
    // TODO: Successful test run
    // TODO: Git status check  
    // TODO: Failed command (use error: true)
  ],
};
```

**Implementation Guide:**
- Study the patterns in `src/utils/mockData.ts:52-205`
- Each tool should have 2-3 examples showing different scenarios
- Include both success and failure cases
- Use realistic inputs and outputs that match each tool's purpose

### Tool State Simulation

```typescript
// TODO: Create different tool states for UI testing
export const myMockToolStates = {
  // TODO: Pending state - tool starting up
  pending: createToolMessage(/* your implementation */),
  
  // TODO: In progress state - tool running
  in_progress: createToolMessage(/* your implementation */),
  
  // TODO: Completed state - tool finished successfully  
  completed: createToolMessage(/* your implementation */),
  
  // TODO: Error state - tool failed
  error: createToolMessage(/* your implementation */),
};
```

**Reference:** `src/utils/mockData.ts:207-218` for state examples

## Step 4: Create Advanced Features

### Parent-Child Tool Relationships

The Task tool can spawn child tools. Let's implement this advanced feature:

```typescript
// TODO: Create a Task with child tools
export const createMyTaskWithChildren = (): Message[] => {
  // TODO: Create predictable task ID
  const taskId = 'my_task_001';
  
  // TODO: Create parent Task message
  const taskMessage = createMessage(
    'tool',
    'Using tool: Task',
    {
      name: 'Task',
      input: {
        description: 'Find all React components',
        prompt: 'Search for React components and analyze their structure',
      },
      status: 'in_progress',
    },
  );

  // TODO: Override ID to be predictable
  taskMessage.id = taskId;

  // TODO: Create child tool messages
  const childMessages = [
    // TODO: Glob tool to find .tsx files
    createMessage(
      'tool',
      'Using tool: Glob',
      {
        // TODO: Implement glob search
      },
      taskId, // Parent ID
    ),
    
    // TODO: Read tool to examine component
    createMessage(
      'tool', 
      'Using tool: Read',
      {
        // TODO: Implement file reading
      },
      taskId, // Parent ID
    ),
  ];

  // TODO: Update parent task to completed
  if (taskMessage.toolUse) {
    taskMessage.toolUse = {
      ...taskMessage.toolUse,
      status: 'completed',
      result: 'Found 5 React components with proper TypeScript interfaces',
    };
  }

  return [taskMessage, ...childMessages];
};
```

**Study:** `src/utils/mockData.ts:389-439` for parent-child patterns

### Complete Conversation Scenarios

```typescript
// TODO: Create a realistic development workflow
export const myMockConversations: MyMockConversation[] = [
  {
    title: 'Component Creation Workflow',
    messages: [
      // TODO: User request
      createMessage('user', 'Help me create a new Button component'),
      
      // TODO: Assistant response
      createMessage('assistant', 'I\'ll help you create a Button component. Let me check the project structure first.'),
      
      // TODO: Use your tool examples
      ...myMockToolExamples.LS,
      
      // TODO: Continue the conversation flow
      // Add 4-5 more message exchanges with tools
    ],
  },
  
  // TODO: Add debugging scenario
  {
    title: 'Bug Investigation',
    messages: [
      // TODO: Build a debugging conversation
      // Include failed commands, searches, and fixes
    ],
  },
];
```

**Reference:** `src/utils/mockData.ts:221-386` for conversation patterns

## Step 5: Test and Validate

### Create Mock Hook Implementation

Create your own mock hook in `src/ui/hooks/myUseClaudeQuery.mock.ts`:

```typescript
import { useCallback } from 'react';
import type { Message, ToolUse } from '../../types/chat';

interface MyUseClaudeQueryOptions {
  // TODO: Define the same interface as the real hook
  // Reference: src/ui/hooks/useClaudeQuery.mock.ts:4-13
}

export function myUseClaudeQuery(options: MyUseClaudeQueryOptions) {
  // TODO: Implement mock processQuery function
  const processQuery = useCallback(
    async (_userMessage: string) => {
      // TODO: Mock implementation that calls onComplete immediately
    },
    [/* dependencies */],
  );

  // TODO: Implement mock abort function
  const abort = useCallback(() => {
    // TODO: Mock abort - do nothing
  }, []);

  return {
    processQuery,
    abort,
  };
}
```

### Test Your Implementation

Create a test file `src/utils/myMockData.test.ts`:

```typescript
import { describe, it, expect } from 'bun:test';
import { myMockToolExamples, myMockToolStates, createMyTaskWithChildren } from './myMockData';

describe('My Mock Data', () => {
  it('should create messages with unique IDs', () => {
    // TODO: Test that message IDs increment
  });

  it('should create tool messages with different states', () => {
    // TODO: Test all tool states exist
  });

  it('should create parent-child relationships', () => {
    // TODO: Test task with children
    const messages = createMyTaskWithChildren();
    expect(messages).toHaveLength(3);
    // TODO: Verify parent-child relationships
  });
});
```

**Run Tests:**
```bash
bun test src/utils/myMockData.test.ts
```

### Validate UI Integration

Create a simple UI component to test your mock data:

```typescript
// src/ui/components/MyMockDemo.tsx
import { Box, Text } from 'ink';
import { myMockConversations } from '../../utils/myMockData';

export const MyMockDemo = () => {
  const conversation = myMockConversations[0];
  
  return (
    <Box flexDirection="column">
      <Text bold>{conversation.title}</Text>
      {conversation.messages.map((message) => (
        <Box key={message.id} marginTop={1}>
          <Text color="cyan">{message.role}:</Text>
          <Text> {message.content}</Text>
        </Box>
      ))}
    </Box>
  );
};
```

## Success Criteria

Validate your implementation meets these requirements:

- [ ] **Message Factory**: Creates unique IDs and realistic timestamps
- [ ] **Tool Examples**: Covers at least 5 different tool types with success/error cases  
- [ ] **Tool States**: Implements pending, in_progress, completed, and error states
- [ ] **Parent-Child**: Creates hierarchical tool relationships correctly
- [ ] **Conversations**: Builds realistic multi-turn conversations with tool usage
- [ ] **Mock Hook**: Provides same interface as real hook without API calls
- [ ] **UI Integration**: Renders mock data in React components without errors
- [ ] **Type Safety**: Passes TypeScript compilation without errors

**Verification Commands:**
```bash
# Type checking
bun run typecheck

# Linting
bun run lint

# Test your mock UI
bun run mock-ui
```

## Extension Challenges

### Challenge 1: Performance Optimization
Create a mock data generator that can create thousands of messages efficiently:

```typescript
export const generateLargeMockConversation = (messageCount: number): MyMockConversation => {
  // TODO: Generate conversation with N messages
  // Benchmark: Should handle 10,000 messages in <100ms
};
```

### Challenge 2: Advanced Tool Patterns
Implement streaming tool responses:

```typescript
export const createStreamingToolMessage = (
  name: string,
  input: unknown,
  streamingSteps: string[],
): Message[] => {
  // TODO: Create multiple messages showing tool progress
  // Each step should show incremental progress
};
```

### Challenge 3: Real-World Integration
Create a mock that mirrors your actual development workflow:

```typescript
export const createWorkflowMock = (
  toolSequence: string[],
  projectContext: { files: string[]; deps: string[] },
): MyMockConversation => {
  // TODO: Generate conversation based on real project structure
  // Should feel like actual development session
};
```

### Challenge 4: Performance Monitoring
Add performance metrics to your mock system:

```typescript
export const mockWithMetrics = {
  // TODO: Track message generation time
  // TODO: Monitor memory usage
  // TODO: Count tool usage patterns
  // TODO: Export performance report
};
```

**Test Your Extensions:**
```bash
# Benchmark large conversations
bun run benchmark-mock

# Test streaming responses  
bun run test-streaming

# Validate workflow integration
bun run test-workflow
```

## Debugging Tips

**Common Issues:**
- **TypeScript errors**: Check that your interfaces match `src/types/chat.ts`
- **Missing tool states**: Ensure all ToolStatus values are covered
- **Parent-child relationships**: Verify `parentToolUseId` matches parent message ID
- **Timestamp issues**: Use `Date.now() - Math.random() * 3600000` for realistic times

**Debugging Tools:**
```bash
# Check mock data structure
bun run src/debug-mock.ts

# Validate conversation flows
bun run src/validate-conversations.ts

# Test UI rendering
bun run ui-dev
```

**Performance Considerations:**
- Use `messageIdCounter++` for unique IDs, not random generation
- Cache large mock conversations instead of regenerating
- Consider lazy loading for large datasets
- Profile message creation for bottlenecks

This tutorial provides a comprehensive foundation for building sophisticated mock and testing infrastructure. The system you've built mirrors the production chat interface while providing complete control over data and timing, making it invaluable for development, testing, and demonstration purposes.
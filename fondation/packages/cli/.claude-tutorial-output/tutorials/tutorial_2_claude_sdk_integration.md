**Questions to investigate:**
1. What callback functions does the `useClaudeQuery` hook expect?
2. How are persistent references managed across query calls?
3. What's the purpose of the tool use mapping?

### Task 1.2: Understand Message Flow

Look at how the integration handles different message types in `src/ui/hooks/useClaudeQuery.ts:105-167`. Notice the type-safe routing:

```typescript
// System messages - initialization 
if (isSystemMessage(message)) {
  // Handle system setup
}
// User messages - tool results
else if (isUserMessage(message)) {
  // Process tool execution results
}  
// Assistant messages - Claude's responses
else if (isAssistantMessage(message)) {
  // Convert and display text and tool requests
}
// Result messages - conversation completion
else if (isResultMessage(message)) {
  // Handle success, errors, or limits
}
```

### Task 1.3: Examine Type Adapters

Review `src/types/adapters.ts:19-32` to understand how SDK messages convert to UI messages. Pay attention to:

- The `sdkMessageToUIMessage` function structure
- How `convertAssistantMessage` handles multiple content items
- Tool use extraction and status tracking

## Step 2: Build Your Own Integration

Now let's build a simplified Claude integration from scratch to understand the core concepts.

### Task 2.1: Create the Basic Hook Structure

Create a new file `src/ui/hooks/useSimpleClaudeQuery.ts`:

```typescript
import { useCallback, useRef } from 'react';
import { query, type SDKMessage } from '@anthropic-ai/claude-code';
import type { Message } from '../../types/chat';

interface SimpleClaudeQueryOptions {
  onMessage: (message: Message) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export function useSimpleClaudeQuery({
  onMessage,
  onComplete,
  onError,
}: SimpleClaudeQueryOptions) {
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const processQuery = useCallback(
    async (userMessage: string) => {
      try {
        // TODO: Create abort controller
        
        // TODO: Configure basic Claude query with minimal tools
        
        // TODO: Process streaming messages
        
        // TODO: Handle different message types
        
      } catch (error) {
        onError(error instanceof Error ? error : new Error('Unknown error'));
      }
    },
    [onMessage, onComplete, onError],
  );

  const abort = useCallback(() => {
    // TODO: Implement abort functionality
  }, []);

  return {
    processQuery,
    abort,
  };
}
```

**Your Task**: Fill in the TODOs to create a working Claude integration. Hints:
- Look at `src/ui/hooks/useClaudeQuery.ts:57-93` for query configuration
- Use a basic system prompt: "You are a helpful assistant."
- Start with just `['Read', 'Write', 'Bash']` tools

### Task 2.2: Implement Message Type Routing

Add message processing logic to your hook:

```typescript
// Inside the processQuery function, after query configuration:
for await (const message of query(/* your config */)) {
  
  // TODO: Add type guards from src/types/adapters.ts
  
  if (/* message is assistant type */) {
    // TODO: Convert to UI message and call onMessage
    // Hint: Look at convertAssistantMessage function
    
  } else if (/* message is result type */) {
    // TODO: Check subtype and handle completion/errors
    // Hint: Check src/ui/hooks/useClaudeQuery.ts:157-167
    
  }
  // TODO: Add other message type handlers as needed
}
```

**Your Task**: Implement the message routing logic. Focus on:
- Assistant messages → UI messages
- Result messages → completion/error handling
- Basic text content conversion

### Task 2.3: Test Your Basic Integration

Create a simple test component in `src/ui/components/SimpleClaudeTest.tsx`:

```typescript
import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { useSimpleClaudeQuery } from '../hooks/useSimpleClaudeQuery';
import type { Message } from '../../types/chat';

export const SimpleClaudeTest: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [processing, setProcessing] = useState(false);

  const { processQuery } = useSimpleClaudeQuery({
    onMessage: (message) => {
      // TODO: Add message to state
    },
    onComplete: () => {
      // TODO: Set processing to false
    },
    onError: (error) => {
      // TODO: Handle error - add error message and stop processing
    },
  });

  // TODO: Add test query on component mount
  React.useEffect(() => {
    // Test with simple message like "Hello, count to 3"
  }, []);

  return (
    <Box flexDirection="column">
      <Text>Simple Claude Integration Test</Text>
      {/* TODO: Render messages */}
      {processing && <Text>Processing...</Text>}
    </Box>
  );
};
```

## Step 3: Add Advanced Features

Now let's enhance your integration with real-world features from the production code.

### Task 3.1: Implement Session Persistence

Add session tracking to your hook:

```typescript
export function useSimpleClaudeQuery(/* options */) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string | null>(null); // Add this

  const processQuery = useCallback(
    async (userMessage: string) => {
      // In your query configuration, add:
      // ...(sessionIdRef.current && { resume: sessionIdRef.current }),
      
      for await (const message of query(/* config */)) {
        // TODO: Capture session ID from first message
        // Hint: Look at src/ui/hooks/useClaudeQuery.ts:96-99
        
        // ... rest of message processing
      }
    },
    [/* deps */],
  );

  // TODO: Add resetSession function
  const resetSession = useCallback(() => {
    // Clear session ID
  }, []);

  return {
    processQuery,
    abort,
    resetSession, // Return this new function
  };
}
```

### Task 3.2: Add Tool Execution Tracking

Implement the tool mapping system for tracking tool requests to completion:

```typescript
export function useSimpleClaudeQuery({
  onMessage,
  onMessageUpdate, // Add this callback
  onComplete,
  onError,
}: /* Updated interface */) {
  const toolUseToMessageIdRef = useRef<Map<string, string>>(new Map());

  const processQuery = useCallback(
    async (userMessage: string) => {
      const toolUseToMessageId = toolUseToMessageIdRef.current;
      
      for await (const message of query(/* config */)) {
        if (/* assistant message */) {
          // TODO: When processing assistant messages with tool_use:
          // 1. Store tool ID -> message ID mapping
          // 2. Set initial tool status to 'pending'
          
        } else if (/* user message with tool results */) {
          // TODO: Extract tool_result from message content
          // TODO: Find existing message ID from mapping
          // TODO: Update message with tool result
          // TODO: Clean up mapping after successful update
          // Hint: Look at src/ui/hooks/useClaudeQuery.ts:119-148
        }
      }
    },
    [onMessage, onMessageUpdate, onComplete, onError],
  );
}
```

### Task 3.3: Add Configuration Layer

Create a custom configuration for your integration:

```typescript
// In src/config/simpleConfig.ts
import type { ModelConfig } from '../config';

export interface SimpleClaudeConfig extends ModelConfig {
  maxTools: number;
  enableToolTracking: boolean;
  systemPrompt: string;
}

export const SIMPLE_CLAUDE_CONFIG: SimpleClaudeConfig = {
  model: 'claude-sonnet-4-20250514',
  temperature: 0.7,
  maxTokens: 2048,
  maxTools: 5,
  enableToolTracking: true,
  systemPrompt: 'You are a helpful coding assistant. Be concise and practical.',
};

// TODO: Use this config in your hook instead of hardcoded values
```

## Step 4: Test and Validate

### Task 4.1: Create Integration Tests

Create `src/ui/hooks/__tests__/useSimpleClaudeQuery.test.ts`:

```typescript
import { renderHook } from '@testing-library/react';
import { useSimpleClaudeQuery } from '../useSimpleClaudeQuery';

// TODO: Mock the Claude SDK
jest.mock('@anthropic-ai/claude-code', () => ({
  query: jest.fn(),
}));

describe('useSimpleClaudeQuery', () => {
  it('should process basic text queries', async () => {
    // TODO: Set up mock response
    // TODO: Render hook with test callbacks
    // TODO: Call processQuery with test message
    // TODO: Assert correct callbacks were called
  });

  it('should handle tool execution tracking', async () => {
    // TODO: Mock assistant message with tool_use
    // TODO: Mock user message with tool_result
    // TODO: Verify message updates work correctly
  });

  it('should persist sessions across queries', async () => {
    // TODO: Test session ID capture and reuse
  });
});
```

### Task 4.2: Test Error Scenarios

Add error handling tests:

```typescript
describe('Error Handling', () => {
  it('should handle network errors gracefully', async () => {
    // TODO: Mock network failure
    // TODO: Verify onError callback is called
  });

  it('should handle abort operations', async () => {
    // TODO: Test abort controller functionality
  });

  it('should handle max turns reached', async () => {
    // TODO: Mock result message with error_max_turns
    // TODO: Verify appropriate error handling
  });
});
```

### Task 4.3: Integration Testing

Test your integration in the main chat application:

1. Replace `useClaudeQuery` with `useSimpleClaudeQuery` in `src/ui/components/chat/ChatApp.tsx`
2. Run the application: `bun run dev`
3. Test various scenarios:
   - Basic text queries
   - Tool usage (try "read package.json")
   - Session persistence (multiple queries)
   - Error handling (invalid requests)

### Task 4.4: Validation Checklist

Run these commands to ensure your code meets project standards:

```bash
# Type checking
bun run typecheck

# Linting
bun run lint

# Format checking
bun run format:check
```

Fix any issues that arise.

## Success Criteria

- [ ] **Basic Integration**: Your `useSimpleClaudeQuery` hook can process text queries and receive responses
- [ ] **Message Routing**: Different SDK message types are handled appropriately
- [ ] **Tool Tracking**: Tool requests are mapped to completion results correctly
- [ ] **Session Persistence**: Conversations maintain context across multiple queries
- [ ] **Error Handling**: Network errors, aborts, and API limits are handled gracefully
- [ ] **Type Safety**: All message conversions use proper TypeScript types
- [ ] **Testing**: Integration works in the main chat application
- [ ] **Code Quality**: Passes all linting and type checking

## Extension Challenges

### Challenge 1: Advanced Tool Management

Enhance your integration with sophisticated tool handling:

```typescript
// Add tool priority and concurrency limits
interface ToolExecutionConfig {
  maxConcurrentTools: number;
  toolPriority: Record<string, number>;
  toolTimeout: number;
}

// TODO: Implement tool queue management
// TODO: Add tool execution analytics
// TODO: Create tool result caching
```

### Challenge 2: Performance Optimization

Optimize your integration for production use:

```typescript
// TODO: Implement message batching for rapid updates
// TODO: Add connection pooling and retry logic
// TODO: Create streaming response debouncing
// TODO: Add memory management for long conversations
```

### Challenge 3: Advanced Error Recovery

Build resilient error handling:

```typescript
// TODO: Implement exponential backoff for retries
// TODO: Add circuit breaker pattern for API failures
// TODO: Create fallback response strategies
// TODO: Build diagnostic information collection
```

### Challenge 4: Custom Message Adapters

Create specialized message adapters for different use cases:

```typescript
// TODO: Build code-focused message adapter
// TODO: Create documentation-specific formatting
// TODO: Add markdown-aware content processing
// TODO: Implement custom tool result visualization
```

### Challenge 5: Integration Monitoring

Add observability to your Claude integration:

```typescript
// TODO: Implement performance metrics collection
// TODO: Add conversation analytics tracking
// TODO: Create integration health monitoring
// TODO: Build debugging and inspection tools
```

**Congratulations!** You've built a complete Claude SDK integration that handles streaming conversations, tool execution, and real-time updates. This foundation will enable you to build sophisticated AI-powered applications with reliable communication patterns.

Continue to **[Chapter 3: Schema Validation Framework](chapter_3_schema_validation_framework.md)** to learn how to validate and structure all the data flowing through your integration.
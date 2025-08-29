# Interactive Tutorial: Message and Chat System

**Estimated Time**: 60-75 minutes  
**Difficulty Level**: Intermediate  
**Prerequisites**: [Chapter 1: React-based Terminal UI](chapter_1_react-based_terminal_ui.md), [Chapter 3: Schema Validation Framework](chapter_3_schema_validation_framework.md)

## Learning Objectives

By completing this tutorial, you will:
- Understand how messages flow through the chat system architecture
- Implement message creation, adaptation, and state management
- Handle tool integration within conversations
- Build rich input handling with keyboard shortcuts
- Test conversation flow and tool execution scenarios

## User Story

```
As a developer building a chat interface
I want to create a message debugging panel that shows conversation flow
So that I can understand how messages, tools, and state changes interact in real-time

Acceptance Criteria:
- [ ] Display messages with different roles and formatting
- [ ] Show tool execution status and updates
- [ ] Handle message adaptation between SDK and UI formats
- [ ] Implement input handling with keyboard shortcuts
- [ ] Test conversation scenarios with tool usage
```

## Step 1: Explore the Foundation

Before implementing, let's understand the existing message system architecture.

### Investigate the Core Types

First, examine the message structure in `src/types/chat.ts`:

```bash
# View the message types
head -30 src/types/chat.ts
```

**Questions to investigate:**
1. What are the four message roles and what does each represent?
2. How does the `ToolUse` interface track tool execution status?
3. What's the relationship between `parentToolUseId` and tool messages?

### Explore State Management

Look at how messages are managed in `src/ui/hooks/useChatState.ts`:

```bash
# Find the addMessage function
grep -n "addMessage" src/ui/hooks/useChatState.ts
```

**Key patterns to identify:**
- How are message IDs generated?
- What fields are automatically populated?
- How is the state updated immutably?

## Step 2: Implement Core Message Functionality

Create a message debugging panel that demonstrates the core concepts.

### Create the Message Debug Panel

```typescript
// src/debug/MessageDebugPanel.tsx
import React from 'react';
import { Box, Text } from 'ink';
import { Message, ToolUse } from '../types/chat.js';

interface MessageDebugPanelProps {
  messages: Message[];
  onAddMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
}

export const MessageDebugPanel: React.FC<MessageDebugPanelProps> = ({
  messages,
  onAddMessage,
}) => {
  const formatMessage = (message: Message) => {
    // TODO: Format different message roles with different colors
    // Hint: Use chalk colors - user: blue, assistant: green, system: yellow, tool: cyan
    // Reference: src/ui/components/ChatMessage.tsx for existing patterns
    
    const roleColor = getRoleColor(message.role);
    const timestamp = message.timestamp.toLocaleTimeString();
    
    return {
      header: `[${timestamp}] ${message.role.toUpperCase()}`,
      content: message.content,
      toolInfo: message.toolUse ? formatToolUse(message.toolUse) : null,
    };
  };

  const getRoleColor = (role: Message['role']) => {
    // TODO: Return appropriate color for each role
    // user: 'blue', assistant: 'green', system: 'yellow', tool: 'cyan'
  };

  const formatToolUse = (toolUse: ToolUse) => {
    // TODO: Format tool usage information
    // Include: name, status, input preview (first 50 chars), result preview
    // Status indicators: pending: '⏳', in_progress: '🔄', completed: '✅'
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Message Debug Panel ({messages.length} messages)</Text>
      
      {messages.map((message, index) => {
        const formatted = formatMessage(message);
        return (
          <Box key={message.id} flexDirection="column" marginTop={index > 0 ? 1 : 0}>
            {/* TODO: Render message header with role color */}
            {/* TODO: Render message content */}
            {/* TODO: Render tool information if present */}
          </Box>
        );
      })}
    </Box>
  );
};
```

### Implement Message Creation Helper

```typescript
// src/debug/messageHelpers.ts
import { Message, ToolUse, ToolStatus } from '../types/chat.js';

export const createMessage = (
  role: Message['role'],
  content: string,
  toolUse?: Partial<ToolUse>
): Omit<Message, 'id' | 'timestamp'> => {
  // TODO: Create message object
  // Include toolUse if provided
  // Generate parentToolUseId if this is a tool result message
};

export const createToolMessage = (
  toolName: string,
  input: unknown,
  status: ToolStatus = 'pending'
): Omit<Message, 'id' | 'timestamp'> => {
  // TODO: Create a tool message
  // Role should be 'tool'
  // Content should describe the tool action
  // Include ToolUse object with name, input, and status
};

export const updateToolStatus = (
  message: Message,
  status: ToolStatus,
  result?: string
): Message => {
  // TODO: Update existing tool message with new status and result
  // Return new message object (immutable update)
  // Update content to reflect status change
};
```

## Step 3: Add Message Adaptation

Implement the SDK to UI message adaptation system.

### Create Message Adapter

```typescript
// src/debug/messageAdapter.ts
import { Message } from '../types/chat.js';

// Simulate SDK message types for testing
interface SDKMessage {
  type: 'user' | 'assistant' | 'system' | 'tool_use' | 'tool_result';
  content?: string;
  tool_name?: string;
  tool_input?: unknown;
  tool_use_id?: string;
}

export const adaptSDKMessage = (sdkMessage: SDKMessage): Message | null => {
  switch (sdkMessage.type) {
    case 'user':
      // TODO: Convert user SDK message to UI message
      // Role: 'user', content from SDK message
      break;
      
    case 'assistant':
      // TODO: Convert assistant SDK message to UI message
      // Role: 'assistant', content from SDK message
      break;
      
    case 'tool_use':
      // TODO: Convert tool_use SDK message to UI message
      // Role: 'tool', create ToolUse object with pending status
      // Content should describe the tool being called
      break;
      
    case 'tool_result':
      // TODO: Convert tool_result SDK message to UI message
      // Role: 'tool', create ToolUse object with completed status
      // Include parentToolUseId from tool_use_id
      break;
      
    default:
      return null;
  }
};

export const simulateConversationFlow = (): SDKMessage[] => {
  // TODO: Return array of SDK messages that simulate a conversation
  // Include: user message, assistant response, tool_use, tool_result
  // This will test the complete adaptation flow
  return [
    // User asks something
    // Assistant responds and calls a tool
    // Tool executes and returns result
    // Assistant provides final response
  ];
};
```

## Step 4: Test and Validate

Create comprehensive tests for the message system.

### Create Test Scenarios

```typescript
// src/debug/messageTests.ts
import { Message, ToolStatus } from '../types/chat.js';
import { createMessage, createToolMessage, updateToolStatus } from './messageHelpers.js';
import { adaptSDKMessage, simulateConversationFlow } from './messageAdapter.js';

export const runMessageTests = () => {
  const results: { test: string; passed: boolean; error?: string }[] = [];

  // Test 1: Basic message creation
  try {
    const userMessage = createMessage('user', 'Hello, Claude!');
    const isValid = userMessage.role === 'user' && userMessage.content === 'Hello, Claude!';
    results.push({ test: 'Basic message creation', passed: isValid });
  } catch (error) {
    results.push({ test: 'Basic message creation', passed: false, error: error.message });
  }

  // Test 2: Tool message creation
  try {
    const toolMessage = createToolMessage('readFile', { path: '/test.txt' });
    const isValid = toolMessage.role === 'tool' && 
                   toolMessage.toolUse?.name === 'readFile' &&
                   toolMessage.toolUse?.status === 'pending';
    results.push({ test: 'Tool message creation', passed: isValid });
  } catch (error) {
    results.push({ test: 'Tool message creation', passed: false, error: error.message });
  }

  // Test 3: Tool status updates
  try {
    // TODO: Test updating tool status from pending to completed
    // Create tool message, update status, verify changes
    results.push({ test: 'Tool status updates', passed: false }); // Update this
  } catch (error) {
    results.push({ test: 'Tool status updates', passed: false, error: error.message });
  }

  // Test 4: SDK message adaptation
  try {
    const sdkMessages = simulateConversationFlow();
    const uiMessages = sdkMessages.map(adaptSDKMessage).filter(Boolean);
    const hasAllTypes = uiMessages.some(m => m.role === 'user') &&
                       uiMessages.some(m => m.role === 'assistant') &&
                       uiMessages.some(m => m.role === 'tool');
    results.push({ test: 'SDK message adaptation', passed: hasAllTypes });
  } catch (error) {
    results.push({ test: 'SDK message adaptation', passed: false, error: error.message });
  }

  return results;
};

export const printTestResults = (results: ReturnType<typeof runMessageTests>) => {
  console.log('Message System Test Results:');
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.test}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  const passed = results.filter(r => r.passed).length;
  console.log(`\nPassed: ${passed}/${results.length}`);
};
```

### Integration Test with Chat State

```typescript
// src/debug/integrationTest.ts
import React, { useState } from 'react';
import { useChatState } from '../ui/hooks/useChatState.js';
import { MessageDebugPanel } from './MessageDebugPanel.js';
import { createMessage, createToolMessage } from './messageHelpers.js';

export const MessageSystemIntegrationTest: React.FC = () => {
  const { messages, addMessage, clearMessages } = useChatState();
  
  const runIntegrationTest = () => {
    // TODO: Clear existing messages
    
    // TODO: Add a series of messages that simulate a conversation
    // 1. User message
    // 2. Assistant message with tool use
    // 3. Tool execution messages with status updates
    // 4. Final assistant response
    
    // This should demonstrate the complete message flow
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Message System Integration Test</Text>
      </Box>
      
      <MessageDebugPanel 
        messages={messages}
        onAddMessage={addMessage}
      />
      
      <Box marginTop={1}>
        <Text>Press 't' to run test, 'c' to clear messages</Text>
      </Box>
    </Box>
  );
};
```

## Step 5: Validate Implementation

### Run Your Tests

Execute your message system tests:

```bash
# Run TypeScript compilation to check for errors
npx tsc --noEmit

# If your project has tests, run them
npm test -- --testPathPattern=message

# Or run your debug panel integration test
npm run dev -- --debug-messages
```

### Manual Validation Checklist

- [ ] Messages display with correct role colors
- [ ] Tool messages show status progression (pending → in_progress → completed)
- [ ] SDK message adaptation works for all message types
- [ ] Message state updates immutably
- [ ] Tool relationships (parentToolUseId) are maintained
- [ ] Timestamps are generated correctly

### Expected Behavior

Your message debug panel should:
1. Show color-coded messages by role
2. Display tool execution status with icons
3. Handle tool result linking via parentToolUseId
4. Demonstrate SDK to UI message conversion
5. Update tool status in real-time

## Extension Challenges

### Challenge 1: Message Filtering
Add filtering capabilities to your debug panel:
- Filter by message role
- Show only messages within a time range
- Hide/show tool messages

### Challenge 2: Message Export
Implement conversation export functionality:
- Export as JSON with full tool information
- Export as readable transcript
- Import/replay conversations

### Challenge 3: Real-time Updates
Simulate real-time tool execution:
- Update tool status with delays
- Show progress indicators for long-running tools
- Handle tool cancellation

### Challenge 4: Message Validation
Add validation for message integrity:
- Verify tool message relationships
- Check for missing timestamps
- Validate tool input/output formats

### Challenge 5: Performance Optimization
Optimize for large conversation histories:
- Implement message virtualization
- Add pagination for message display
- Memory-efficient message storage

## Success Criteria

Your implementation is complete when:
- [ ] All test scenarios pass
- [ ] Message debug panel displays all role types correctly
- [ ] Tool status updates work as expected
- [ ] SDK message adaptation handles all message types
- [ ] Integration with useChatState hook functions properly
- [ ] Code follows project TypeScript conventions
- [ ] No linting errors or type errors

This tutorial demonstrates how the Message and Chat System serves as the backbone for conversation management, seamlessly integrating tool execution within the dialogue flow while maintaining state consistency and providing real-time feedback to users.
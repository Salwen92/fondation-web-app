import type { Message, ToolStatus } from '../types/chat';

export interface MockConversation {
  title: string;
  messages: Message[];
}

let messageIdCounter = 1;

const createMessage = (
  role: Message['role'],
  content: string,
  toolUse?: Message['toolUse'],
  parentToolUseId?: string,
): Message => ({
  id: (messageIdCounter++).toString(),
  role,
  content,
  timestamp: new Date(Date.now() - Math.random() * 3600000), // Random time in last hour
  ...(toolUse !== undefined && { toolUse }),
  ...(parentToolUseId !== undefined && { parentToolUseId }),
});

const createToolMessage = (
  name: string,
  input: unknown,
  result?: string,
  status: ToolStatus = 'completed',
  error?: boolean,
): Message => {
  const baseToolUse = {
    name,
    input,
    status,
  };

  if (error) {
    return createMessage('tool', `Error using tool: ${name}`, {
      ...baseToolUse,
      result: 'Error: Operation failed',
      status: 'completed',
    });
  }

  return createMessage('tool', `Using tool: ${name}`, {
    ...baseToolUse,
    ...(result !== undefined && { result }),
  });
};

// Mock data for different tools
export const mockToolExamples = {
  Read: [
    createToolMessage(
      'Read',
      { file_path: '/path/to/file.ts' },
      "1→import React from 'react';\n2→import { Box } from 'ink';\n3→\n4→export const Component = () => {\n5→  return <Box>Hello World</Box>;\n6→};",
    ),
    createToolMessage(
      'Read',
      { file_path: '/very/long/file.py' },
      Array.from({ length: 50 }, (_, i) => `${i + 1}→def function_${i}():`).join('\n'),
    ),
  ],

  Write: [
    createToolMessage(
      'Write',
      { file_path: '/new/file.js', content: 'console.log("hello");' },
      'File written successfully',
    ),
    createToolMessage(
      'Write',
      { file_path: '/config.json' },
      'Configuration file created with 156 bytes',
    ),
  ],

  Edit: [
    createToolMessage(
      'Edit',
      {
        file_path: '/src/component.tsx',
        old_string: 'const Component = () => {',
        new_string: 'const Component: React.FC = () => {',
      },
      'File edited successfully',
    ),
  ],

  MultiEdit: [
    createToolMessage(
      'MultiEdit',
      {
        file_path: '/src/utils.ts',
        edits: [
          { old_string: 'function old()', new_string: 'function updated()' },
          { old_string: 'export default', new_string: 'export' },
        ],
      },
      '2 edits applied successfully',
    ),
  ],

  Bash: [
    createToolMessage(
      'Bash',
      { command: 'npm test' },
      '✓ All tests passed\n\nTest Suites: 12 passed, 12 total\nTests:       48 passed, 48 total\nSnapshots:   0 total\nTime:        4.2s',
    ),
    createToolMessage(
      'Bash',
      { command: 'git status' },
      "On branch main\nYour branch is up to date with 'origin/main'.\n\nChanges not staged for commit:\n  modified:   src/component.tsx\n  modified:   src/utils.ts",
    ),
    createToolMessage(
      'Bash',
      { command: 'ls -la' },
      'drwxr-xr-x  12 user  staff   384 Dec 26 10:30 .\ndrwxr-xr-x   3 user  staff    96 Dec 25 15:20 ..\n-rw-r--r--   1 user  staff  1024 Dec 26 10:30 package.json',
    ),
    createToolMessage('Bash', { command: 'failing-command' }, undefined, 'completed', true),
  ],

  LS: [
    createToolMessage(
      'LS',
      { path: '/Users/user/project' },
      'src/\npackage.json\nREADME.md\n.gitignore\nnode_modules/\ndist/',
    ),
    createToolMessage('LS', { path: '/empty/directory' }, 'Directory is empty'),
  ],

  Glob: [
    createToolMessage(
      'Glob',
      { pattern: '**/*.ts' },
      'src/index.ts\nsrc/types/chat.ts\nsrc/utils/format.ts\ntests/unit.test.ts',
    ),
    createToolMessage('Glob', { pattern: '*.json' }, 'package.json\ntsconfig.json'),
  ],

  Grep: [
    createToolMessage(
      'Grep',
      { pattern: 'useEffect', include: '*.tsx' },
      'src/components/Chat.tsx:12\nsrc/components/Input.tsx:8\nsrc/hooks/useChat.ts:25',
    ),
    createToolMessage(
      'Grep',
      { pattern: 'TODO' },
      'src/utils.ts:45: // TODO: Implement caching\nsrc/api.ts:12: // TODO: Add error handling',
    ),
  ],

  TodoRead: [
    createToolMessage(
      'TodoRead',
      {},
      '1. [pending] Implement dark mode\n2. [in_progress] Fix navigation bug\n3. [completed] Update dependencies',
    ),
  ],

  TodoWrite: [
    createToolMessage(
      'TodoWrite',
      {
        todos: [
          { content: 'Review pull request', status: 'pending', priority: 'high' },
          { content: 'Update documentation', status: 'in_progress', priority: 'medium' },
        ],
      },
      'Todo list updated with 2 items',
    ),
  ],

  Task: [
    createToolMessage(
      'Task',
      {
        description: 'Search for config files',
        prompt: 'Find all configuration files in the project and list their purposes',
      },
      'Task completed. Found 5 configuration files: package.json (npm), tsconfig.json (TypeScript), .eslintrc (linting), .prettierrc (formatting), jest.config.js (testing)',
    ),
  ],

  WebFetch: [
    createToolMessage(
      'WebFetch',
      {
        url: 'https://api.github.com/repos/microsoft/typescript',
        prompt: 'Get the latest release information',
      },
      'TypeScript v5.3.2 released on December 1, 2023\n\nChanges include:\n- Improved performance for large codebases\n- New import attributes support\n- Enhanced error messages',
    ),
  ],

  WebSearch: [
    createToolMessage(
      'WebSearch',
      { query: 'React 18 new features' },
      'React 18 introduces several new features:\n\n1. Automatic Batching\n2. Concurrent Rendering\n3. Suspense improvements\n4. New hooks: useId, useTransition, useDeferredValue',
    ),
  ],
};

// Different tool states for demonstration
export const mockToolStates = {
  pending: createToolMessage('Read', { file_path: '/loading/file.ts' }, undefined, 'pending'),
  in_progress: createToolMessage('Bash', { command: 'npm run build' }, undefined, 'in_progress'),
  completed: createToolMessage(
    'Write',
    { file_path: '/done.txt' },
    'Operation completed',
    'completed',
  ),
  error: createToolMessage('Edit', { file_path: '/nonexistent.ts' }, undefined, 'completed', true),
};

// Sample conversations showcasing different scenarios
export const mockConversations: MockConversation[] = [
  {
    title: 'Development Workflow',
    messages: [
      createMessage('user', 'Help me set up a new React component with TypeScript'),
      createMessage(
        'assistant',
        "I'll help you create a new React component with TypeScript. Let me start by checking the current project structure.",
      ),
      ...mockToolExamples.LS,
      createMessage(
        'assistant',
        'I can see this is a TypeScript project. Let me create a new component file for you.',
      ),
      ...mockToolExamples.Write,
      createMessage(
        'assistant',
        'Now let me add the proper TypeScript types and export it from the index file.',
      ),
      ...mockToolExamples.Edit,
      createMessage(
        'assistant',
        "Perfect! I've created a new React component with TypeScript. The component is properly typed and exported. Would you like me to create any tests for it?",
      ),
      createMessage('user', 'Yes, please create a test file'),
      ...mockToolExamples.Write.slice(1),
      createMessage(
        'assistant',
        "I've created a test file for your component. Let me run the tests to make sure everything works.",
      ),
      ...mockToolExamples.Bash.slice(0, 1),
      createMessage(
        'assistant',
        'Excellent! All tests are passing. Your new React component is ready to use.',
      ),
    ],
  },

  {
    title: 'Debugging Session',
    messages: [
      createMessage('user', 'My app is crashing when I try to build it. Can you help?'),
      createMessage(
        'assistant',
        "I'll help you debug the build issue. Let me first check the current status and run the build to see the error.",
      ),
      ...mockToolExamples.Bash.slice(3), // failing command
      createMessage(
        'assistant',
        "I see there's a build error. Let me examine the project structure and look for common issues.",
      ),
      ...mockToolExamples.Glob,
      createMessage('assistant', 'Let me search for any TypeScript errors in your source files.'),
      ...mockToolExamples.Grep,
      createMessage(
        'assistant',
        'I found some issues in your code. Let me fix the TypeScript errors.',
      ),
      ...mockToolExamples.MultiEdit,
      createMessage(
        'assistant',
        "I've fixed the issues. Let me run the build again to confirm it works.",
      ),
      ...mockToolExamples.Bash.slice(0, 1),
      createMessage(
        'assistant',
        'Great! The build is now successful. The issues were related to missing type annotations and incorrect imports.',
      ),
    ],
  },

  {
    title: 'Code Review and Refactoring',
    messages: [
      createMessage('user', 'Can you review this file and suggest improvements?'),
      createMessage('assistant', "I'd be happy to review your code. Let me read the file first."),
      ...mockToolExamples.Read,
      createMessage(
        'assistant',
        "I've reviewed your code. Here are some suggestions for improvement:\n\n1. Add proper TypeScript types\n2. Extract repeated logic into utilities\n3. Add error handling\n\nLet me implement these improvements.",
      ),
      ...mockToolExamples.Edit,
      createMessage('assistant', 'Now let me create a utility function for the repeated logic.'),
      ...mockToolExamples.Write.slice(1),
      createMessage(
        'assistant',
        'Let me also search for other files that might benefit from similar improvements.',
      ),
      ...mockToolExamples.Grep.slice(1),
      createMessage(
        'assistant',
        "I've refactored your code with better TypeScript types, extracted common utilities, and improved error handling. The code is now more maintainable and type-safe.",
      ),
    ],
  },

  {
    title: 'Project Management',
    messages: [
      createMessage('user', 'Help me organize my development tasks'),
      createMessage(
        'assistant',
        "I'll help you organize your development tasks. Let me first check what tasks you currently have.",
      ),
      ...mockToolExamples.TodoRead,
      createMessage(
        'assistant',
        'I can see you have some existing tasks. Based on your project, let me suggest some additional important tasks and prioritize them.',
      ),
      ...mockToolExamples.TodoWrite,
      createMessage(
        'assistant',
        "I've updated your todo list with better organization and priorities. Let me also search for any TODO comments in your code that should be tracked.",
      ),
      ...mockToolExamples.Grep.slice(1),
      createMessage(
        'assistant',
        'I found some TODO comments in your code. Let me add these to your task list as well.',
      ),
      ...mockToolExamples.TodoWrite,
      createMessage(
        'assistant',
        'Perfect! Your tasks are now well-organized with proper priorities. You have 3 high-priority items to focus on first.',
      ),
    ],
  },

  {
    title: 'Research and Documentation',
    messages: [
      createMessage(
        'user',
        'I need to research the latest React patterns and document our current architecture',
      ),
      createMessage(
        'assistant',
        "I'll help you research React patterns and document your architecture. Let me start by researching the latest React features.",
      ),
      ...mockToolExamples.WebSearch,
      createMessage(
        'assistant',
        'Great! I found information about React 18 features. Let me also fetch more detailed information from the official documentation.',
      ),
      ...mockToolExamples.WebFetch,
      createMessage(
        'assistant',
        'Now let me analyze your current project structure to understand your architecture.',
      ),
      ...mockToolExamples.LS,
      createMessage(
        'assistant',
        "Let me examine your main components to understand the current patterns you're using.",
      ),
      ...mockToolExamples.Read.slice(1),
      createMessage(
        'assistant',
        "Based on my research and analysis of your codebase, I can see you're using some modern patterns but could benefit from React 18's new features. Let me create a documentation file summarizing your current architecture and recommended improvements.",
      ),
      ...mockToolExamples.Write,
      createMessage(
        'assistant',
        "I've created comprehensive documentation covering your current architecture and recommendations for adopting React 18 features like concurrent rendering and automatic batching.",
      ),
    ],
  },
];

// Create a Task with child tools for testing parent-child relationships
export const createTaskWithChildren = (): Message[] => {
  const taskId = 'task_001';
  const taskMessage = createMessage('tool', 'Using tool: Task', {
    name: 'Task',
    input: {
      description: 'Search for config files',
      prompt: 'Find all configuration files in the project',
    },
    status: 'in_progress',
  });

  // Override the ID to make it predictable
  taskMessage.id = taskId;

  // Create child tool messages with parentToolUseId pointing to the Task
  const childMessages = [
    createMessage(
      'tool',
      'Using tool: Glob',
      {
        name: 'Glob',
        input: { pattern: '**/*.json' },
        result: 'package.json\ntsconfig.json\njest.config.json',
        status: 'completed',
      },
      taskId, // Set parent to the Task ID
    ),
    createMessage(
      'tool',
      'Using tool: Read',
      {
        name: 'Read',
        input: { file_path: '/package.json' },
        result: '{\n  "name": "proto",\n  "version": "1.0.0"\n}',
        status: 'completed',
      },
      taskId, // Set parent to the Task ID
    ),
  ];

  // Update the task to completed status after child messages
  if (taskMessage.toolUse) {
    taskMessage.toolUse = {
      ...taskMessage.toolUse,
      status: 'completed',
      result: 'Found 3 configuration files: package.json, tsconfig.json, jest.config.json',
    };
  }

  return [taskMessage, ...childMessages];
};

// Mix of all tool states for comprehensive testing
export const getAllToolStates = (): Message[] => {
  const allMessages = [];

  // Add examples of each tool type
  Object.values(mockToolExamples).forEach((examples) => {
    allMessages.push(...examples);
  });

  // Add different states
  allMessages.push(...Object.values(mockToolStates));

  return allMessages;
};

// Generate a comprehensive conversation with all possible states
export const generateComprehensiveMockConversation = (): MockConversation => ({
  title: 'Complete UI Demo - All States and Tools',
  messages: [
    createMessage(
      'system',
      'Welcome to Claude Dev Chat! This demo shows all possible UI states and tool interactions.',
    ),
    createMessage('user', 'Show me all the tools and their different states'),
    createMessage(
      'assistant',
      "I'll demonstrate all available tools and their various states. Let me start with file operations.",
    ),

    // File operations
    ...mockToolExamples.Read,
    ...mockToolExamples.Write,
    ...mockToolExamples.Edit,
    ...mockToolExamples.MultiEdit,

    createMessage('assistant', 'Now let me show you command execution and search tools.'),

    // Command and search
    ...mockToolExamples.Bash,
    ...mockToolExamples.LS,
    ...mockToolExamples.Glob,
    ...mockToolExamples.Grep,

    createMessage('assistant', 'Here are the task management and research tools.'),

    // Task management and research
    ...mockToolExamples.TodoRead,
    ...mockToolExamples.TodoWrite,
    ...mockToolExamples.Task,
    ...mockToolExamples.WebFetch,
    ...mockToolExamples.WebSearch,

    createMessage('assistant', 'Let me also show you how Task groups work with child tools.'),

    // Task with child tools
    ...createTaskWithChildren(),

    createMessage(
      'assistant',
      'Now let me demonstrate different tool states - pending, in progress, completed, and error states.',
    ),

    // Different states
    mockToolStates.pending,
    mockToolStates.in_progress,
    mockToolStates.completed,
    mockToolStates.error,

    createMessage(
      'assistant',
      'This concludes the demonstration of all tool types and states. You can see how each tool renders differently based on its type and status.',
    ),
    createMessage('user', 'Perfect! This shows all the different UI components.'),
    createMessage(
      'assistant',
      'Exactly! This demo covers:\n\n- All 12+ tool types with realistic inputs and outputs\n- Different tool states (pending, in-progress, completed, error)\n- Various message types (user, assistant, system, tool)\n- Long and short content examples\n- Error handling scenarios\n\nThis gives you a complete view of how the chat interface handles all possible scenarios.',
    ),

    // Add some system messages for variety
    createMessage('system', 'Connection restored after temporary network issue'),
    createMessage('system', 'Processing completed successfully'),
  ],
});

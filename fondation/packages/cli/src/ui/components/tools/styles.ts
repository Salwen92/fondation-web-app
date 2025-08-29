export const toolStyles = {
  // Tool name colors
  toolNames: {
    LS: 'blue',
    Bash: 'magenta',
    Read: 'cyan',
    Write: 'green',
    Edit: 'yellow',
    MultiEdit: 'yellow',
    Glob: 'blue',
    Grep: 'magenta',
    TodoRead: 'gray',
    TodoWrite: 'gray',
    default: 'white',
  },

  // Icons for different tool types
  toolIcons: {
    LS: '📁',
    Bash: '⚡',
    Read: '📖',
    Write: '✏️',
    Edit: '✂️',
    MultiEdit: '✂️',
    Glob: '🔍',
    Grep: '🔎',
    TodoRead: '📋',
    TodoWrite: '✅',
    default: '🔧',
  },

  // Other style constants
  parameterColor: 'gray',
  valueColor: 'white',
  errorColor: 'red',
  successColor: 'green',
  dimColor: 'gray',

  // Status indicators for todos
  todoStatus: {
    pending: '○',
    in_progress: '◐',
    completed: '●',
  },

  // Priority colors for todos
  todoPriority: {
    high: 'red',
    medium: 'yellow',
    low: 'gray',
  },
} as const;

export type ToolName = keyof typeof toolStyles.toolNames;

export function getToolColor(toolName: string): string {
  return toolStyles.toolNames[toolName as ToolName] || toolStyles.toolNames.default;
}

export function getToolIcon(toolName: string): string {
  return toolStyles.toolIcons[toolName as ToolName] || toolStyles.toolIcons.default;
}

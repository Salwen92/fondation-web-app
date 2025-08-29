export type ToolStatus = 'pending' | 'in_progress' | 'completed';

export interface ToolUse {
  name: string;
  input?: unknown;
  result?: string;
  status?: ToolStatus;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
  toolUse?: ToolUse;
  parentToolUseId?: string;
}

export interface ChatState {
  messages: Message[];
  currentInput: string;
  isProcessing: boolean;
  error?: string;
  cursorPosition: number;
}

export type MessageRole = Message['role'];

export interface ChatInputState {
  value: string;
  cursorPosition: number;
}

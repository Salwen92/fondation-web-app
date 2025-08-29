import type { SDKMessage } from '@anthropic-ai/claude-code';
import type { Logger } from 'pino';
import type { Message, ToolUse } from '../../types/chat';
import type { ToolArgs, ToolResult } from './tools';

export interface QueryEventHandlers {
  onMessage: (message: Message) => void;
  onMessageUpdate: (
    messageId: string,
    updates: Partial<Omit<Message, 'toolUse'>> & { toolUse?: Partial<ToolUse> },
  ) => void;
  onToolUse: (messageId: string, tool: string, args: ToolArgs) => void;
  onToolResult: (messageId: string, tool: string, result: ToolResult) => void;
  onStreamStart: (messageId: string) => void;
  onStreamContent: (messageId: string, content: string) => void;
  onStreamEnd: (messageId: string) => void;
  onThinkingStart?: (messageId: string) => void;
  onThinkingContent?: (messageId: string, content: string) => void;
  onThinkingEnd?: (messageId: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
  onAbort?: () => void;
}

export interface QueryOptions {
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  maxThinkingTokens?: number;
  sessionId?: string;
  logMessages?: boolean;
  allowedTools?: string[];
  workingDirectory?: string;
  abortSignal?: AbortSignal;
  logger?: Logger;
}

export interface QuerySession {
  id: string;
  messages: SDKMessage[];
  createdAt: Date;
  lastUsedAt: Date;
}

// Additional types for internal use
export interface ToolUseMapping {
  toolUseId: string;
  messageId: string;
}

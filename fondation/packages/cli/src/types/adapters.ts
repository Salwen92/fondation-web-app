import type {
  SDKAssistantMessage,
  SDKMessage,
  SDKResultMessage,
  SDKSystemMessage,
  SDKUserMessage,
} from '@anthropic-ai/claude-code';
import type { Message, MessageRole, ToolStatus, ToolUse } from './chat';

// Type for SDK message content items
type MessageContentItem =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id?: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id?: string; content?: unknown };

/**
 * Converts SDK message types to UI message types
 */
export function sdkMessageToUIMessage(sdkMessage: SDKMessage): Message | Message[] | null {
  switch (sdkMessage.type) {
    case 'assistant':
      return convertAssistantMessage(sdkMessage);
    case 'user':
      return convertUserMessage(sdkMessage);
    case 'system':
      return convertSystemMessage(sdkMessage);
    case 'result':
      return convertResultMessage(sdkMessage);
    default:
      return null;
  }
}

/**
 * Converts assistant SDK message to UI message(s)
 */
function convertAssistantMessage(sdkMessage: SDKAssistantMessage): Message[] {
  const messages: Message[] = [];
  const baseTimestamp = new Date();

  if (sdkMessage.message?.content && Array.isArray(sdkMessage.message.content)) {
    for (let i = 0; i < sdkMessage.message.content.length; i++) {
      const contentItem = sdkMessage.message.content[i];
      // Add small time offset to maintain order within the same SDK message
      const timestamp = new Date(baseTimestamp.getTime() + i);

      if (contentItem.type === 'text') {
        messages.push({
          id: sdkMessage.message.id || generateMessageId(),
          role: 'assistant',
          content: contentItem.text,
          timestamp,
        });
      } else if (contentItem.type === 'tool_use') {
        messages.push({
          id: contentItem.id || generateMessageId(),
          role: 'tool',
          content: `Using tool: ${contentItem.name}`,
          timestamp,
          toolUse: {
            name: contentItem.name,
            input: contentItem.input,
            status: 'pending',
          },
          ...(sdkMessage.parent_tool_use_id && { parentToolUseId: sdkMessage.parent_tool_use_id }),
        });
      }
    }
  } else if (typeof sdkMessage.message === 'string') {
    // Legacy string format
    messages.push({
      id: generateMessageId(),
      role: 'assistant',
      content: sdkMessage.message,
      timestamp: baseTimestamp,
    });
  }

  return messages;
}

/**
 * Converts user SDK message to UI message
 */
function convertUserMessage(sdkMessage: SDKUserMessage): Message | null {
  if (sdkMessage.message?.content && Array.isArray(sdkMessage.message.content)) {
    // Handle tool results
    const toolResult = sdkMessage.message.content.find(
      (c: MessageContentItem) => c.type === 'tool_result',
    );
    if (toolResult) {
      // Tool results are handled separately in the hook
      return null;
    }

    // Handle text content
    const textContent = sdkMessage.message.content
      .filter((c: MessageContentItem): c is { type: 'text'; text: string } => c.type === 'text')
      .map((c: { type: 'text'; text: string }) => c.text)
      .join('');

    if (textContent) {
      return {
        id: generateMessageId(),
        role: 'user',
        content: textContent,
        timestamp: new Date(),
      };
    }
  } else if (typeof sdkMessage.message === 'string') {
    return {
      id: generateMessageId(),
      role: 'user',
      content: sdkMessage.message,
      timestamp: new Date(),
    };
  }

  return null;
}

/**
 * Converts system SDK message to UI message
 */
function convertSystemMessage(_sdkMessage: SDKSystemMessage): Message | null {
  // System messages are typically not displayed in the UI
  return null;
}

/**
 * Converts result SDK message to UI message
 */
function convertResultMessage(_sdkMessage: SDKResultMessage): Message | null {
  // Result messages indicate completion/error states and are handled separately
  return null;
}

/**
 * Converts UI message to SDK message format (for API communication)
 */
export function uiMessageToSDKMessage(uiMessage: Message): Partial<SDKMessage> {
  // This is primarily for converting user messages for API calls
  if (uiMessage.role === 'user') {
    return {
      type: 'user',
      message: {
        role: 'user',
        content: uiMessage.content,
      },
    };
  }

  // Other message types are typically not converted back to SDK format
  return {};
}

/**
 * Type guards for SDK message types
 */
export function isAssistantMessage(message: SDKMessage): message is SDKAssistantMessage {
  return message.type === 'assistant';
}

export function isUserMessage(message: SDKMessage): message is SDKUserMessage {
  return message.type === 'user';
}

export function isSystemMessage(message: SDKMessage): message is SDKSystemMessage {
  return message.type === 'system';
}

export function isResultMessage(message: SDKMessage): message is SDKResultMessage {
  return message.type === 'result';
}

/**
 * Extracts tool use information from SDK message
 */
export function extractToolUseFromSDKMessage(sdkMessage: SDKAssistantMessage): ToolUse[] {
  const toolUses: ToolUse[] = [];

  if (sdkMessage.message?.content && Array.isArray(sdkMessage.message.content)) {
    for (const contentItem of sdkMessage.message.content) {
      if (contentItem.type === 'tool_use') {
        toolUses.push({
          name: contentItem.name,
          input: contentItem.input,
          status: 'pending',
        });
      }
    }
  }

  return toolUses;
}

/**
 * Updates tool use status in UI message
 */
export function updateToolUseStatus(
  toolUse: ToolUse,
  status: ToolStatus,
  result?: string,
): ToolUse {
  return {
    ...toolUse,
    status,
    ...(result !== undefined && { result }),
  };
}

/**
 * Generates a unique message ID
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Validates message role compatibility
 */
export function validateMessageRole(role: string): role is MessageRole {
  return ['user', 'assistant', 'system', 'tool'].includes(role);
}

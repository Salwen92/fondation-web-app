import type { Message } from '../../types/chat';

export interface ToolArgs {
  [key: string]: unknown;
}

export interface ToolResult {
  error?: string;
  output?: unknown;
  [key: string]: unknown;
}

export interface CompletionStats {
  duration?: number;
  tokensUsed?: number;
  [key: string]: unknown;
}

export interface OutputFormatter {
  onMessage: (message: Message) => void;
  onMessageUpdate: (id: string, updates: Partial<Message>) => void;
  onToolUse: (id: string, tool: string, args: ToolArgs) => void;
  onToolResult: (id: string, tool: string, result: ToolResult) => void;
  onStreamStart: (id: string) => void;
  onStreamContent: (id: string, content: string) => void;
  onStreamEnd: (id: string) => void;
  onComplete: (stats: CompletionStats) => void;
  onError: (error: Error) => void;
}

interface FormatterOptions {
  stream?: boolean;
  quiet?: boolean;
  json?: boolean;
}

export function createOutputFormatter(format: string, options: FormatterOptions): OutputFormatter {
  switch (format) {
    case 'json':
      return new JSONFormatter(options);
    case 'markdown':
      return new MarkdownFormatter(options);
    default:
      return new TextFormatter(options);
  }
}

class TextFormatter implements OutputFormatter {
  protected messages: Map<string, Message> = new Map();

  constructor(protected options: FormatterOptions) {}

  onMessage(message: Message) {
    this.messages.set(message.id, message);

    if (message.role === 'user' && !this.options.quiet) {
      // User messages are not displayed in text format
    }
  }

  onMessageUpdate(id: string, updates: Partial<Message>) {
    const message = this.messages.get(id);
    if (message) {
      Object.assign(message, updates);
    }
  }

  onToolUse(_id: string, _tool: string, _args: ToolArgs) {
    // Tool logging now handled by run command's dual logging system
  }

  onToolResult(_id: string, _tool: string, _result: ToolResult) {
    // Tool logging now handled by run command's dual logging system
  }

  onStreamStart(_id: string) {
    // Text format begins streaming immediately
  }

  onStreamContent(_id: string, content: string) {
    if (this.options.stream) {
      process.stdout.write(content);
    }
  }

  onStreamEnd(id: string) {
    if (this.options.stream) {
      const message = this.messages.get(id);
      if (message && !message.content.endsWith('\n')) {
        process.stdout.write('\n');
      }
    }
  }

  onComplete(_stats: CompletionStats) {
    if (!this.options.stream) {
      // Output all assistant messages at once
      for (const message of Array.from(this.messages.values())) {
        if (message.role === 'assistant') {
          process.stdout.write(message.content);
          if (!message.content.endsWith('\n')) {
            process.stdout.write('\n');
          }
        }
      }
    }

    if (!this.options.quiet) {
      // Completion notifications are not shown in text format
    }
  }

  onError(_error: Error) {
    // Errors are handled by the caller
  }
}

class JSONFormatter implements OutputFormatter {
  constructor(protected options: FormatterOptions) {}

  private result: {
    messages: Array<{
      id: string;
      role: string;
      content: string;
      timestamp: Date;
    }>;
    tools: Array<{
      messageId: string;
      tool: string;
      args: ToolArgs;
      timestamp: Date;
      result?: ToolResult;
    }>;
    error: null | { message: string; code: string };
    stats: CompletionStats;
  } = {
    messages: [],
    tools: [],
    error: null,
    stats: {},
  };
  onMessage(message: Message) {
    this.result.messages.push({
      id: message.id,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
    });
  }

  onMessageUpdate(id: string, updates: Partial<Message>) {
    const message = this.result.messages.find((m) => m.id === id);
    if (message) {
      Object.assign(message, updates);
    }
  }

  onToolUse(id: string, tool: string, args: ToolArgs) {
    this.result.tools.push({
      messageId: id,
      tool,
      args,
      timestamp: new Date(),
    });
  }

  onToolResult(id: string, tool: string, result: ToolResult) {
    const toolUse = this.result.tools.find((t) => t.messageId === id && t.tool === tool);
    if (toolUse) {
      toolUse.result = result;
    }
  }

  onStreamStart(_id: string) {
    // JSON formatter doesn't stream
  }
  onStreamContent(_id: string, _content: string) {
    // JSON formatter doesn't stream
  }
  onStreamEnd(_id: string) {
    // JSON formatter doesn't stream
  }

  onComplete(stats: CompletionStats) {
    this.result.stats = stats;
    // Output the complete JSON result
    process.stdout.write(`${JSON.stringify(this.result, null, 2)}\n`);
  }

  onError(error: Error) {
    this.result.error = {
      message: error.message,
      code: (error as Error & { code?: string }).code || 'UNKNOWN',
    };
  }
}

class MarkdownFormatter extends TextFormatter {
  private hasShownAssistantHeader = false;

  override onMessage(message: Message) {
    super.onMessage(message);

    if (message.role === 'user' && !this.options.quiet) {
      // User messages are shown in markdown format
      process.stdout.write(`\n### User\n${message.content}\n`);
    }
  }

  override onStreamStart(_id: string) {
    // Reset header flag for each new assistant message
    this.hasShownAssistantHeader = false;
  }

  override onStreamContent(_id: string, content: string) {
    if (this.options.stream) {
      // Show assistant header before first content
      if (!this.hasShownAssistantHeader && !this.options.quiet) {
        process.stdout.write('\n### Assistant\n');
        this.hasShownAssistantHeader = true;
      }
      process.stdout.write(content);
    }
  }

  override onToolUse(_id: string, _tool: string, _args: ToolArgs) {
    // Tool logging now handled by run command's dual logging system
  }
}

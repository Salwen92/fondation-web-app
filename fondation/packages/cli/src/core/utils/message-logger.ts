import { existsSync } from 'node:fs';
import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { SDKMessage } from '@anthropic-ai/claude-code';
import type { Message } from '../../types/chat';

interface LogEntry {
  timestamp: string;
  type: 'sdk_message' | 'user_prompt' | 'ui_message';
  direction: 'incoming' | 'outgoing';
  messageType?: string;
  data: unknown;
}

export class MessageLogger {
  private logDir: string;
  private currentLogFile: string;
  private isEnabled: boolean;

  constructor(enabled: boolean = true, logDir?: string) {
    this.logDir = logDir || join(process.cwd(), 'logs');
    this.currentLogFile = this.getLogFileName();
    this.isEnabled = enabled;
  }

  private getLogFileName(): string {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    return join(this.logDir, `conversation-${dateStr}.log`);
  }

  private async ensureLogDirectory(): Promise<void> {
    if (!existsSync(this.logDir)) {
      await mkdir(this.logDir, { recursive: true });
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    return `${JSON.stringify(entry)}\n`;
  }

  async logSDKMessage(
    message: SDKMessage,
    direction: 'incoming' | 'outgoing' = 'incoming',
  ): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    try {
      await this.ensureLogDirectory();

      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        type: 'sdk_message',
        direction,
        messageType: message.type,
        data: message,
      };

      await appendFile(this.currentLogFile, this.formatLogEntry(entry));
    } catch (_error) {
      // Silently ignore logging errors to prevent disrupting the main application
    }
  }

  async logUserPrompt(prompt: string): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    try {
      await this.ensureLogDirectory();

      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        type: 'user_prompt',
        direction: 'outgoing',
        data: { prompt },
      };

      await appendFile(this.currentLogFile, this.formatLogEntry(entry));
    } catch (_error) {
      // Silently ignore logging errors to prevent disrupting the main application
    }
  }

  async logUIMessage(
    message: Message,
    direction: 'incoming' | 'outgoing' = 'incoming',
  ): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    try {
      await this.ensureLogDirectory();

      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        type: 'ui_message',
        direction,
        data: message,
      };

      await appendFile(this.currentLogFile, this.formatLogEntry(entry));
    } catch (_error) {
      // Silently ignore logging errors to prevent disrupting the main application
    }
  }

  // Rotate log file when date changes
  checkAndRotateLog(): void {
    const newLogFile = this.getLogFileName();
    if (newLogFile !== this.currentLogFile) {
      this.currentLogFile = newLogFile;
    }
  }

  // Enable/disable logging at runtime
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  getLogFilePath(): string {
    return this.currentLogFile;
  }
}

// Export a factory function instead of a singleton for the core module
export function createMessageLogger(enabled: boolean = true, logDir?: string): MessageLogger {
  return new MessageLogger(enabled, logDir);
}

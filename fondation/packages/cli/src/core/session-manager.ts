import type { SDKMessage } from '@anthropic-ai/claude-code';
import type { QuerySession } from './types/query';

export interface ISessionStorage {
  save(session: QuerySession): Promise<void>;
  load(id: string): Promise<QuerySession | null>;
  list(): Promise<Array<{ id: string; createdAt: Date; lastUsedAt: Date }>>;
  delete(id: string): Promise<void>;
}

// In-memory session storage for backward compatibility
export class InMemorySessionStorage implements ISessionStorage {
  private sessions: Map<string, QuerySession> = new Map();

  async save(session: QuerySession): Promise<void> {
    this.sessions.set(session.id, session);
  }

  async load(id: string): Promise<QuerySession | null> {
    return this.sessions.get(id) || null;
  }

  async list(): Promise<Array<{ id: string; createdAt: Date; lastUsedAt: Date }>> {
    return Array.from(this.sessions.values()).map((session) => ({
      id: session.id,
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
    }));
  }

  async delete(id: string): Promise<void> {
    this.sessions.delete(id);
  }
}

export class SessionManager {
  constructor(private storage: ISessionStorage = new InMemorySessionStorage()) {}

  async createSession(id: string = crypto.randomUUID()): Promise<QuerySession> {
    const session: QuerySession = {
      id,
      messages: [],
      createdAt: new Date(),
      lastUsedAt: new Date(),
    };
    await this.storage.save(session);
    return session;
  }

  async getSession(id: string): Promise<QuerySession | null> {
    const session = await this.storage.load(id);
    if (session) {
      session.lastUsedAt = new Date();
      await this.storage.save(session);
    }
    return session;
  }

  async addMessage(sessionId: string, message: SDKMessage): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      session.messages.push(message);
      await this.storage.save(session);
    }
  }

  async clearSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      session.messages = [];
      await this.storage.save(session);
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.storage.delete(sessionId);
  }

  async listSessions(): Promise<Array<{ id: string; createdAt: Date; lastUsedAt: Date }>> {
    return this.storage.list();
  }
}

// Default singleton instance with in-memory storage
export const sessionManager = new SessionManager();

import crypto from "crypto";
import { GameSession } from "./gameSession";

interface SessionRecord {
  sessionId: string;
  gameSession: GameSession;
  lastAccessedAt: number;
}

// One GameSession per browser session (Application Design Question 2:B), tracked in memory only
// (NFR Requirements: no database). BR-9: a missing/unknown/expired session ID transparently gets a
// fresh GameSession rather than an error.
export class SessionManager {
  private sessions = new Map<string, SessionRecord>();

  getOrCreateSession(sessionId?: string): { sessionId: string; gameSession: GameSession; isNew: boolean } {
    if (sessionId) {
      const existing = this.sessions.get(sessionId);
      if (existing) {
        existing.lastAccessedAt = Date.now();
        return { sessionId, gameSession: existing.gameSession, isNew: false };
      }
    }
    const newId = crypto.randomUUID();
    const gameSession = new GameSession();
    this.sessions.set(newId, { sessionId: newId, gameSession, lastAccessedAt: Date.now() });
    return { sessionId: newId, gameSession, isNew: true };
  }

  resetSession(sessionId: string): GameSession {
    const gameSession = new GameSession();
    this.sessions.set(sessionId, { sessionId, gameSession, lastAccessedAt: Date.now() });
    return gameSession;
  }

  touch(sessionId: string): void {
    const record = this.sessions.get(sessionId);
    if (record) record.lastAccessedAt = Date.now();
  }

  evictInactiveSince(cutoffEpochMs: number): number {
    let evicted = 0;
    for (const [id, record] of this.sessions.entries()) {
      if (record.lastAccessedAt < cutoffEpochMs) {
        this.sessions.delete(id);
        evicted += 1;
      }
    }
    return evicted;
  }

  get size(): number {
    return this.sessions.size;
  }
}

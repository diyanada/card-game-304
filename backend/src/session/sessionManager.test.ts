import { SessionManager } from "./sessionManager";
import { GameSession } from "./gameSession";

describe("SessionManager", () => {
  test("getOrCreateSession with no id creates a new session", () => {
    const manager = new SessionManager();
    const result = manager.getOrCreateSession();
    expect(result.isNew).toBe(true);
    expect(typeof result.sessionId).toBe("string");
    expect(result.sessionId.length).toBeGreaterThan(0);
    expect(result.gameSession).toBeInstanceOf(GameSession);
    expect(manager.size).toBe(1);
  });

  test("getOrCreateSession with a known id returns the same GameSession", () => {
    const manager = new SessionManager();
    const first = manager.getOrCreateSession();
    const second = manager.getOrCreateSession(first.sessionId);

    expect(second.isNew).toBe(false);
    expect(second.sessionId).toBe(first.sessionId);
    expect(second.gameSession).toBe(first.gameSession);
    expect(manager.size).toBe(1);
  });

  test("getOrCreateSession with an unknown id transparently creates a fresh session (BR-9)", () => {
    const manager = new SessionManager();
    const result = manager.getOrCreateSession("unknown-session-id");

    expect(result.isNew).toBe(true);
    expect(result.sessionId).not.toBe("unknown-session-id");
    expect(manager.size).toBe(1);
  });

  test("resetSession replaces the GameSession for an existing id", () => {
    const manager = new SessionManager();
    const first = manager.getOrCreateSession();
    const originalGameSession = first.gameSession;

    const resetGameSession = manager.resetSession(first.sessionId);
    expect(resetGameSession).not.toBe(originalGameSession);

    const lookedUp = manager.getOrCreateSession(first.sessionId);
    expect(lookedUp.gameSession).toBe(resetGameSession);
  });

  test("evictInactiveSince removes only sessions older than the cutoff", () => {
    const manager = new SessionManager();
    const older = manager.getOrCreateSession();
    const cutoff = Date.now() + 1000;
    const newer = manager.getOrCreateSession();
    // Force "newer" to look recently accessed relative to the cutoff by touching it after the cutoff moment.
    jest.spyOn(Date, "now").mockReturnValue(cutoff + 5000);
    manager.touch(newer.sessionId);
    jest.restoreAllMocks();

    const evictedCount = manager.evictInactiveSince(cutoff);
    expect(evictedCount).toBe(1);
    expect(manager.getOrCreateSession(older.sessionId).isNew).toBe(true); // no longer found -> recreated
    expect(manager.size).toBeGreaterThanOrEqual(1);
  });
});

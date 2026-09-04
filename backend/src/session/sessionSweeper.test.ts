import { SessionManager } from "./sessionManager";
import { SessionSweeper, SESSION_EXPIRY_MS, SWEEP_INTERVAL_MS } from "./sessionSweeper";

describe("SessionSweeper", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("evicts sessions inactive for longer than SESSION_EXPIRY_MS once a sweep runs", () => {
    const manager = new SessionManager();
    const stale = manager.getOrCreateSession();

    const sweeper = new SessionSweeper(manager);
    sweeper.start();

    // Advance time past the expiry window, then let one sweep interval elapse.
    jest.advanceTimersByTime(SESSION_EXPIRY_MS + SWEEP_INTERVAL_MS);

    const lookup = manager.getOrCreateSession(stale.sessionId);
    expect(lookup.isNew).toBe(true); // original session was evicted, so a fresh one was created

    sweeper.stop();
  });

  test("does not evict a session that has been touched recently", () => {
    const manager = new SessionManager();
    const active = manager.getOrCreateSession();

    const sweeper = new SessionSweeper(manager);
    sweeper.start();

    // Keep the session alive by touching it just before each sweep would otherwise evict it.
    jest.advanceTimersByTime(SWEEP_INTERVAL_MS);
    manager.touch(active.sessionId);
    jest.advanceTimersByTime(SWEEP_INTERVAL_MS);
    manager.touch(active.sessionId);

    const lookup = manager.getOrCreateSession(active.sessionId);
    expect(lookup.isNew).toBe(false);

    sweeper.stop();
  });

  test("stop() prevents further sweeps", () => {
    const manager = new SessionManager();
    const session = manager.getOrCreateSession();

    const sweeper = new SessionSweeper(manager);
    sweeper.start();
    sweeper.stop();

    jest.advanceTimersByTime(SESSION_EXPIRY_MS + SWEEP_INTERVAL_MS * 2);

    const lookup = manager.getOrCreateSession(session.sessionId);
    expect(lookup.isNew).toBe(false); // never swept, still present
  });
});

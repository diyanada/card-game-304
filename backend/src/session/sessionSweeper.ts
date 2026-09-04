import { SessionManager } from "./sessionManager";

// BR-11 / NFR Design: evicts sessions inactive for SESSION_EXPIRY_MS, checked every SWEEP_INTERVAL_MS.
export const SESSION_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
export const SWEEP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export class SessionSweeper {
  private timer: NodeJS.Timeout | null = null;

  constructor(private sessionManager: SessionManager) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.sessionManager.evictInactiveSince(Date.now() - SESSION_EXPIRY_MS);
    }, SWEEP_INTERVAL_MS);
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

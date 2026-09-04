// Paces AI turns and staged phase transitions (deal -> trump reveal -> trick play -> trick clear ->
// hand scoring -> next hand) using real server-side timers, per GameSession instance (application-design
// component-methods.md: TurnScheduler.scheduleAiTurn / cancelPending).

export function randomAiTurnDelayMs(): number {
  // NFR-2: AI turns paced ~0.5-1.5s
  return 500 + Math.random() * 1000;
}

export class TurnScheduler {
  private pendingTimeouts: NodeJS.Timeout[] = [];

  schedule(fn: () => void, delayMs: number): NodeJS.Timeout {
    const handle = setTimeout(fn, delayMs);
    // Never let a pending game timer alone keep the process alive (harmless in production, where the
    // HTTP server's listening socket keeps the event loop alive regardless; avoids leaking open
    // handles across test runs, which don't have a listening server).
    handle.unref?.();
    this.pendingTimeouts.push(handle);
    return handle;
  }

  cancelPending(): void {
    this.pendingTimeouts.forEach((handle) => clearTimeout(handle));
    this.pendingTimeouts = [];
  }
}

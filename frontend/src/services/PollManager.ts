// Logical component per nfr-design/logical-components.md: isolates polling-interval management and
// consecutive-failure counting from GameClientService's data-fetching responsibility.

import { GameStateDTO } from "../types/game";
import * as GameClientService from "./GameClientService";
import { logError } from "./logError";

export const POLL_INTERVAL_MS = 500; // NFR Requirements Question 4:A
const RECONNECTING_THRESHOLD = 3; // NFR Design Question 1 pattern

export type Connectivity = "ok" | "reconnecting";

export interface PollUpdate {
  data: GameStateDTO | null;
  connectivity: Connectivity;
}

export interface PollManager {
  start(): void;
  stop(): void;
}

export function createPollManager(onUpdate: (update: PollUpdate) => void): PollManager {
  let consecutiveFailures = 0;
  let latestData: GameStateDTO | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let stopped = false;

  async function tick(): Promise<void> {
    try {
      const state = await GameClientService.pollState();
      if (stopped) return;
      consecutiveFailures = 0;
      latestData = state;
      onUpdate({ data: latestData, connectivity: "ok" });
    } catch (error) {
      if (stopped) return;
      consecutiveFailures += 1;
      logError("Poll request failed", error);
      // Stale state is retained (not cleared) so the UI doesn't blank out during a blip.
      onUpdate({
        data: latestData,
        connectivity: consecutiveFailures >= RECONNECTING_THRESHOLD ? "reconnecting" : "ok",
      });
    }
  }

  return {
    start() {
      stopped = false;
      void tick();
      timer = setInterval(() => {
        void tick();
      }, POLL_INTERVAL_MS);
    },
    stop() {
      stopped = true;
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    },
  };
}

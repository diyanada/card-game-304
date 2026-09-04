import { GamePhase } from "../types/game";

// Explicit game-flow state machine (Application Design Question 3:A).
const VALID_TRANSITIONS: Record<GamePhase, GamePhase[]> = {
  DEALING: ["TRUMP_SELECTION"],
  TRUMP_SELECTION: ["TRUMP_REVEAL"],
  TRUMP_REVEAL: ["TRICK_PLAY"],
  TRICK_PLAY: ["HAND_SCORING"],
  HAND_SCORING: ["DEALING", "MATCH_END"],
  MATCH_END: [],
};

export type ActionType = "PLAY_CARD" | "SELECT_TRUMP";

export class GameStateMachine {
  private phase: GamePhase = "DEALING";

  getPhase(): GamePhase {
    return this.phase;
  }

  canTransition(from: GamePhase, to: GamePhase): boolean {
    return VALID_TRANSITIONS[from].includes(to);
  }

  transition(to: GamePhase): void {
    if (!this.canTransition(this.phase, to)) {
      throw new Error(`Invalid phase transition: ${this.phase} -> ${to}`);
    }
    this.phase = to;
  }

  isActionAllowed(action: ActionType): boolean {
    if (action === "PLAY_CARD") return this.phase === "TRICK_PLAY";
    if (action === "SELECT_TRUMP") return this.phase === "TRUMP_SELECTION";
    return false;
  }

  reset(): void {
    this.phase = "DEALING";
  }
}

import { GameSession } from "../session/gameSession";
import { Suit } from "../types/game";

// application-design/services.md: MatchService. AITurnService's responsibility (scheduling AI turns
// after any state-changing action) is absorbed into GameSession itself here — see code-summary.md's
// "Design Decisions" note for why (GameSession already owns the TurnScheduler instance needed for
// cancellation semantics on reset, so splitting AI-turn orchestration into a separate class would
// require exposing internals that are otherwise private).

export function startNewMatch(gameSession: GameSession): void {
  gameSession.startNewMatch();
}

export function playCard(gameSession: GameSession, cardId: string): void {
  gameSession.applyPlayerMove(cardId); // throws ClientError on illegal move / wrong turn
}

export function selectTrump(gameSession: GameSession, suit: Suit): void {
  gameSession.selectTrump(suit); // throws ClientError if it isn't the player's turn to choose
}

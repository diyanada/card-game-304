import { GameSession } from "../session/gameSession";
import { GameStateDTO } from "../types/game";

// Projects a GameSession's full internal state down to the Player-visible DTO
// (application-design/services.md: StateQueryService).
export function getPublicState(session: GameSession): GameStateDTO {
  const hands = session.getHands();

  return {
    phase: session.getPhase(),
    trumpSuit: session.getTrumpSuit(),
    dealerSeat: session.getDealerSeat(),
    turnSeat: session.getTurnSeat(),
    playerHand: [...hands.player],
    opponentCardCounts: {
      partner: hands.partner.length,
      opponentLeft: hands.opponentLeft.length,
      opponentRight: hands.opponentRight.length,
    },
    currentTrick: session.getCurrentTrick().map((entry) => ({ seat: entry.seat, card: entry.card })),
    legalMoves: session.getLegalMovesForPlayer().map((c) => c.id),
    scores: session.getScores(),
    handsWon: session.getHandsWon(),
    lastTrickWinner: session.getLastTrickWinner(),
    matchWinner: session.getMatchWinner(),
  };
}

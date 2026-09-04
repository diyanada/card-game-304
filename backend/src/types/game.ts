// Mirrors frontend/src/types/game.ts (the shared contract) plus server-only types
// (see aidlc-docs/construction/backend/functional-design/domain-entities.md).

export type Suit = "Spades" | "Hearts" | "Clubs" | "Diamonds";
export type Rank = "9" | "10" | "J" | "Q" | "K" | "A";

export type Seat = "player" | "partner" | "opponentLeft" | "opponentRight";

export type Team = "playerTeam" | "opponentTeam";

// TRUMP_SELECTION (2026-09-03 addition): after dealing, whichever seat leads the hand's first
// trick (turnSeat) picks the trump suit by looking at their own hand — human via a UI prompt,
// AI via a heuristic (gameEngine.selectAiTrump). Replaces the previous automatic random "cut for
// trump". TRUMP_REVEAL is then a brief pause showing the chosen suit before trick play begins.
export type GamePhase =
  | "DEALING"
  | "TRUMP_SELECTION"
  | "TRUMP_REVEAL"
  | "TRICK_PLAY"
  | "HAND_SCORING"
  | "MATCH_END";

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
}

export interface TrickCardEntry {
  seat: Seat;
  card: Card;
}

export interface TeamScore {
  hand: number;
  cumulative: number;
}

export interface GameScores {
  playerTeam: TeamScore;
  opponentTeam: TeamScore;
}

// Running count of hands won per team across the match (2026-09-03 addition). A hand with an exactly
// tied point split is a "push" and increments neither team's count (user decision).
export interface HandTally {
  playerTeam: number;
  opponentTeam: number;
}

export interface OpponentCardCounts {
  partner: number;
  opponentLeft: number;
  opponentRight: number;
}

// The public contract returned to the client (StateQueryService.getPublicState).
export interface GameStateDTO {
  phase: GamePhase;
  trumpSuit: Suit | null;
  dealerSeat: Seat;
  turnSeat: Seat;
  playerHand: Card[];
  opponentCardCounts: OpponentCardCounts;
  currentTrick: TrickCardEntry[];
  legalMoves: string[];
  scores: GameScores;
  handsWon: HandTally;
  lastTrickWinner: Seat | null;
  matchWinner: Team | null;
}

export const ALL_SUITS: Suit[] = ["Spades", "Hearts", "Clubs", "Diamonds"];
// 2026-09-03 change request: 7 and 8 removed from the deck (24 cards total, was 32).
export const ALL_RANKS: Rank[] = ["9", "10", "J", "Q", "K", "A"];

// Card point values per requirements.md FR-14 (updated 2026-09-03: J/9/A/10/K/Q = 30/20/11/10/3/2,
// so the full 24-card deck now totals exactly 304 points, matching the match target score).
export const CARD_POINTS: Record<Rank, number> = {
  J: 30,
  "9": 20,
  A: 11,
  "10": 10,
  K: 3,
  Q: 2,
};

export const MATCH_TARGET_SCORE = 304;
export const CARDS_PER_PLAYER = 6; // = ALL_RANKS.length; hardcoded for clarity at call sites

export function teamForSeat(seat: Seat): Team {
  return seat === "player" || seat === "partner" ? "playerTeam" : "opponentTeam";
}

export function nextSeat(seat: Seat): Seat {
  const order: Seat[] = ["player", "opponentLeft", "partner", "opponentRight"];
  const idx = order.indexOf(seat);
  return order[(idx + 1) % order.length];
}

// --- Server-only types (never sent to the client) ---

export interface GameSessionState {
  hands: Record<Seat, Card[]>;
  dealerSeat: Seat;
  turnSeat: Seat;
  trumpSuit: Suit | null;
  currentTrick: TrickCardEntry[];
  phase: GamePhase;
  scores: GameScores;
  lastTrickWinner: Seat | null;
  matchWinner: Team | null;
  handTricksWon: Record<Team, Card[]>;
  tricksPlayedThisHand: number;
}

export interface ApiErrorBody {
  error: string;
}

// Authoritative rule engine + AI decision logic (Application Design: combined per Question 4:B).
// Pure functions operating on explicit state, ported from the validated
// frontend/src/mock/mockGameEngine.ts (Functional Design Question 3:A — exact reuse), adapted
// from that file's module-singleton style into stateless functions so multiple concurrent
// GameSession instances (one per browser session, per Application Design Question 2:B) can each
// call this same engine independently.

import { buildDeck, rankIndex, shuffle } from "./deck";
import {
  ALL_SUITS,
  Card,
  CARD_POINTS,
  CARDS_PER_PLAYER,
  GameScores,
  Seat,
  Suit,
  Team,
  TrickCardEntry,
  MATCH_TARGET_SCORE,
  nextSeat,
  teamForSeat,
} from "../types/game";

// 2026-09-03 change request: trump is no longer determined by an automatic random "cut" — the
// seat leading the hand's first trick now chooses it (see gameSession.ts's TRUMP_SELECTION phase
// and selectAiTrump below), so dealHand only deals cards.
export function dealHand(dealerSeat: Seat): Record<Seat, Card[]> {
  const deck = shuffle(buildDeck());

  const seatOrder: Seat[] = [];
  let s = nextSeat(dealerSeat);
  for (let i = 0; i < 4; i++) {
    seatOrder.push(s);
    s = nextSeat(s);
  }

  const hands: Record<Seat, Card[]> = {
    player: [],
    partner: [],
    opponentLeft: [],
    opponentRight: [],
  };

  let cardIndex = 0;
  for (let round = 0; round < CARDS_PER_PLAYER; round++) {
    for (const seat of seatOrder) {
      hands[seat].push(deck[cardIndex]);
      cardIndex++;
    }
  }

  return hands;
}

// AI trump choice (2026-09-03 addition), per the user's chosen rule: pick the suit the AI holds
// the most cards of, breaking ties by whichever tied suit has the higher total point value in
// hand. Deterministic and rule-based, consistent with the rest of the AI (FR-19).
export function selectAiTrump(hand: Card[]): Suit {
  let best: Suit = ALL_SUITS[0];
  let bestCount = -1;
  let bestPoints = -1;
  for (const suit of ALL_SUITS) {
    const suitCards = hand.filter((c) => c.suit === suit);
    const count = suitCards.length;
    const points = suitCards.reduce((sum, c) => sum + CARD_POINTS[c.rank], 0);
    if (count > bestCount || (count === bestCount && points > bestPoints)) {
      best = suit;
      bestCount = count;
      bestPoints = points;
    }
  }
  return best;
}

export function rotateDealer(currentDealer: Seat): Seat {
  return nextSeat(currentDealer);
}

export function getLegalMoves(hand: Card[], currentTrick: TrickCardEntry[]): Card[] {
  if (currentTrick.length === 0) {
    return hand;
  }
  const ledSuit = currentTrick[0].card.suit;
  const followSuitCards = hand.filter((c) => c.suit === ledSuit);
  return followSuitCards.length > 0 ? followSuitCards : hand;
}

function currentTrickWinnerSoFar(
  currentTrick: TrickCardEntry[],
  trumpSuit: Suit
): { seat: Seat; card: Card } | null {
  if (currentTrick.length === 0) return null;
  const ledSuit = currentTrick[0].card.suit;
  const trumpPlays = currentTrick.filter((t) => t.card.suit === trumpSuit);
  const pool = trumpPlays.length > 0 ? trumpPlays : currentTrick.filter((t) => t.card.suit === ledSuit);
  let best = pool[0];
  for (const entry of pool) {
    if (rankIndex(entry.card.rank) > rankIndex(best.card.rank)) best = entry;
  }
  return best;
}

export function resolveTrick(currentTrick: TrickCardEntry[], trumpSuit: Suit): Seat {
  const winner = currentTrickWinnerSoFar(currentTrick, trumpSuit);
  if (!winner) {
    throw new Error("Cannot resolve an empty trick");
  }
  return winner.seat;
}

export function selectAiMove(
  seat: Seat,
  hand: Card[],
  currentTrick: TrickCardEntry[],
  trumpSuit: Suit
): Card {
  const legal = getLegalMoves(hand, currentTrick);
  const ledSuit = currentTrick.length > 0 ? currentTrick[0].card.suit : null;

  const byLowest = (cards: Card[]) => [...cards].sort((a, b) => rankIndex(a.rank) - rankIndex(b.rank))[0];

  if (!ledSuit) {
    const nonTrump = legal.filter((c) => c.suit !== trumpSuit);
    return nonTrump.length > 0 ? byLowest(nonTrump) : byLowest(legal);
  }

  const followingSuit = legal.some((c) => c.suit === ledSuit);
  const winnerSoFar = currentTrickWinnerSoFar(currentTrick, trumpSuit);
  const teamAlreadyWinning = winnerSoFar ? teamForSeat(winnerSoFar.seat) === teamForSeat(seat) : false;

  if (followingSuit) {
    const suitCards = legal.filter((c) => c.suit === ledSuit);
    if (teamAlreadyWinning) {
      return byLowest(suitCards);
    }
    if (winnerSoFar && winnerSoFar.card.suit === ledSuit) {
      const winning = suitCards
        .filter((c) => rankIndex(c.rank) > rankIndex(winnerSoFar.card.rank))
        .sort((a, b) => rankIndex(a.rank) - rankIndex(b.rank));
      if (winning.length > 0) return winning[0];
    }
    return byLowest(suitCards);
  }

  const trumpCards = legal.filter((c) => c.suit === trumpSuit);
  if (!teamAlreadyWinning && trumpCards.length > 0) {
    if (winnerSoFar && winnerSoFar.card.suit === trumpSuit) {
      const winningTrumps = trumpCards
        .filter((c) => rankIndex(c.rank) > rankIndex(winnerSoFar.card.rank))
        .sort((a, b) => rankIndex(a.rank) - rankIndex(b.rank));
      if (winningTrumps.length > 0) return winningTrumps[0];
      const nonTrump = legal.filter((c) => c.suit !== trumpSuit);
      return nonTrump.length > 0 ? byLowest(nonTrump) : byLowest(trumpCards);
    }
    return byLowest(trumpCards);
  }

  const nonTrump = legal.filter((c) => c.suit !== trumpSuit);
  return nonTrump.length > 0 ? byLowest(nonTrump) : byLowest(legal);
}

export function scoreHand(handTricksWon: Record<Team, Card[]>): { playerTeam: number; opponentTeam: number } {
  const sum = (cards: Card[]) => cards.reduce((total, c) => total + CARD_POINTS[c.rank], 0);
  return {
    playerTeam: sum(handTricksWon.playerTeam),
    opponentTeam: sum(handTricksWon.opponentTeam),
  };
}

// 2026-09-03 addition: which team won a single hand, for the running hands-won/hands-lost tally.
// An exact point tie for the hand is a push and counts for neither team (user decision).
export function determineHandWinner(handPoints: { playerTeam: number; opponentTeam: number }): Team | null {
  if (handPoints.playerTeam > handPoints.opponentTeam) return "playerTeam";
  if (handPoints.opponentTeam > handPoints.playerTeam) return "opponentTeam";
  return null;
}

export function checkMatchEnd(scores: GameScores): { ended: boolean; winner: Team | null } {
  if (scores.playerTeam.cumulative >= MATCH_TARGET_SCORE || scores.opponentTeam.cumulative >= MATCH_TARGET_SCORE) {
    const winner: Team = scores.playerTeam.cumulative > scores.opponentTeam.cumulative ? "playerTeam" : "opponentTeam";
    return { ended: true, winner };
  }
  return { ended: false, winner: null };
}

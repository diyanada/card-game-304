import { ALL_RANKS, ALL_SUITS, Card, Rank } from "../types/game";

// 304 deck: 24 cards, ranks 9-A across 4 suits. Ported from the validated
// frontend/src/mock/deck.ts per Functional Design Question 3:A (exact reuse).
// 2026-09-03 change request: 7 and 8 removed (was 32 cards, ranks 7-A).
export function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of ALL_SUITS) {
    for (const rank of ALL_RANKS) {
      deck.push({ id: `${rank}${suit[0]}`, suit, rank });
    }
  }
  return deck;
}

export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Trick-strength order, lowest to highest. 304's ranking does NOT follow standard poker/bridge
// order: within a suit, J is the highest card, then 9, A, 10, K, Q lowest (2026-09-03 correction —
// this list previously read "9","10","J","Q","K","A", i.e. standard order, which was wrong for 304).
export const RANK_ORDER: Rank[] = ["Q", "K", "10", "A", "9", "J"];

export function rankIndex(rank: Rank): number {
  return RANK_ORDER.indexOf(rank);
}

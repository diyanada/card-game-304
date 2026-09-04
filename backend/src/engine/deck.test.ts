import { buildDeck, rankIndex, shuffle } from "./deck";

describe("deck", () => {
  test("buildDeck produces 24 unique cards", () => {
    const deck = buildDeck();
    expect(deck).toHaveLength(24);
    expect(new Set(deck.map((c) => c.id)).size).toBe(24);
  });

  test("buildDeck covers all 4 suits with 6 ranks each", () => {
    const deck = buildDeck();
    const bySuit: Record<string, number> = {};
    for (const card of deck) {
      bySuit[card.suit] = (bySuit[card.suit] ?? 0) + 1;
    }
    expect(bySuit).toEqual({ Spades: 6, Hearts: 6, Clubs: 6, Diamonds: 6 });
  });

  test("shuffle preserves all cards (same multiset, different or same order)", () => {
    const deck = buildDeck();
    const shuffled = shuffle(deck);
    expect(shuffled).toHaveLength(deck.length);
    expect(shuffled.map((c) => c.id).sort()).toEqual(deck.map((c) => c.id).sort());
  });

  test("rankIndex reflects 304's non-standard trick ranking: J > 9 > A > 10 > K > Q", () => {
    expect(rankIndex("J")).toBeGreaterThan(rankIndex("9"));
    expect(rankIndex("9")).toBeGreaterThan(rankIndex("A"));
    expect(rankIndex("A")).toBeGreaterThan(rankIndex("10"));
    expect(rankIndex("10")).toBeGreaterThan(rankIndex("K"));
    expect(rankIndex("K")).toBeGreaterThan(rankIndex("Q"));
  });
});

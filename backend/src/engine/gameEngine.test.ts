import {
  checkMatchEnd,
  dealHand,
  determineHandWinner,
  getLegalMoves,
  resolveTrick,
  rotateDealer,
  scoreHand,
  selectAiMove,
  selectAiTrump,
} from "./gameEngine";
import { Card, GameScores, Team, TrickCardEntry } from "../types/game";

jest.mock("./deck", () => {
  const actual = jest.requireActual("./deck");
  return { ...actual, shuffle: (arr: unknown[]) => arr };
});

function card(id: string, suit: Card["suit"], rank: Card["rank"]): Card {
  return { id, suit, rank };
}

describe("gameEngine", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("dealHand", () => {
    test("deals 6 cards to each seat", () => {
      jest.spyOn(Math, "random").mockReturnValue(0); // identity shuffle mock, so this only affects AI-delay math elsewhere
      const hands = dealHand("player");

      expect(hands.player).toHaveLength(6);
      expect(hands.partner).toHaveLength(6);
      expect(hands.opponentLeft).toHaveLength(6);
      expect(hands.opponentRight).toHaveLength(6);

      // player is dealt 4th in the round-robin starting from opponentLeft (nextSeat(dealer=player)).
      expect(hands.player.map((c) => c.id).sort()).toEqual(
        ["QS", "10H", "AH", "QC", "10D", "AD"].sort()
      );
    });
  });

  describe("selectAiTrump", () => {
    test("picks the suit with the most cards in hand", () => {
      const hand: Card[] = [
        card("9S", "Spades", "9"),
        card("KS", "Spades", "K"),
        card("10S", "Spades", "10"),
        card("AH", "Hearts", "A"),
        card("QC", "Clubs", "Q"),
        card("QD", "Diamonds", "Q"),
      ];
      expect(selectAiTrump(hand)).toBe("Spades");
    });

    test("breaks a tie in card count by the tied suit with the higher total point value", () => {
      // Spades: 10S+AS = 10+11 = 21 pts. Clubs: 9C+QC = 20+2 = 22 pts. Both hold 2 cards.
      const hand: Card[] = [
        card("10S", "Spades", "10"),
        card("AS", "Spades", "A"),
        card("9C", "Clubs", "9"),
        card("QC", "Clubs", "Q"),
        card("KH", "Hearts", "K"),
        card("QD", "Diamonds", "Q"),
      ];
      expect(selectAiTrump(hand)).toBe("Clubs");
    });

    test("breaks a full count-and-points tie by suit order (Spades first)", () => {
      // Spades: 10S+AS = 21 pts. Clubs: 10C+AC = 21 pts. Exact tie on both count and points.
      const hand: Card[] = [
        card("10S", "Spades", "10"),
        card("AS", "Spades", "A"),
        card("10C", "Clubs", "10"),
        card("AC", "Clubs", "A"),
        card("KH", "Hearts", "K"),
        card("QD", "Diamonds", "Q"),
      ];
      expect(selectAiTrump(hand)).toBe("Spades");
    });
  });

  describe("rotateDealer", () => {
    test("rotates in alternating-team clockwise order", () => {
      expect(rotateDealer("player")).toBe("opponentLeft");
      expect(rotateDealer("opponentLeft")).toBe("partner");
      expect(rotateDealer("partner")).toBe("opponentRight");
      expect(rotateDealer("opponentRight")).toBe("player");
    });
  });

  describe("getLegalMoves", () => {
    const hand: Card[] = [card("10H", "Hearts", "10"), card("JS", "Spades", "J"), card("AH", "Hearts", "A")];

    test("returns the full hand when leading (empty trick)", () => {
      expect(getLegalMoves(hand, [])).toEqual(hand);
    });

    test("returns only cards of the led suit when the hand can follow suit", () => {
      const trick: TrickCardEntry[] = [{ seat: "opponentLeft", card: card("9H", "Hearts", "9") }];
      const legal = getLegalMoves(hand, trick);
      expect(legal.map((c) => c.id).sort()).toEqual(["10H", "AH"].sort());
    });

    test("returns the full hand when it cannot follow the led suit", () => {
      const trick: TrickCardEntry[] = [{ seat: "opponentLeft", card: card("9C", "Clubs", "9") }];
      expect(getLegalMoves(hand, trick)).toEqual(hand);
    });
  });

  describe("resolveTrick", () => {
    test("the highest card of the led suit wins when no trump is played", () => {
      // 304's rank order is non-standard: J > 9 > A > 10 > K > Q. So 9H (not AH) is highest here.
      const trick: TrickCardEntry[] = [
        { seat: "opponentLeft", card: card("9H", "Hearts", "9") },
        { seat: "partner", card: card("AH", "Hearts", "A") },
        { seat: "opponentRight", card: card("10H", "Hearts", "10") },
        { seat: "player", card: card("QH", "Hearts", "Q") },
      ];
      expect(resolveTrick(trick, "Spades")).toBe("opponentLeft");
    });

    test("any trump beats a non-trump card of the led suit", () => {
      const trick: TrickCardEntry[] = [
        { seat: "opponentLeft", card: card("AH", "Hearts", "A") },
        { seat: "partner", card: card("9S", "Spades", "9") }, // the only trump played, wins regardless of its own rank
        { seat: "opponentRight", card: card("10H", "Hearts", "10") },
        { seat: "player", card: card("KH", "Hearts", "K") },
      ];
      expect(resolveTrick(trick, "Spades")).toBe("partner");
    });

    test("the highest trump wins when multiple trumps are played", () => {
      // 304's rank order is non-standard: J > 9 > A > 10 > K > Q. So 9S (not AS) is the highest trump here.
      const trick: TrickCardEntry[] = [
        { seat: "opponentLeft", card: card("9S", "Spades", "9") },
        { seat: "partner", card: card("AS", "Spades", "A") },
        { seat: "opponentRight", card: card("10H", "Hearts", "10") },
        { seat: "player", card: card("KS", "Spades", "K") },
      ];
      expect(resolveTrick(trick, "Spades")).toBe("opponentLeft");
    });
  });

  describe("selectAiMove", () => {
    test("leads with the lowest non-trump card when starting the trick", () => {
      // 304's rank order is non-standard: J > 9 > A > 10 > K > Q. So 10H (not 9H) is the lower of the two.
      const hand: Card[] = [card("AS", "Spades", "A"), card("9H", "Hearts", "9"), card("10H", "Hearts", "10")];
      const move = selectAiMove("opponentLeft", hand, [], "Spades");
      expect(move.id).toBe("10H");
    });

    test("follows suit and wins with the lowest sufficient card when the team isn't already winning", () => {
      // QH is 304's lowest-ranked Heart, so both KH and AH can beat it; KH (rank index 1) is lower than AH (3).
      const hand: Card[] = [card("KH", "Hearts", "K"), card("AH", "Hearts", "A")];
      const trick: TrickCardEntry[] = [{ seat: "opponentLeft", card: card("QH", "Hearts", "Q") }];
      const move = selectAiMove("player", hand, trick, "Spades");
      expect(move.id).toBe("KH"); // lowest card that still beats QH
    });

    test("follows suit with the lowest card when its own team is already winning", () => {
      // 304's rank order is non-standard: J > 9 > A > 10 > K > Q. So KH (not 9H) is now the lower card.
      const hand: Card[] = [card("9H", "Hearts", "9"), card("KH", "Hearts", "K")];
      const trick: TrickCardEntry[] = [{ seat: "partner", card: card("AH", "Hearts", "A") }];
      const move = selectAiMove("player", hand, trick, "Spades");
      expect(move.id).toBe("KH"); // partner already winning, concede with lowest
    });

    test("trumps in with the lowest trump when unable to follow suit and not already winning", () => {
      const hand: Card[] = [card("9S", "Spades", "9"), card("9C", "Clubs", "9")];
      const trick: TrickCardEntry[] = [{ seat: "opponentLeft", card: card("AH", "Hearts", "A") }];
      const move = selectAiMove("player", hand, trick, "Spades");
      expect(move.id).toBe("9S");
    });
  });

  describe("scoreHand", () => {
    test("sums card point values per team", () => {
      const handTricksWon: Record<Team, Card[]> = {
        playerTeam: [card("JH", "Hearts", "J"), card("9S", "Spades", "9")], // 30 + 20 = 50
        opponentTeam: [card("AH", "Hearts", "A"), card("10S", "Spades", "10"), card("KH", "Hearts", "K")], // 11+10+3 = 24
      };
      expect(scoreHand(handTricksWon)).toEqual({ playerTeam: 50, opponentTeam: 24 });
    });
  });

  describe("determineHandWinner", () => {
    test("returns the team with more points that hand", () => {
      expect(determineHandWinner({ playerTeam: 180, opponentTeam: 124 })).toBe("playerTeam");
      expect(determineHandWinner({ playerTeam: 50, opponentTeam: 254 })).toBe("opponentTeam");
    });

    test("returns null on an exact tie (push, counts for neither team)", () => {
      expect(determineHandWinner({ playerTeam: 152, opponentTeam: 152 })).toBeNull();
    });
  });

  describe("checkMatchEnd", () => {
    test("reports not ended when both teams are below the target", () => {
      const scores: GameScores = {
        playerTeam: { hand: 0, cumulative: 100 },
        opponentTeam: { hand: 0, cumulative: 90 },
      };
      expect(checkMatchEnd(scores)).toEqual({ ended: false, winner: null });
    });

    test("declares the higher-scoring team the winner once the target is reached", () => {
      const scores: GameScores = {
        playerTeam: { hand: 0, cumulative: 310 },
        opponentTeam: { hand: 0, cumulative: 240 },
      };
      expect(checkMatchEnd(scores)).toEqual({ ended: true, winner: "playerTeam" });
    });
  });
});

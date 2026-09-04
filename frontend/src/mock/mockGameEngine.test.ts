import { startNewMatch, getState, playCard, selectTrump, determineHandWinner } from "./mockGameEngine";

jest.mock("./deck", () => {
  const actual = jest.requireActual("./deck");
  return {
    ...actual,
    // Deterministic "shuffle": identity, so deal order is the deck's build order.
    shuffle: (arr: unknown[]) => arr,
  };
});

describe("mockGameEngine", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Deterministic cut-for-trump index (0) and AI turn delay (always the 500ms floor).
    jest.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test("starts a match in DEALING phase with an empty player hand", () => {
    startNewMatch();
    const state = getState();
    expect(state.phase).toBe("DEALING");
    expect(state.playerHand).toHaveLength(0);
    expect(state.trumpSuit).toBeNull();
    expect(state.scores.playerTeam.cumulative).toBe(0);
    expect(state.scores.opponentTeam.cumulative).toBe(0);
    expect(state.handsWon).toEqual({ playerTeam: 0, opponentTeam: 0 });
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

  test("deals 6 cards and enters TRUMP_SELECTION with the hand's leader waiting to choose", () => {
    startNewMatch();
    jest.advanceTimersByTime(600);

    const state = getState();
    expect(state.phase).toBe("TRUMP_SELECTION");
    expect(state.trumpSuit).toBeNull();
    expect(state.playerHand).toHaveLength(6);
    expect(state.playerHand.map((c) => c.id).sort()).toEqual(
      ["9S", "KS", "JH", "9C", "KC", "JD"].sort()
    );
    // Hand 1's leader is the player (dealer=opponentRight -> seat to their left leads, FR-8).
    expect(state.turnSeat).toBe("player");
  });

  test("rejects trump selection when it is not the player's turn to choose", () => {
    startNewMatch();
    // Still DEALING — no seat has been asked to choose trump yet.
    const result = selectTrump("Spades");
    expect(result.ok).toBe(false);
  });

  test("accepts the player's trump choice and reveals it before trick play begins", () => {
    startNewMatch();
    jest.advanceTimersByTime(600);

    const result = selectTrump("Spades");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.phase).toBe("TRUMP_REVEAL");
      expect(result.state.trumpSuit).toBe("Spades");
    }

    jest.advanceTimersByTime(900);
    const state = getState();
    expect(state.phase).toBe("TRICK_PLAY");
    // The seat that chose trump also leads the first trick.
    expect(state.turnSeat).toBe("player");
  });

  test("enters TRICK_PLAY with the seat left of the dealer leading, which is now the player", () => {
    startNewMatch();
    jest.advanceTimersByTime(600); // deal
    selectTrump("Spades");
    jest.advanceTimersByTime(900); // trump reveal -> trick play begins

    const state = getState();
    expect(state.phase).toBe("TRICK_PLAY");
    expect(state.turnSeat).toBe("player");
    expect(state.legalMoves.sort()).toEqual(["9S", "KS", "JH", "9C", "KC", "JD"].sort());
  });

  test("computes follow-suit legal moves correctly on the player's second turn", () => {
    startNewMatch();
    jest.advanceTimersByTime(600); // deal
    selectTrump("Spades");
    jest.advanceTimersByTime(900); // trick play begins, player leads

    // 304's rank order is non-standard: J > 9 > A > 10 > K > Q. Player leads 9S; opponentLeft 10S;
    // partner's JS wins (J is the highest rank in the game); opponentRight QS.
    playCard("9S");
    jest.advanceTimersByTime(500); // opponentLeft plays 10S
    jest.advanceTimersByTime(500); // partner plays JS, winning trick 1
    jest.advanceTimersByTime(500); // opponentRight plays QS
    jest.advanceTimersByTime(900); // trick clears, partner leads trick 2

    jest.advanceTimersByTime(500); // partner leads KH
    jest.advanceTimersByTime(500); // opponentRight plays 10H

    const state = getState();
    expect(state.turnSeat).toBe("player");
    expect(state.currentTrick).toHaveLength(2);
    expect(state.currentTrick[0].card.suit).toBe("Hearts");
    // Player's only remaining Hearts card is JH; must follow suit.
    expect(state.legalMoves).toEqual(["JH"]);
  });

  test("updates the in-progress hand's captured points live after each trick, before the hand ends", () => {
    startNewMatch();
    jest.advanceTimersByTime(600);
    selectTrump("Spades");
    jest.advanceTimersByTime(900);

    // 304's rank order is non-standard: J > 9 > A > 10 > K > Q, so partner's JS (not the highest
    // point-value card) wins this trick: 9S+10S+JS+QS = 20+10+30+2 = 62 pts, captured by playerTeam
    // (partner is on the player's team).
    playCard("9S");
    jest.advanceTimersByTime(500); // opponentLeft plays 10S
    jest.advanceTimersByTime(500); // partner plays JS, winning trick 1
    jest.advanceTimersByTime(500); // opponentRight plays QS

    // The trick has resolved but its 900ms "clear" delay hasn't fired yet, and the hand is
    // nowhere near its 6th (final) trick — cumulative must stay untouched, but the live
    // per-hand score must already reflect the captured trick's points.
    const state = getState();
    expect(state.scores.playerTeam.hand).toBe(62);
    expect(state.scores.opponentTeam.hand).toBe(0);
    expect(state.scores.playerTeam.cumulative).toBe(0);
    expect(state.scores.opponentTeam.cumulative).toBe(0);
  });

  test("the winner of the previous hand's last trick leads the new hand, not simply the new dealer's left", () => {
    startNewMatch();
    jest.advanceTimersByTime(600);
    selectTrump("Spades");
    jest.advanceTimersByTime(900);

    // Trick 1: player leads 9S; opponentLeft 10S; partner JS (304's highest rank) wins; opponentRight QS.
    playCard("9S");
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(900); // trick clears, partner leads trick 2

    // Trick 2: partner leads KH; opponentRight 10H; player (forced, only Heart) JH wins; opponentLeft QH.
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    playCard("JH");
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(900); // trick clears, player leads trick 3

    // Trick 3: player leads KS; opponentLeft (forced, only Spade left) AS wins; partner KD;
    // opponentRight QC.
    playCard("KS");
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(900); // trick clears, opponentLeft leads trick 4

    // Trick 4: opponentLeft leads QD; partner 9D; opponentRight 10D; player (forced, only
    // remaining Diamond) JD wins (J is 304's highest rank).
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    playCard("JD");
    jest.advanceTimersByTime(900); // trick clears, player leads trick 5

    // Trick 5: player leads 9C; opponentLeft 10C; partner (forced, only Club) JC wins;
    // opponentRight (can't follow) AH.
    playCard("9C");
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(900); // trick clears, partner leads trick 6 (final)

    // Trick 6 (final): partner leads its last card, 9H (forced); opponentRight (can't follow) AD;
    // player (forced, last card) KC; opponentLeft (can't follow) AC. 9H is the only Heart played,
    // so partner wins the hand's last trick.
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    const finalTrickResult = playCard("KC");
    jest.advanceTimersByTime(500);

    // The hand's last trick is resolved synchronously the instant the 4th card is played.
    expect(finalTrickResult.ok).toBe(true);
    expect(getState().lastTrickWinner).toBe("partner");

    jest.advanceTimersByTime(900); // trick clears; 6th trick played -> scoreHandAndContinue runs
    const afterHand1 = getState();
    expect(afterHand1.scores.playerTeam.cumulative).toBe(285);
    expect(afterHand1.scores.opponentTeam.cumulative).toBe(19);
    expect(afterHand1.handsWon).toEqual({ playerTeam: 1, opponentTeam: 0 });

    jest.advanceTimersByTime(1200); // dealer rotates, hand 2 begins dealing
    expect(getState().dealerSeat).toBe("player"); // rotated from opponentRight

    jest.advanceTimersByTime(600); // hand 2 deals, enters TRUMP_SELECTION
    expect(getState().turnSeat).toBe("partner"); // hand 2's leader: winner of hand 1's last trick
    jest.advanceTimersByTime(500); // partner (AI) picks trump
    jest.advanceTimersByTime(900); // trump reveal delay, hand 2 enters TRICK_PLAY

    // Hand 2's leader must be partner (winner of hand 1's last trick) — NOT opponentLeft, which is
    // what nextSeat(new dealer="player") (the old FR-8-only rule) would have produced.
    const hand2State = getState();
    expect(hand2State.phase).toBe("TRICK_PLAY");
    expect(hand2State.turnSeat).toBe("partner");
  });

  test("clears the live per-hand score once the match ends, since no hand is in progress", () => {
    startNewMatch();
    jest.advanceTimersByTime(600);
    selectTrump("Spades");
    jest.advanceTimersByTime(900);

    // Hand 1 (same deterministic sequence as the leader test above): playerTeam wins it 285-19.
    playCard("9S");
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(900);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    playCard("JH");
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(900);
    playCard("KS");
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(900);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    playCard("JD");
    jest.advanceTimersByTime(900);
    playCard("9C");
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(900);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    playCard("KC");
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(900); // hand 1 scored: playerTeam 285, opponentTeam 19
    jest.advanceTimersByTime(1200); // dealer rotates, hand 2 begins dealing
    jest.advanceTimersByTime(600); // hand 2 deals, enters TRUMP_SELECTION
    jest.advanceTimersByTime(500); // partner (AI) picks trump
    jest.advanceTimersByTime(900); // trump reveal delay, hand 2 enters TRICK_PLAY, partner leads

    // Hand 2: partner leads QH; opponentRight KH; player (forced) 10H wins; opponentLeft JH.
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    playCard("10H");
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(900); // trick clears, opponentLeft leads trick 2

    // Trick 2: opponentLeft leads KC; partner 10C; opponentRight JC; player (forced) QC wins.
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    playCard("QC");
    jest.advanceTimersByTime(900); // trick clears, opponentRight leads trick 3

    // Trick 3: opponentRight leads KD; player (forced) 10D; opponentLeft JD; partner QD wins.
    jest.advanceTimersByTime(500);
    playCard("10D");
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(900); // trick clears, opponentLeft leads trick 4

    // Trick 4: opponentLeft leads 9C; partner AC; opponentRight 9H; player (forced) QS wins.
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    playCard("QS");
    jest.advanceTimersByTime(900); // trick clears, player leads trick 5

    // Trick 5: player leads AH; opponentLeft KS; partner 10S; opponentRight JS wins.
    playCard("AH");
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(900); // trick clears, opponentRight leads trick 6 (final)

    // Trick 6 (final): opponentRight leads 9D; player (forced) AD; opponentLeft (forced) 9S;
    // partner (forced) AS wins the hand — and the match, since playerTeam's cumulative crosses 304.
    jest.advanceTimersByTime(500);
    playCard("AD");
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(900); // hand 2 scored: playerTeam 53, opponentTeam 251

    const beforeMatchEnd = getState();
    expect(beforeMatchEnd.scores.playerTeam.cumulative).toBe(338);
    expect(beforeMatchEnd.scores.opponentTeam.cumulative).toBe(270);
    // Right before the match-end check, the live per-hand score still holds hand 2's own points.
    expect(beforeMatchEnd.scores.playerTeam.hand).toBe(53);

    jest.advanceTimersByTime(1200); // match-end check fires: playerTeam >= 304

    const afterMatchEnd = getState();
    expect(afterMatchEnd.phase).toBe("MATCH_END");
    expect(afterMatchEnd.matchWinner).toBe("playerTeam");
    // Cumulative (the real final score) is untouched, but the live per-hand score is cleared —
    // no hand is in progress once the match is over.
    expect(afterMatchEnd.scores.playerTeam.cumulative).toBe(338);
    expect(afterMatchEnd.scores.playerTeam.hand).toBe(0);
    expect(afterMatchEnd.scores.opponentTeam.hand).toBe(0);
  });

  test("rejects a card that does not follow suit even if it's in the player's hand", () => {
    startNewMatch();
    jest.advanceTimersByTime(600);
    selectTrump("Spades");
    jest.advanceTimersByTime(900);
    playCard("9S");
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(900);
    jest.advanceTimersByTime(500); // partner leads trick 2 with KH
    jest.advanceTimersByTime(500); // opponentRight plays 10H

    const result = playCard("KS"); // player holds KS, but must follow Hearts with JH
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/legal move/i);
    }
  });

  test("rejects a play attempt when it is not the player's turn", () => {
    startNewMatch();
    jest.advanceTimersByTime(600);
    selectTrump("Spades");
    jest.advanceTimersByTime(900);
    playCard("9S"); // player leads trick 1
    // it is now opponentLeft's turn, not player's

    const result = playCard("KS");
    expect(result.ok).toBe(false);
  });

  test("accepts a legal card and removes it from the player's hand", () => {
    startNewMatch();
    jest.advanceTimersByTime(600);
    selectTrump("Spades");
    jest.advanceTimersByTime(900);
    playCard("9S");
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(900);
    jest.advanceTimersByTime(500); // partner leads trick 2 with KH
    jest.advanceTimersByTime(500); // opponentRight plays 10H

    const result = playCard("JH");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.playerHand.find((c) => c.id === "JH")).toBeUndefined();
      expect(result.state.currentTrick.some((t) => t.card.id === "JH")).toBe(true);
    }
  });
});

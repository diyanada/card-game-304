import { GameSession } from "./gameSession";

jest.mock("../engine/deck", () => {
  const actual = jest.requireActual("../engine/deck");
  return { ...actual, shuffle: (arr: unknown[]) => arr };
});

describe("GameSession", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test("starts a match in DEALING phase with no player hand yet", () => {
    const session = new GameSession();
    session.startNewMatch();

    expect(session.getPhase()).toBe("DEALING");
    expect(session.getHands().player).toHaveLength(0);
    expect(session.getScores().playerTeam.cumulative).toBe(0);
    expect(session.getHandsWon()).toEqual({ playerTeam: 0, opponentTeam: 0 });
  });

  test("deals 6 cards and enters TRUMP_SELECTION with the hand's leader waiting to choose", () => {
    const session = new GameSession();
    session.startNewMatch();
    jest.advanceTimersByTime(600);

    expect(session.getPhase()).toBe("TRUMP_SELECTION");
    expect(session.getTrumpSuit()).toBeNull();
    expect(session.getHands().player).toHaveLength(6);
    // Hand 1's leader is the player (dealer=opponentRight -> seat to their left leads, FR-8).
    expect(session.getTurnSeat()).toBe("player");
  });

  test("rejects trump selection when it is not the player's turn to choose", () => {
    const session = new GameSession();
    session.startNewMatch();
    // Still DEALING — no seat has been asked to choose trump yet.
    expect(() => session.selectTrump("Spades")).toThrow(/not your turn/i);
  });

  test("accepts the player's trump choice and reveals it before trick play begins", () => {
    const session = new GameSession();
    session.startNewMatch();
    jest.advanceTimersByTime(600);

    session.selectTrump("Spades");
    expect(session.getPhase()).toBe("TRUMP_REVEAL");
    expect(session.getTrumpSuit()).toBe("Spades");

    jest.advanceTimersByTime(900);
    expect(session.getPhase()).toBe("TRICK_PLAY");
    // The seat that chose trump also leads the first trick.
    expect(session.getTurnSeat()).toBe("player");
  });

  test("enters TRICK_PLAY with the seat left of the dealer leading, which is now the player", () => {
    const session = new GameSession();
    session.startNewMatch();
    jest.advanceTimersByTime(600);
    session.selectTrump("Spades");
    jest.advanceTimersByTime(900);

    expect(session.getPhase()).toBe("TRICK_PLAY");
    expect(session.getTurnSeat()).toBe("player");
    expect(session.getLegalMovesForPlayer().map((c) => c.id).sort()).toEqual(
      ["9S", "KS", "JH", "9C", "KC", "JD"].sort()
    );
  });

  test("rejects a player move when it is not the player's turn", () => {
    const session = new GameSession();
    session.startNewMatch();
    jest.advanceTimersByTime(600);
    session.selectTrump("Spades");
    jest.advanceTimersByTime(900);

    session.applyPlayerMove("JD"); // player leads the first trick
    // it is now opponentLeft's turn
    expect(() => session.applyPlayerMove("9S")).toThrow(/not your turn/i);
  });

  test("computes legal moves and accepts a legal play once it is the player's turn", () => {
    const session = new GameSession();
    session.startNewMatch();
    jest.advanceTimersByTime(600);
    session.selectTrump("Spades");
    jest.advanceTimersByTime(900);

    // 304's rank order is non-standard: J > 9 > A > 10 > K > Q. Player leads 9S; opponentLeft 10S;
    // partner's JS wins (J is the highest rank in the game); opponentRight QS.
    session.applyPlayerMove("9S");
    jest.advanceTimersByTime(500); // opponentLeft plays 10S
    jest.advanceTimersByTime(500); // partner plays JS, winning trick 1
    jest.advanceTimersByTime(500); // opponentRight plays QS
    jest.advanceTimersByTime(900); // trick clears, partner leads trick 2

    jest.advanceTimersByTime(500); // partner leads KH
    jest.advanceTimersByTime(500); // opponentRight plays 10H

    expect(session.getTurnSeat()).toBe("player");
    // Player's only remaining Hearts card is JH, so it must follow suit with it.
    expect(session.getLegalMovesForPlayer().map((c) => c.id)).toEqual(["JH"]);

    session.applyPlayerMove("JH");
    expect(session.getHands().player.find((c) => c.id === "JH")).toBeUndefined();
    expect(session.getCurrentTrick().some((t) => t.card.id === "JH")).toBe(true);
  });

  test("updates the in-progress hand's captured points live after each trick, before the hand ends", () => {
    const session = new GameSession();
    session.startNewMatch();
    jest.advanceTimersByTime(600);
    session.selectTrump("Spades");
    jest.advanceTimersByTime(900);

    // 304's rank order is non-standard: J > 9 > A > 10 > K > Q, so partner's JS (not the highest
    // point-value card) wins this trick: 9S+10S+JS+QS = 20+10+30+2 = 62 pts, captured by playerTeam
    // (partner is on the player's team).
    session.applyPlayerMove("9S");
    jest.advanceTimersByTime(500); // opponentLeft plays 10S
    jest.advanceTimersByTime(500); // partner plays JS, winning trick 1
    jest.advanceTimersByTime(500); // opponentRight plays QS

    // The trick has resolved but its 900ms "clear" delay hasn't fired yet, and the hand is
    // nowhere near its 6th (final) trick — cumulative must stay untouched, but the live
    // per-hand score must already reflect the captured trick's points.
    expect(session.getScores().playerTeam.hand).toBe(62);
    expect(session.getScores().opponentTeam.hand).toBe(0);
    expect(session.getScores().playerTeam.cumulative).toBe(0);
    expect(session.getScores().opponentTeam.cumulative).toBe(0);
  });

  test("rejects an illegal card even when it is the player's turn", () => {
    const session = new GameSession();
    session.startNewMatch();
    jest.advanceTimersByTime(600);
    session.selectTrump("Spades");
    jest.advanceTimersByTime(900);

    session.applyPlayerMove("9S");
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(900);
    jest.advanceTimersByTime(500); // partner leads trick 2 with KH
    jest.advanceTimersByTime(500); // opponentRight plays 10H

    // Player holds JH (Hearts) and must follow suit; KS is a legal card in hand but the wrong suit.
    expect(() => session.applyPlayerMove("KS")).toThrow(/not a legal move/i);
  });

  test("the winner of the previous hand's last trick leads the new hand, not simply the new dealer's left", () => {
    const session = new GameSession();
    session.startNewMatch();
    jest.advanceTimersByTime(600);
    session.selectTrump("Spades");
    jest.advanceTimersByTime(900);

    // Trick 1: player leads 9S; opponentLeft 10S; partner JS (304's highest rank) wins; opponentRight QS.
    session.applyPlayerMove("9S");
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(900); // trick clears, partner leads trick 2

    // Trick 2: partner leads KH; opponentRight 10H; player (forced, only Heart) JH wins; opponentLeft QH.
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    session.applyPlayerMove("JH");
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(900); // trick clears, player leads trick 3

    // Trick 3: player leads KS; opponentLeft (forced, only Spade left) AS wins; partner KD;
    // opponentRight QC.
    session.applyPlayerMove("KS");
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(900); // trick clears, opponentLeft leads trick 4

    // Trick 4: opponentLeft leads QD; partner 9D; opponentRight 10D; player (forced, only
    // remaining Diamond) JD wins (J is 304's highest rank).
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    session.applyPlayerMove("JD");
    jest.advanceTimersByTime(900); // trick clears, player leads trick 5

    // Trick 5: player leads 9C; opponentLeft 10C; partner (forced, only Club) JC wins;
    // opponentRight (can't follow) AH.
    session.applyPlayerMove("9C");
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(900); // trick clears, partner leads trick 6 (final)

    // Trick 6 (final): partner leads its last card, 9H (forced); opponentRight (can't follow) AD;
    // player (forced, last card) KC; opponentLeft (can't follow) AC. 9H is the only Heart played,
    // so partner wins the hand's last trick.
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    session.applyPlayerMove("KC");
    jest.advanceTimersByTime(500);

    // The hand's last trick is resolved synchronously the instant the 4th card is played.
    expect(session.getLastTrickWinner()).toBe("partner");

    jest.advanceTimersByTime(900); // trick clears; 6th trick played -> scoreHandAndContinue runs
    expect(session.getScores().playerTeam.cumulative).toBe(285);
    expect(session.getScores().opponentTeam.cumulative).toBe(19);
    expect(session.getHandsWon()).toEqual({ playerTeam: 1, opponentTeam: 0 });

    jest.advanceTimersByTime(1200); // dealer rotates, hand 2 begins dealing
    expect(session.getDealerSeat()).toBe("player"); // rotated from opponentRight

    jest.advanceTimersByTime(600); // hand 2 deals, enters TRUMP_SELECTION
    expect(session.getTurnSeat()).toBe("partner"); // hand 2's leader: winner of hand 1's last trick
    jest.advanceTimersByTime(500); // partner (AI) picks trump
    jest.advanceTimersByTime(900); // trump reveal delay, hand 2 enters TRICK_PLAY

    // Hand 2's leader must be partner (winner of hand 1's last trick) — NOT opponentLeft, which is
    // what nextSeat(new dealer="player") (the old FR-8-only rule) would have produced.
    expect(session.getPhase()).toBe("TRICK_PLAY");
    expect(session.getTurnSeat()).toBe("partner");
  });

  test("clears the live per-hand score once the match ends, since no hand is in progress", () => {
    const session = new GameSession();
    session.startNewMatch();
    jest.advanceTimersByTime(600);
    session.selectTrump("Spades");
    jest.advanceTimersByTime(900);

    // Hand 1 (same deterministic sequence as the leader test above): playerTeam wins it 285-19.
    session.applyPlayerMove("9S");
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(900);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    session.applyPlayerMove("JH");
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(900);
    session.applyPlayerMove("KS");
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(900);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    session.applyPlayerMove("JD");
    jest.advanceTimersByTime(900);
    session.applyPlayerMove("9C");
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(900);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    session.applyPlayerMove("KC");
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(900); // hand 1 scored: playerTeam 285, opponentTeam 19
    jest.advanceTimersByTime(1200); // dealer rotates, hand 2 begins dealing
    jest.advanceTimersByTime(600); // hand 2 deals, enters TRUMP_SELECTION
    jest.advanceTimersByTime(500); // partner (AI) picks trump
    jest.advanceTimersByTime(900); // trump reveal delay, hand 2 enters TRICK_PLAY, partner leads

    // Hand 2: partner leads QH; opponentRight KH; player (forced) 10H wins; opponentLeft JH.
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    session.applyPlayerMove("10H");
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(900); // trick clears, opponentLeft leads trick 2

    // Trick 2: opponentLeft leads KC; partner 10C; opponentRight JC; player (forced) QC wins.
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    session.applyPlayerMove("QC");
    jest.advanceTimersByTime(900); // trick clears, opponentRight leads trick 3

    // Trick 3: opponentRight leads KD; player (forced) 10D; opponentLeft JD; partner QD wins.
    jest.advanceTimersByTime(500);
    session.applyPlayerMove("10D");
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(900); // trick clears, opponentLeft leads trick 4

    // Trick 4: opponentLeft leads 9C; partner AC; opponentRight 9H; player (forced) QS wins.
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    session.applyPlayerMove("QS");
    jest.advanceTimersByTime(900); // trick clears, player leads trick 5

    // Trick 5: player leads AH; opponentLeft KS; partner 10S; opponentRight JS wins.
    session.applyPlayerMove("AH");
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(900); // trick clears, opponentRight leads trick 6 (final)

    // Trick 6 (final): opponentRight leads 9D; player (forced) AD; opponentLeft (forced) 9S;
    // partner (forced) AS wins the hand — and the match, since playerTeam's cumulative crosses 304.
    jest.advanceTimersByTime(500);
    session.applyPlayerMove("AD");
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(500);
    jest.advanceTimersByTime(900); // hand 2 scored: playerTeam 53, opponentTeam 251

    expect(session.getScores().playerTeam.cumulative).toBe(338);
    expect(session.getScores().opponentTeam.cumulative).toBe(270);
    // Right before the match-end check, the live per-hand score still holds hand 2's own points.
    expect(session.getScores().playerTeam.hand).toBe(53);

    jest.advanceTimersByTime(1200); // match-end check fires: playerTeam >= 304

    expect(session.getPhase()).toBe("MATCH_END");
    expect(session.getMatchWinner()).toBe("playerTeam");
    // Cumulative (the real final score) is untouched, but the live per-hand score is cleared —
    // no hand is in progress once the match is over.
    expect(session.getScores().playerTeam.cumulative).toBe(338);
    expect(session.getScores().playerTeam.hand).toBe(0);
    expect(session.getScores().opponentTeam.hand).toBe(0);
  });

  test("startNewMatch cancels any pending scheduled work from a prior match", () => {
    const session = new GameSession();
    session.startNewMatch();
    jest.advanceTimersByTime(600); // mid-deal timers scheduled

    session.startNewMatch(); // reset before the previous deal's timers would have fired
    expect(session.getPhase()).toBe("DEALING");
    expect(session.getHands().player).toHaveLength(0);

    // Advancing time should only progress the NEW match's timeline, not double-apply stale ones.
    jest.advanceTimersByTime(600);
    expect(session.getPhase()).toBe("TRUMP_SELECTION");
    expect(session.getHands().player).toHaveLength(6);
  });
});

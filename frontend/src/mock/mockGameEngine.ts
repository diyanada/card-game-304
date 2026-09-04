// TEMPORARY mock backend — re-implements the rules documented for the Backend unit's
// GameEngine/GameStateMachine/DeckFactory (application-design/component-methods.md) so the
// Frontend unit can be built and played through a full real match before the Backend unit exists.
// Per functional-design/business-logic-model.md (Question 1:A): this module is discarded/bypassed
// once GameClientService is wired to the real Backend API. It is not part of the unit's hardened,
// reused business logic — only its output SHAPE (GameStateDTO) is a permanent contract.

import { buildDeck, rankIndex, shuffle } from "./deck";
import {
  ALL_SUITS,
  Card,
  CARD_POINTS,
  CARDS_PER_PLAYER,
  GamePhase,
  GameScores,
  GameStateDTO,
  HandTally,
  Seat,
  Suit,
  Team,
  MATCH_TARGET_SCORE,
  nextSeat,
  teamForSeat,
} from "../types/game";

interface TrickEntry {
  seat: Seat;
  card: Card;
}

const AI_SEATS: Seat[] = ["partner", "opponentLeft", "opponentRight"];

let hands: Record<Seat, Card[]> = {
  player: [],
  partner: [],
  opponentLeft: [],
  opponentRight: [],
};
let dealerSeat: Seat = "player";
let turnSeat: Seat = "player";
let trumpSuit: Suit | null = null;
let currentTrick: TrickEntry[] = [];
let phase: GamePhase = "DEALING";
let scores: GameScores = {
  playerTeam: { hand: 0, cumulative: 0 },
  opponentTeam: { hand: 0, cumulative: 0 },
};
let lastTrickWinner: Seat | null = null;
let matchWinner: Team | null = null;
let handTricksWon: Record<Team, Card[]> = { playerTeam: [], opponentTeam: [] };
let tricksPlayedThisHand = 0;
let handsWon: HandTally = { playerTeam: 0, opponentTeam: 0 };
let pendingTimeouts: ReturnType<typeof setTimeout>[] = [];

function clearPendingTimeouts() {
  pendingTimeouts.forEach((t) => clearTimeout(t));
  pendingTimeouts = [];
}

function schedule(fn: () => void, delayMs: number) {
  const handle = setTimeout(fn, delayMs);
  pendingTimeouts.push(handle);
  return handle;
}

function randomAiDelay(): number {
  // NFR-2: AI turns paced ~0.5-1.5s
  return 500 + Math.random() * 1000;
}

export function getLegalMoves(seat: Seat): Card[] {
  const hand = hands[seat];
  if (currentTrick.length === 0) {
    return hand; // leading the trick: any card is legal
  }
  const ledSuit = currentTrick[0].card.suit;
  const followSuitCards = hand.filter((c) => c.suit === ledSuit);
  return followSuitCards.length > 0 ? followSuitCards : hand;
}

function currentTrickWinnerSoFar(): { seat: Seat; card: Card } | null {
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

function selectAiMove(seat: Seat): Card {
  const legal = getLegalMoves(seat);
  const ledSuit = currentTrick.length > 0 ? currentTrick[0].card.suit : null;

  const byLowest = (cards: Card[]) =>
    [...cards].sort((a, b) => rankIndex(a.rank) - rankIndex(b.rank))[0];

  if (!ledSuit) {
    // Leading: prefer lowest non-trump card, else lowest trump.
    const nonTrump = legal.filter((c) => c.suit !== trumpSuit);
    return nonTrump.length > 0 ? byLowest(nonTrump) : byLowest(legal);
  }

  const followingSuit = legal.some((c) => c.suit === ledSuit);
  const winnerSoFar = currentTrickWinnerSoFar();
  const teamAlreadyWinning = winnerSoFar ? teamForSeat(winnerSoFar.seat) === teamForSeat(seat) : false;

  if (followingSuit) {
    const suitCards = legal.filter((c) => c.suit === ledSuit);
    if (teamAlreadyWinning) {
      return byLowest(suitCards);
    }
    // Try to win with the lowest card that beats the current best (only meaningful if no trump in play yet,
    // since if trump has already been played this seat must follow suit and cannot out-trump by suit alone).
    if (winnerSoFar && winnerSoFar.card.suit === ledSuit) {
      const winning = suitCards
        .filter((c) => rankIndex(c.rank) > rankIndex(winnerSoFar.card.rank))
        .sort((a, b) => rankIndex(a.rank) - rankIndex(b.rank));
      if (winning.length > 0) return winning[0];
    }
    return byLowest(suitCards);
  }

  // Cannot follow suit: may play trump or discard.
  const trumpCards = legal.filter((c) => c.suit === trumpSuit);
  if (!teamAlreadyWinning && trumpCards.length > 0) {
    if (winnerSoFar && winnerSoFar.card.suit === trumpSuit) {
      const winningTrumps = trumpCards
        .filter((c) => rankIndex(c.rank) > rankIndex(winnerSoFar.card.rank))
        .sort((a, b) => rankIndex(a.rank) - rankIndex(b.rank));
      if (winningTrumps.length > 0) return winningTrumps[0];
      // Can't beat the trump already played; don't waste a trump, discard instead if possible.
      const nonTrump = legal.filter((c) => c.suit !== trumpSuit);
      return nonTrump.length > 0 ? byLowest(nonTrump) : byLowest(trumpCards);
    }
    // No trump played yet and team not winning: trump in with the lowest trump.
    return byLowest(trumpCards);
  }

  const nonTrump = legal.filter((c) => c.suit !== trumpSuit);
  return nonTrump.length > 0 ? byLowest(nonTrump) : byLowest(legal);
}

// AI trump choice (2026-09-03 addition), per the user's chosen rule: pick the suit the AI holds
// the most cards of, breaking ties by whichever tied suit has the higher total point value in
// hand. Deterministic and rule-based, consistent with the rest of the AI (FR-19).
function selectAiTrump(hand: Card[]): Suit {
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

// 2026-09-03 addition: which team won a single hand, for the running hands-won/hands-lost tally.
// An exact point tie for the hand is a push and counts for neither team (user decision).
export function determineHandWinner(handPoints: { playerTeam: number; opponentTeam: number }): Team | null {
  if (handPoints.playerTeam > handPoints.opponentTeam) return "playerTeam";
  if (handPoints.opponentTeam > handPoints.playerTeam) return "opponentTeam";
  return null;
}

function resolveTrick(): Seat {
  const winner = currentTrickWinnerSoFar();
  return winner!.seat;
}

function beginNewHand() {
  clearPendingTimeouts();
  // 2026-09-03 change request: the winner of the previous hand's last trick leads the new hand;
  // only the match's very first hand (no previous winner) falls back to dealer's-left-leads (FR-8).
  const previousHandLeader = lastTrickWinner;
  currentTrick = [];
  handTricksWon = { playerTeam: [], opponentTeam: [] };
  tricksPlayedThisHand = 0;
  lastTrickWinner = null;
  trumpSuit = null;
  hands = { player: [], partner: [], opponentLeft: [], opponentRight: [] };
  scores.playerTeam.hand = 0;
  scores.opponentTeam.hand = 0;
  phase = "DEALING";

  schedule(() => {
    const deck = shuffle(buildDeck());
    const seatOrder: Seat[] = [];
    let s = nextSeat(dealerSeat);
    for (let i = 0; i < 4; i++) {
      seatOrder.push(s);
      s = nextSeat(s);
    }
    // Deal CARDS_PER_PLAYER cards to each seat round-robin.
    let cardIndex = 0;
    for (let round = 0; round < CARDS_PER_PLAYER; round++) {
      for (const seat of seatOrder) {
        hands[seat].push(deck[cardIndex]);
        cardIndex++;
      }
    }
    phase = "TRUMP_SELECTION";
    // 2026-09-03 change request: the seat leading the hand (see FR-8 above) picks trump by
    // looking at their own hand, instead of an automatic random cut.
    turnSeat = previousHandLeader ?? nextSeat(dealerSeat);
    runAiTrumpSelectionIfNeeded();
  }, 600);
}

function runAiTrumpSelectionIfNeeded() {
  if (phase !== "TRUMP_SELECTION") return;
  if (!AI_SEATS.includes(turnSeat)) return;
  const seat = turnSeat;
  schedule(() => {
    if (phase !== "TRUMP_SELECTION" || turnSeat !== seat) return;
    applyTrumpSelection(selectAiTrump(hands[seat]));
  }, randomAiDelay());
}

function applyTrumpSelection(suit: Suit) {
  trumpSuit = suit;
  phase = "TRUMP_REVEAL";

  schedule(() => {
    phase = "TRICK_PLAY";
    // turnSeat is unchanged: the same seat that just chose trump also leads the first trick.
    runAiTurnLoopIfNeeded();
  }, 900);
}

export function selectTrump(suit: Suit): { ok: true; state: GameStateDTO } | { ok: false; error: string } {
  if (phase !== "TRUMP_SELECTION" || turnSeat !== "player") {
    return { ok: false, error: "It is not your turn to select trump." };
  }
  applyTrumpSelection(suit);
  return { ok: true, state: getState() };
}

function scoreHandAndContinue() {
  phase = "HAND_SCORING";
  const playerPoints = handTricksWon.playerTeam.reduce((sum, c) => sum + CARD_POINTS[c.rank], 0);
  const opponentPoints = handTricksWon.opponentTeam.reduce((sum, c) => sum + CARD_POINTS[c.rank], 0);
  scores.playerTeam.hand = playerPoints;
  scores.opponentTeam.hand = opponentPoints;
  scores.playerTeam.cumulative += playerPoints;
  scores.opponentTeam.cumulative += opponentPoints;

  const handWinner = determineHandWinner({ playerTeam: playerPoints, opponentTeam: opponentPoints });
  if (handWinner) {
    handsWon[handWinner] += 1;
  }

  schedule(() => {
    if (scores.playerTeam.cumulative >= MATCH_TARGET_SCORE || scores.opponentTeam.cumulative >= MATCH_TARGET_SCORE) {
      matchWinner = scores.playerTeam.cumulative > scores.opponentTeam.cumulative ? "playerTeam" : "opponentTeam";
      // No hand is in progress once the match is over; clear the live per-hand score so it
      // doesn't linger as leftover state (2026-09-03 change request: score resets after the game).
      scores.playerTeam.hand = 0;
      scores.opponentTeam.hand = 0;
      phase = "MATCH_END";
      return;
    }
    dealerSeat = nextSeat(dealerSeat); // rotate dealer (FR-7)
    beginNewHand();
  }, 1200);
}

function applyCardPlay(seat: Seat, card: Card) {
  hands[seat] = hands[seat].filter((c) => c.id !== card.id);
  currentTrick.push({ seat, card });

  if (currentTrick.length === 4) {
    const winnerSeat = resolveTrick();
    const winningTeam = teamForSeat(winnerSeat);
    handTricksWon[winningTeam].push(...currentTrick.map((t) => t.card));
    lastTrickWinner = winnerSeat;
    tricksPlayedThisHand += 1;

    // Live running points for the hand in progress, so the score reflects each captured trick
    // immediately rather than only once at the hand's end (2026-09-03 change request).
    scores.playerTeam.hand = handTricksWon.playerTeam.reduce((sum, c) => sum + CARD_POINTS[c.rank], 0);
    scores.opponentTeam.hand = handTricksWon.opponentTeam.reduce((sum, c) => sum + CARD_POINTS[c.rank], 0);

    schedule(() => {
      currentTrick = [];
      if (tricksPlayedThisHand === CARDS_PER_PLAYER) {
        scoreHandAndContinue();
      } else {
        turnSeat = winnerSeat;
        runAiTurnLoopIfNeeded();
      }
    }, 900);
  } else {
    turnSeat = nextSeat(turnSeat);
    runAiTurnLoopIfNeeded();
  }
}

function runAiTurnLoopIfNeeded() {
  if (phase !== "TRICK_PLAY") return;
  if (!AI_SEATS.includes(turnSeat)) return;
  const seat = turnSeat;
  schedule(() => {
    if (phase !== "TRICK_PLAY" || turnSeat !== seat) return;
    const card = selectAiMove(seat);
    applyCardPlay(seat, card);
  }, randomAiDelay());
}

export function startNewMatch(): GameStateDTO {
  clearPendingTimeouts();
  // Right-side opponent deals first (2026-09-03 change request), so the seat to their left —
  // the player — always leads the first trick of the match (FR-8).
  dealerSeat = "opponentRight";
  scores = {
    playerTeam: { hand: 0, cumulative: 0 },
    opponentTeam: { hand: 0, cumulative: 0 },
  };
  handsWon = { playerTeam: 0, opponentTeam: 0 };
  matchWinner = null;
  // No previous hand exists yet, so beginNewHand() must fall back to dealer's-left-leads (FR-8)
  // rather than carry over a stale winner from a prior match.
  lastTrickWinner = null;
  beginNewHand();
  return getState();
}

export function getState(): GameStateDTO {
  return {
    phase,
    trumpSuit,
    dealerSeat,
    turnSeat,
    playerHand: [...hands.player],
    opponentCardCounts: {
      partner: hands.partner.length,
      opponentLeft: hands.opponentLeft.length,
      opponentRight: hands.opponentRight.length,
    },
    currentTrick: currentTrick.map((t) => ({ seat: t.seat, card: t.card })),
    legalMoves:
      phase === "TRICK_PLAY" && turnSeat === "player"
        ? getLegalMoves("player").map((c) => c.id)
        : [],
    scores,
    handsWon,
    lastTrickWinner,
    matchWinner,
  };
}

export function playCard(cardId: string): { ok: true; state: GameStateDTO } | { ok: false; error: string } {
  if (phase !== "TRICK_PLAY" || turnSeat !== "player") {
    return { ok: false, error: "It is not your turn to play." };
  }
  const legal = getLegalMoves("player");
  const card = legal.find((c) => c.id === cardId);
  if (!card) {
    return { ok: false, error: "That card is not a legal move right now." };
  }
  applyCardPlay("player", card);
  return { ok: true, state: getState() };
}

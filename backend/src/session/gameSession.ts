// The aggregate root for one browser session's in-progress match (Application Design: GameSession,
// per Question 2:B — one instance per session, not a global singleton). Orchestrates GameStateMachine
// + GameEngine + TurnScheduler. This is the server-side, multi-instance-safe counterpart of the
// Frontend unit's temporary frontend/src/mock/mockGameEngine.ts (which used module-singleton state
// because only one browser session needed it) — same rules, same staged timing, now one instance per
// session.

import { GameStateMachine } from "../engine/gameStateMachine";
import { TurnScheduler, randomAiTurnDelayMs } from "../engine/turnScheduler";
import * as gameEngine from "../engine/gameEngine";
import { ClientError } from "../api/errors";
import {
  Card,
  CARDS_PER_PLAYER,
  GameScores,
  HandTally,
  Seat,
  Suit,
  Team,
  TrickCardEntry,
  nextSeat,
} from "../types/game";

const AI_SEATS: Seat[] = ["partner", "opponentLeft", "opponentRight"];
const DEAL_DELAY_MS = 600;
const TRUMP_REVEAL_DELAY_MS = 900;
const TRICK_CLEAR_DELAY_MS = 900;
const NEXT_HAND_DELAY_MS = 1200;

export class GameSession {
  private stateMachine = new GameStateMachine();
  private scheduler = new TurnScheduler();

  private hands: Record<Seat, Card[]> = { player: [], partner: [], opponentLeft: [], opponentRight: [] };
  private dealerSeat: Seat = "player";
  private turnSeat: Seat = "player";
  private trumpSuit: Suit | null = null;
  private currentTrick: TrickCardEntry[] = [];
  private scores: GameScores = {
    playerTeam: { hand: 0, cumulative: 0 },
    opponentTeam: { hand: 0, cumulative: 0 },
  };
  private lastTrickWinner: Seat | null = null;
  private matchWinner: Team | null = null;
  private handTricksWon: Record<Team, Card[]> = { playerTeam: [], opponentTeam: [] };
  private tricksPlayedThisHand = 0;
  private handsWon: HandTally = { playerTeam: 0, opponentTeam: 0 };

  startNewMatch(): void {
    this.scheduler.cancelPending();
    // Right-side opponent deals first (2026-09-03 change request), so the seat to their left —
    // the player — always leads the first trick of the match (FR-8).
    this.dealerSeat = "opponentRight";
    this.scores = {
      playerTeam: { hand: 0, cumulative: 0 },
      opponentTeam: { hand: 0, cumulative: 0 },
    };
    this.handsWon = { playerTeam: 0, opponentTeam: 0 };
    this.matchWinner = null;
    // No previous hand exists yet, so beginNewHand() must fall back to dealer's-left-leads (FR-8)
    // rather than carry over a stale winner from a prior match played on this same session.
    this.lastTrickWinner = null;
    this.stateMachine.reset();
    this.beginNewHand();
  }

  private beginNewHand(): void {
    this.scheduler.cancelPending();
    // 2026-09-03 change request: the winner of the previous hand's last trick leads the new hand;
    // only the match's very first hand (no previous winner) falls back to dealer's-left-leads (FR-8).
    const previousHandLeader = this.lastTrickWinner;
    this.currentTrick = [];
    this.handTricksWon = { playerTeam: [], opponentTeam: [] };
    this.tricksPlayedThisHand = 0;
    this.lastTrickWinner = null;
    this.trumpSuit = null;
    this.hands = { player: [], partner: [], opponentLeft: [], opponentRight: [] };
    this.scores.playerTeam.hand = 0;
    this.scores.opponentTeam.hand = 0;
    if (this.stateMachine.getPhase() !== "DEALING") {
      this.stateMachine.transition("DEALING");
    }

    this.scheduler.schedule(() => {
      this.hands = gameEngine.dealHand(this.dealerSeat);
      this.stateMachine.transition("TRUMP_SELECTION");
      // 2026-09-03 change request: the seat leading the hand (see FR-8 above) picks trump by
      // looking at their own hand, instead of an automatic random cut.
      this.turnSeat = previousHandLeader ?? nextSeat(this.dealerSeat);
      this.runAiTrumpSelectionIfNeeded();
    }, DEAL_DELAY_MS);
  }

  private runAiTrumpSelectionIfNeeded(): void {
    if (this.stateMachine.getPhase() !== "TRUMP_SELECTION") return;
    if (!AI_SEATS.includes(this.turnSeat)) return;
    const seat = this.turnSeat;
    this.scheduler.schedule(() => {
      if (this.stateMachine.getPhase() !== "TRUMP_SELECTION" || this.turnSeat !== seat) return;
      const suit = gameEngine.selectAiTrump(this.hands[seat]);
      this.applyTrumpSelection(suit);
    }, randomAiTurnDelayMs());
  }

  private applyTrumpSelection(suit: Suit): void {
    this.trumpSuit = suit;
    this.stateMachine.transition("TRUMP_REVEAL");

    this.scheduler.schedule(() => {
      this.stateMachine.transition("TRICK_PLAY");
      // turnSeat is unchanged: the same seat that just chose trump also leads the first trick.
      this.runAiTurnLoopIfNeeded();
    }, TRUMP_REVEAL_DELAY_MS);
  }

  selectTrump(suit: Suit): void {
    if (!this.stateMachine.isActionAllowed("SELECT_TRUMP") || this.turnSeat !== "player") {
      throw new ClientError("It is not your turn to select trump.");
    }
    this.applyTrumpSelection(suit);
  }

  private scoreHandAndContinue(): void {
    this.stateMachine.transition("HAND_SCORING");
    const delta = gameEngine.scoreHand(this.handTricksWon);
    this.scores.playerTeam.hand = delta.playerTeam;
    this.scores.opponentTeam.hand = delta.opponentTeam;
    this.scores.playerTeam.cumulative += delta.playerTeam;
    this.scores.opponentTeam.cumulative += delta.opponentTeam;

    const handWinner = gameEngine.determineHandWinner(delta);
    if (handWinner) {
      this.handsWon[handWinner] += 1;
    }

    this.scheduler.schedule(() => {
      const result = gameEngine.checkMatchEnd(this.scores);
      if (result.ended) {
        this.matchWinner = result.winner;
        // No hand is in progress once the match is over; clear the live per-hand score so it
        // doesn't linger as leftover state (2026-09-03 change request: score resets after the game).
        this.scores.playerTeam.hand = 0;
        this.scores.opponentTeam.hand = 0;
        this.stateMachine.transition("MATCH_END");
        return;
      }
      this.dealerSeat = gameEngine.rotateDealer(this.dealerSeat);
      this.beginNewHand();
    }, NEXT_HAND_DELAY_MS);
  }

  private applyCardPlay(seat: Seat, card: Card): void {
    this.hands[seat] = this.hands[seat].filter((c) => c.id !== card.id);
    this.currentTrick.push({ seat, card });

    if (this.currentTrick.length === 4) {
      const winnerSeat = gameEngine.resolveTrick(this.currentTrick, this.trumpSuit as Suit);
      const winningTeam: Team = winnerSeat === "player" || winnerSeat === "partner" ? "playerTeam" : "opponentTeam";
      this.handTricksWon[winningTeam].push(...this.currentTrick.map((t) => t.card));
      this.lastTrickWinner = winnerSeat;
      this.tricksPlayedThisHand += 1;

      // Live running points for the hand in progress, so the score reflects each captured trick
      // immediately rather than only once at the hand's end (2026-09-03 change request).
      const pointsSoFar = gameEngine.scoreHand(this.handTricksWon);
      this.scores.playerTeam.hand = pointsSoFar.playerTeam;
      this.scores.opponentTeam.hand = pointsSoFar.opponentTeam;

      this.scheduler.schedule(() => {
        this.currentTrick = [];
        if (this.tricksPlayedThisHand === CARDS_PER_PLAYER) {
          this.scoreHandAndContinue();
        } else {
          this.turnSeat = winnerSeat;
          this.runAiTurnLoopIfNeeded();
        }
      }, TRICK_CLEAR_DELAY_MS);
    } else {
      this.turnSeat = nextSeat(this.turnSeat);
      this.runAiTurnLoopIfNeeded();
    }
  }

  private runAiTurnLoopIfNeeded(): void {
    if (this.stateMachine.getPhase() !== "TRICK_PLAY") return;
    if (!AI_SEATS.includes(this.turnSeat)) return;
    const seat = this.turnSeat;
    this.scheduler.schedule(() => {
      if (this.stateMachine.getPhase() !== "TRICK_PLAY" || this.turnSeat !== seat) return;
      const card = gameEngine.selectAiMove(seat, this.hands[seat], this.currentTrick, this.trumpSuit as Suit);
      this.applyCardPlay(seat, card);
    }, randomAiTurnDelayMs());
  }

  applyPlayerMove(cardId: string): void {
    if (!this.stateMachine.isActionAllowed("PLAY_CARD") || this.turnSeat !== "player") {
      throw new ClientError("It is not your turn to play.");
    }
    const legal = gameEngine.getLegalMoves(this.hands.player, this.currentTrick);
    const card = legal.find((c) => c.id === cardId);
    if (!card) {
      throw new ClientError("That card is not a legal move right now.");
    }
    this.applyCardPlay("player", card);
  }

  // --- Read-only accessors for StateQueryService's projection ---
  getPhase() {
    return this.stateMachine.getPhase();
  }
  getDealerSeat() {
    return this.dealerSeat;
  }
  getTurnSeat() {
    return this.turnSeat;
  }
  getTrumpSuit() {
    return this.trumpSuit;
  }
  getHands() {
    return this.hands;
  }
  getCurrentTrick() {
    return this.currentTrick;
  }
  getScores() {
    return this.scores;
  }
  getHandsWon() {
    return this.handsWon;
  }
  getLastTrickWinner() {
    return this.lastTrickWinner;
  }
  getMatchWinner() {
    return this.matchWinner;
  }
  getLegalMovesForPlayer(): Card[] {
    if (this.stateMachine.getPhase() !== "TRICK_PLAY" || this.turnSeat !== "player") return [];
    return gameEngine.getLegalMoves(this.hands.player, this.currentTrick);
  }
}

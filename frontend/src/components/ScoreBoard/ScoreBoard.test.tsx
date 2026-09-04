import React from "react";
import { render, screen } from "@testing-library/react";
import ScoreBoard from "./index";
import { GameStateDTO } from "../../types/game";

jest.mock("../../context/GameContext", () => ({
  useGame: () => mockUseGameReturn,
}));

let mockUseGameReturn: { state: GameStateDTO | null };

function baseState(overrides: Partial<GameStateDTO> = {}): GameStateDTO {
  return {
    phase: "TRICK_PLAY",
    trumpSuit: "Spades",
    dealerSeat: "opponentRight",
    turnSeat: "player",
    playerHand: [],
    opponentCardCounts: { partner: 6, opponentLeft: 6, opponentRight: 6 },
    currentTrick: [],
    legalMoves: [],
    scores: { playerTeam: { hand: 0, cumulative: 0 }, opponentTeam: { hand: 0, cumulative: 0 } },
    handsWon: { playerTeam: 0, opponentTeam: 0 },
    lastTrickWinner: null,
    matchWinner: null,
    ...overrides,
  };
}

test("shows only the player's team, not the opponents' score", () => {
  mockUseGameReturn = { state: baseState() };
  render(<ScoreBoard />);

  expect(screen.getByText("Your Team")).toBeInTheDocument();
  expect(screen.queryByText("Opponents")).not.toBeInTheDocument();
});

test("the displayed score is cumulative plus the hand still in progress, updating live per trick", () => {
  mockUseGameReturn = {
    state: baseState({
      scores: { playerTeam: { hand: 46, cumulative: 100 }, opponentTeam: { hand: 0, cumulative: 80 } },
    }),
  };
  render(<ScoreBoard />);

  // 100 (already-completed hands) + 46 (captured so far in the current, still in-progress hand) = 146.
  expect(screen.getByTestId("player-team-score")).toHaveTextContent("146 / 304");
});

test("shows the hands-won/lost tally", () => {
  mockUseGameReturn = {
    state: baseState({ handsWon: { playerTeam: 2, opponentTeam: 1 } }),
  };
  render(<ScoreBoard />);

  expect(screen.getByTestId("player-team-hands-tally")).toHaveTextContent("Hands: 2W - 1L");
});

test("resets to 0 once the match ends, even though the underlying score data is retained", () => {
  mockUseGameReturn = {
    state: baseState({
      phase: "MATCH_END",
      matchWinner: "playerTeam",
      // A real match-end state: cumulative holds the actual final score, and .hand is not
      // necessarily 0 in every state this component might see it in.
      scores: { playerTeam: { hand: 0, cumulative: 338 }, opponentTeam: { hand: 0, cumulative: 270 } },
    }),
  };
  render(<ScoreBoard />);

  expect(screen.getByTestId("player-team-score")).toHaveTextContent("0 / 304");
});

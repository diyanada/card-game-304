import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import MatchEndModal from "./index";
import { GameStateDTO } from "../../types/game";

const startNewMatch = jest.fn();

jest.mock("../../context/GameContext", () => ({
  useGame: () => mockUseGameReturn,
}));

let mockUseGameReturn: { state: GameStateDTO | null; startNewMatch: typeof startNewMatch };

function stateWith(overrides: Partial<GameStateDTO>): GameStateDTO {
  return {
    phase: "TRICK_PLAY",
    trumpSuit: "Spades",
    dealerSeat: "player",
    turnSeat: "player",
    playerHand: [],
    opponentCardCounts: { partner: 0, opponentLeft: 0, opponentRight: 0 },
    currentTrick: [],
    legalMoves: [],
    scores: { playerTeam: { hand: 0, cumulative: 200 }, opponentTeam: { hand: 0, cumulative: 150 } },
    handsWon: { playerTeam: 0, opponentTeam: 0 },
    lastTrickWinner: null,
    matchWinner: null,
    ...overrides,
  };
}

beforeEach(() => {
  startNewMatch.mockReset();
});

test("renders nothing when the match has not ended", () => {
  mockUseGameReturn = { state: stateWith({ phase: "TRICK_PLAY" }), startNewMatch };
  render(<MatchEndModal />);
  expect(screen.queryByTestId("match-end-modal")).not.toBeInTheDocument();
});

test("shows the winner and final score when the match ends", () => {
  mockUseGameReturn = {
    state: stateWith({
      phase: "MATCH_END",
      matchWinner: "playerTeam",
      scores: { playerTeam: { hand: 0, cumulative: 310 }, opponentTeam: { hand: 0, cumulative: 240 } },
    }),
    startNewMatch,
  };
  render(<MatchEndModal />);

  expect(screen.getByTestId("match-end-modal")).toBeInTheDocument();
  expect(screen.getByText("You Win!")).toBeInTheDocument();
  expect(screen.getByText(/310/)).toBeInTheDocument();
  expect(screen.getByText(/240/)).toBeInTheDocument();
});

test("clicking New Match calls startNewMatch", () => {
  mockUseGameReturn = {
    state: stateWith({ phase: "MATCH_END", matchWinner: "opponentTeam" }),
    startNewMatch,
  };
  render(<MatchEndModal />);

  fireEvent.click(screen.getByTestId("new-match-button"));
  expect(startNewMatch).toHaveBeenCalledTimes(1);
});

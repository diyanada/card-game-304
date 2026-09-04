import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import TrumpSelector from "./index";
import { GameStateDTO } from "../../types/game";

const selectTrump = jest.fn();

jest.mock("../../context/GameContext", () => ({
  useGame: () => mockUseGameReturn,
}));

let mockUseGameReturn: {
  state: GameStateDTO | null;
  isSubmitting: boolean;
  selectTrump: typeof selectTrump;
};

function baseState(overrides: Partial<GameStateDTO> = {}): GameStateDTO {
  return {
    phase: "TRUMP_SELECTION",
    trumpSuit: null,
    dealerSeat: "opponentRight",
    turnSeat: "player",
    playerHand: [
      { id: "10H", suit: "Hearts", rank: "10" },
      { id: "10S", suit: "Spades", rank: "10" },
    ],
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

beforeEach(() => {
  selectTrump.mockReset();
});

test("shows a button for each of the 4 suits and calls selectTrump on click", () => {
  mockUseGameReturn = { state: baseState(), isSubmitting: false, selectTrump };
  render(<TrumpSelector />);

  expect(screen.getByTestId("select-trump-Spades")).toBeInTheDocument();
  expect(screen.getByTestId("select-trump-Hearts")).toBeInTheDocument();
  expect(screen.getByTestId("select-trump-Clubs")).toBeInTheDocument();
  expect(screen.getByTestId("select-trump-Diamonds")).toBeInTheDocument();

  fireEvent.click(screen.getByTestId("select-trump-Hearts"));
  expect(selectTrump).toHaveBeenCalledWith("Hearts");
});

test("does not render when it is not the player's turn to choose trump", () => {
  mockUseGameReturn = { state: baseState({ turnSeat: "partner" }), isSubmitting: false, selectTrump };
  render(<TrumpSelector />);

  expect(screen.queryByTestId("trump-selector")).not.toBeInTheDocument();
});

test("does not render outside the TRUMP_SELECTION phase", () => {
  mockUseGameReturn = { state: baseState({ phase: "TRICK_PLAY" }), isSubmitting: false, selectTrump };
  render(<TrumpSelector />);

  expect(screen.queryByTestId("trump-selector")).not.toBeInTheDocument();
});

test("suit buttons are disabled while a request is submitting", () => {
  mockUseGameReturn = { state: baseState(), isSubmitting: true, selectTrump };
  render(<TrumpSelector />);

  expect(screen.getByTestId("select-trump-Spades")).toBeDisabled();
});

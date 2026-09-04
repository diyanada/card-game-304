import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import PlayerHand from "./index";
import { GameStateDTO } from "../../types/game";

const playCard = jest.fn();
const showIllegalMoveMessage = jest.fn();

jest.mock("../../context/GameContext", () => ({
  useGame: () => mockUseGameReturn,
}));

let mockUseGameReturn: {
  state: GameStateDTO | null;
  isSubmitting: boolean;
  playCard: typeof playCard;
  showIllegalMoveMessage: typeof showIllegalMoveMessage;
};

function baseState(overrides: Partial<GameStateDTO> = {}): GameStateDTO {
  return {
    phase: "TRICK_PLAY",
    trumpSuit: "Spades",
    dealerSeat: "player",
    turnSeat: "player",
    playerHand: [
      { id: "10H", suit: "Hearts", rank: "10" },
      { id: "10S", suit: "Spades", rank: "10" },
    ],
    opponentCardCounts: { partner: 8, opponentLeft: 8, opponentRight: 8 },
    currentTrick: [],
    legalMoves: ["10H"],
    scores: { playerTeam: { hand: 0, cumulative: 0 }, opponentTeam: { hand: 0, cumulative: 0 } },
    handsWon: { playerTeam: 0, opponentTeam: 0 },
    lastTrickWinner: null,
    matchWinner: null,
    ...overrides,
  };
}

beforeEach(() => {
  playCard.mockReset();
  showIllegalMoveMessage.mockReset();
});

test("clicking a legal card calls playCard with its id", () => {
  mockUseGameReturn = { state: baseState(), isSubmitting: false, playCard, showIllegalMoveMessage };
  render(<PlayerHand />);

  fireEvent.click(screen.getByTestId("player-card-10H"));

  expect(playCard).toHaveBeenCalledWith("10H");
  expect(showIllegalMoveMessage).not.toHaveBeenCalled();
});

test("clicking an illegal card shows the illegal-move message instead of playing it", () => {
  mockUseGameReturn = { state: baseState(), isSubmitting: false, playCard, showIllegalMoveMessage };
  render(<PlayerHand />);

  fireEvent.click(screen.getByTestId("player-card-10S"));

  expect(playCard).not.toHaveBeenCalled();
  expect(showIllegalMoveMessage).toHaveBeenCalledTimes(1);
});

test("cards are not interactive when it is not the player's turn", () => {
  mockUseGameReturn = {
    state: baseState({ turnSeat: "partner" }),
    isSubmitting: false,
    playCard,
    showIllegalMoveMessage,
  };
  render(<PlayerHand />);

  fireEvent.click(screen.getByTestId("player-card-10H"));

  expect(playCard).not.toHaveBeenCalled();
  expect(showIllegalMoveMessage).not.toHaveBeenCalled();
});

test("cards are not interactive while a request is submitting", () => {
  mockUseGameReturn = { state: baseState(), isSubmitting: true, playCard, showIllegalMoveMessage };
  render(<PlayerHand />);

  fireEvent.click(screen.getByTestId("player-card-10H"));

  expect(playCard).not.toHaveBeenCalled();
});

import React from "react";
import { render, screen } from "@testing-library/react";
import App from "./App";

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    json: async () => ({ apiBaseUrl: "http://localhost:4000" }),
  }) as unknown as typeof fetch;
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("renders the game table after the initial match bootstraps", async () => {
  render(<App />);

  expect(await screen.findByTestId("game-table")).toBeInTheDocument();
  expect(screen.getByTestId("score-board")).toBeInTheDocument();
  expect(screen.getByTestId("trump-indicator")).toBeInTheDocument();
  expect(screen.getByTestId("dealer-indicator")).toBeInTheDocument();
  expect(screen.getByTestId("player-hand")).toBeInTheDocument();
});

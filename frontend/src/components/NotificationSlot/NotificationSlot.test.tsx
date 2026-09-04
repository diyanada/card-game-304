import React from "react";
import { render, screen } from "@testing-library/react";
import NotificationSlot from "./index";

jest.mock("../../context/GameContext", () => ({
  useGame: () => mockUseGameReturn,
}));

let mockUseGameReturn: { notification: { text: string; kind: "illegal-move" | "connectivity"; id: number } | null };

test("renders nothing when there is no notification", () => {
  mockUseGameReturn = { notification: null };
  render(<NotificationSlot />);
  expect(screen.queryByTestId("notification-slot")).not.toBeInTheDocument();
});

test("renders the illegal-move message text", () => {
  mockUseGameReturn = { notification: { text: "You must follow suit", kind: "illegal-move", id: 1 } };
  render(<NotificationSlot />);
  expect(screen.getByTestId("notification-slot")).toHaveTextContent("You must follow suit");
});

test("renders the connectivity message text", () => {
  mockUseGameReturn = { notification: { text: "Reconnecting...", kind: "connectivity", id: 2 } };
  render(<NotificationSlot />);
  expect(screen.getByTestId("notification-slot")).toHaveTextContent("Reconnecting...");
});

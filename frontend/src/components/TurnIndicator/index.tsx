import React from "react";
import { useGame } from "../../context/GameContext";
import { Seat } from "../../types/game";
import styles from "./TurnIndicator.module.css";

const SEAT_LABEL: Record<Seat, string> = {
  player: "Your turn",
  partner: "Partner's turn",
  opponentLeft: "Left opponent's turn",
  opponentRight: "Right opponent's turn",
};

export default function TurnIndicator() {
  const { state } = useGame();
  if (!state || state.phase !== "TRICK_PLAY") return null;

  return (
    <div className={styles.indicator} data-testid="turn-indicator">
      {SEAT_LABEL[state.turnSeat]}
    </div>
  );
}

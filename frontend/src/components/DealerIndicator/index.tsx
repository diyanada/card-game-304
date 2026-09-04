import React from "react";
import { useGame } from "../../context/GameContext";
import { Seat } from "../../types/game";
import styles from "./DealerIndicator.module.css";

const SEAT_LABEL: Record<Seat, string> = {
  player: "You",
  partner: "Partner",
  opponentLeft: "Left opponent",
  opponentRight: "Right opponent",
};

export default function DealerIndicator() {
  const { state } = useGame();
  if (!state) return null;

  return (
    <div className={styles.indicator} data-testid="dealer-indicator">
      Dealer: {SEAT_LABEL[state.dealerSeat]}
    </div>
  );
}

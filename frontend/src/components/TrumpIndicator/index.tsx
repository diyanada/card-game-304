import React from "react";
import { useGame } from "../../context/GameContext";
import styles from "./TrumpIndicator.module.css";

const SUIT_SYMBOL: Record<string, string> = {
  Spades: "♠",
  Hearts: "♥",
  Clubs: "♣",
  Diamonds: "♦",
};

export default function TrumpIndicator() {
  const { state } = useGame();
  const trump = state?.trumpSuit ?? null;

  return (
    <div className={styles.indicator} data-testid="trump-indicator">
      <span className={styles.label}>Trump:</span>{" "}
      {trump ? (
        <span className={styles.suit}>
          {SUIT_SYMBOL[trump]} {trump}
        </span>
      ) : (
        <span className={styles.pending}>—</span>
      )}
    </div>
  );
}

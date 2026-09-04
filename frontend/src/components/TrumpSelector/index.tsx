import React from "react";
import { useGame } from "../../context/GameContext";
import { ALL_SUITS, Suit } from "../../types/game";
import styles from "./TrumpSelector.module.css";

const SUIT_SYMBOL: Record<Suit, string> = {
  Spades: "♠",
  Hearts: "♥",
  Clubs: "♣",
  Diamonds: "♦",
};

const RED_SUITS: Suit[] = ["Hearts", "Diamonds"];

export default function TrumpSelector() {
  const { state, selectTrump, isSubmitting } = useGame();

  if (!state || state.phase !== "TRUMP_SELECTION" || state.turnSeat !== "player") return null;

  return (
    <div className={styles.overlay} data-testid="trump-selector">
      <div className={styles.modal}>
        <h2>Choose Trump</h2>
        <p>Look at your hand and pick the trump suit for this hand.</p>
        <div className={styles.suitGrid}>
          {ALL_SUITS.map((suit) => (
            <button
              key={suit}
              type="button"
              className={styles.suitButton + (RED_SUITS.includes(suit) ? " " + styles.red : "")}
              onClick={() => selectTrump(suit)}
              disabled={isSubmitting}
              data-testid={`select-trump-${suit}`}
            >
              <span className={styles.symbol}>{SUIT_SYMBOL[suit]}</span>
              <span className={styles.name}>{suit}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

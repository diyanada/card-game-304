import React from "react";
import { Suit, Rank } from "../../types/game";
import styles from "./Card.module.css";

const SUIT_SYMBOL: Record<Suit, string> = {
  Spades: "♠",
  Hearts: "♥",
  Clubs: "♣",
  Diamonds: "♦",
};

const RED_SUITS: Suit[] = ["Hearts", "Diamonds"];

export interface CardProps {
  suit?: Suit;
  rank?: Rank;
  faceUp: boolean;
  disabled?: boolean;
  onClick?: () => void;
  testId?: string;
  size?: "normal" | "large";
}

export default function Card({ suit, rank, faceUp, disabled, onClick, testId, size = "normal" }: CardProps) {
  const sizeClass = size === "large" ? " " + styles.large : "";

  if (!faceUp || !suit || !rank) {
    return (
      <div
        className={styles.card + sizeClass + " " + styles.faceDown}
        role="img"
        aria-label="Face-down card"
        data-testid={testId}
      />
    );
  }

  const isRed = RED_SUITS.includes(suit);
  const clickable = typeof onClick === "function";

  return (
    <button
      type="button"
      className={
        styles.card +
        sizeClass +
        " " +
        styles.faceUp +
        (isRed ? " " + styles.red : "") +
        (disabled ? " " + styles.disabled : "") +
        (clickable ? " " + styles.clickable : "")
      }
      onClick={onClick}
      disabled={!clickable}
      aria-label={`${rank} of ${suit}`}
      data-testid={testId}
    >
      <span className={styles.corner}>
        {rank}
        <br />
        {SUIT_SYMBOL[suit]}
      </span>
      <span className={styles.center}>{SUIT_SYMBOL[suit]}</span>
    </button>
  );
}

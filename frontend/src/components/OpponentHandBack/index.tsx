import React from "react";
import Card from "../Card";
import { Seat } from "../../types/game";
import styles from "./OpponentHandBack.module.css";

const SEAT_LABEL: Record<Exclude<Seat, "player">, string> = {
  partner: "Partner",
  opponentLeft: "Opponent (Left)",
  opponentRight: "Opponent (Right)",
};

export interface OpponentHandBackProps {
  seat: "partner" | "opponentLeft" | "opponentRight";
  cardCount: number;
}

export default function OpponentHandBack({ seat, cardCount }: OpponentHandBackProps) {
  return (
    <div className={styles.wrapper} data-testid={`opponent-hand-${seat}`}>
      <div className={styles.label}>{SEAT_LABEL[seat]}</div>
      <div className={styles.cards}>
        {Array.from({ length: cardCount }).map((_, i) => (
          <Card key={i} faceUp={false} testId={`opponent-card-${seat}-${i}`} />
        ))}
      </div>
    </div>
  );
}

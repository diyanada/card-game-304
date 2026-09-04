import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import Card from "../Card";
import { useGame } from "../../context/GameContext";
import { Seat } from "../../types/game";
import styles from "./TrickArea.module.css";

const SEAT_POSITION_CLASS: Record<Seat, string> = {
  player: styles.posBottom,
  partner: styles.posTop,
  opponentLeft: styles.posLeft,
  opponentRight: styles.posRight,
};

export default function TrickArea() {
  const { state } = useGame();
  if (!state) return null;

  return (
    <div className={styles.trickArea} data-testid="trick-area">
      <AnimatePresence>
        {state.currentTrick.map((entry) => (
          <motion.div
            key={entry.card.id}
            className={
              SEAT_POSITION_CLASS[entry.seat] +
              (state.lastTrickWinner === entry.seat ? " " + styles.winning : "")
            }
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.25 }}
          >
            <Card suit={entry.card.suit} rank={entry.card.rank} faceUp testId={`trick-card-${entry.card.id}`} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

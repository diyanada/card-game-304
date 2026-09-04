import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGame } from "../../context/GameContext";
import Card from "../Card";
import styles from "./DealAnimation.module.css";

const TARGETS = [
  { x: 0, y: -140 }, // partner (top)
  { x: 140, y: 0 }, // opponentRight
  { x: 0, y: 140 }, // player (bottom)
  { x: -140, y: 0 }, // opponentLeft
];

export default function DealAnimation() {
  const { state } = useGame();
  const isDealing = state?.phase === "DEALING";

  return (
    <AnimatePresence>
      {isDealing && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-testid="deal-animation"
        >
          <div className={styles.center}>
            {TARGETS.map((target, i) => (
              <motion.div
                key={i}
                className={styles.flyingCard}
                initial={{ x: 0, y: 0, opacity: 0 }}
                animate={{ x: target.x, y: target.y, opacity: 1 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
              >
                <Card faceUp={false} />
              </motion.div>
            ))}
          </div>
          <div className={styles.label}>Dealing...</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

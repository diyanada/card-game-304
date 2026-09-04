import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGame } from "../../context/GameContext";
import styles from "./NotificationSlot.module.css";

export default function NotificationSlot() {
  const { notification } = useGame();

  return (
    <div className={styles.wrapper}>
      <AnimatePresence>
        {notification && (
          <motion.div
            key={notification.id}
            className={
              styles.message + " " + (notification.kind === "connectivity" ? styles.connectivity : styles.illegal)
            }
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            data-testid="notification-slot"
          >
            {notification.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

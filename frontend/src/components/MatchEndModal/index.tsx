import React from "react";
import { useGame } from "../../context/GameContext";
import styles from "./MatchEndModal.module.css";

export default function MatchEndModal() {
  const { state, startNewMatch } = useGame();

  if (!state || state.phase !== "MATCH_END" || !state.matchWinner) return null;

  const youWon = state.matchWinner === "playerTeam";

  return (
    <div className={styles.overlay} data-testid="match-end-modal">
      <div className={styles.modal}>
        <h2>{youWon ? "You Win!" : "Opponents Win"}</h2>
        <p>
          Final score — Your Team: {state.scores.playerTeam.cumulative} · Opponents:{" "}
          {state.scores.opponentTeam.cumulative}
        </p>
        <button type="button" onClick={startNewMatch} data-testid="new-match-button">
          New Match
        </button>
      </div>
    </div>
  );
}

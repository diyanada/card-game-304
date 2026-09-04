import React from "react";
import { useGame } from "../../context/GameContext";
import { MATCH_TARGET_SCORE } from "../../types/game";
import styles from "./ScoreBoard.module.css";

export default function ScoreBoard() {
  const { state } = useGame();
  if (!state) return null;

  const { playerTeam } = state.scores;
  const { playerTeam: playerHandsWon, opponentTeam: opponentHandsWon } = state.handsWon;
  // Cumulative points from completed hands + points already captured in the hand still in
  // progress, so this ticks up trick by trick instead of jumping only once a hand fully ends.
  // Once the match is over, the ScoreBoard resets to 0 — the match-end popup shows the real
  // final score (2026-09-03 change request).
  const liveScore = state.phase === "MATCH_END" ? 0 : playerTeam.cumulative + playerTeam.hand;

  return (
    <div className={styles.board} data-testid="score-board">
      <div className={styles.team}>
        <div className={styles.row}>
          <span>Your Team</span>
          <span data-testid="player-team-score">
            {liveScore} / {MATCH_TARGET_SCORE}
          </span>
        </div>
        <div className={styles.subRow}>
          <span data-testid="player-team-hands-tally">
            Hands: {playerHandsWon}W - {opponentHandsWon}L
          </span>
        </div>
      </div>
    </div>
  );
}

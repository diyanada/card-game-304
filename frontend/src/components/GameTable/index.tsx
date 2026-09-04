import React from "react";
import { useGame } from "../../context/GameContext";
import DealerIndicator from "../DealerIndicator";
import TurnIndicator from "../TurnIndicator";
import TrumpIndicator from "../TrumpIndicator";
import ScoreBoard from "../ScoreBoard";
import PlayerHand from "../PlayerHand";
import OpponentHandBack from "../OpponentHandBack";
import TrickArea from "../TrickArea";
import styles from "./GameTable.module.css";

export default function GameTable() {
  const { state } = useGame();
  if (!state) return null;

  return (
    <div className={styles.table} data-testid="game-table">
      <div className={styles.topBar}>
        <ScoreBoard />
        <TrumpIndicator />
        <DealerIndicator />
      </div>

      <div className={styles.seatTop}>
        <OpponentHandBack seat="partner" cardCount={state.opponentCardCounts.partner} />
      </div>

      <div className={styles.middleRow}>
        <div className={styles.seatLeft}>
          <OpponentHandBack seat="opponentLeft" cardCount={state.opponentCardCounts.opponentLeft} />
        </div>
        <TrickArea />
        <div className={styles.seatRight}>
          <OpponentHandBack seat="opponentRight" cardCount={state.opponentCardCounts.opponentRight} />
        </div>
      </div>

      <div className={styles.turnBar}>
        <TurnIndicator />
      </div>

      <div className={styles.seatBottom}>
        <PlayerHand />
      </div>
    </div>
  );
}

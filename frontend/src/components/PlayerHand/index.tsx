import React from "react";
import Card from "../Card";
import { useGame } from "../../context/GameContext";
import styles from "./PlayerHand.module.css";

export default function PlayerHand() {
  const { state, isSubmitting, playCard, showIllegalMoveMessage } = useGame();

  if (!state) return null;

  const interactive = state.turnSeat === "player" && state.phase === "TRICK_PLAY" && !isSubmitting;

  function handleCardClick(cardId: string) {
    // UI-BR-1/2/3: cards stay clickable; legality is checked against state.legalMoves client-side.
    if (state!.legalMoves.includes(cardId)) {
      playCard(cardId);
    } else {
      showIllegalMoveMessage("You can't play that card right now — you must follow suit if able.");
    }
  }

  return (
    <div className={styles.hand} data-testid="player-hand">
      {state.playerHand.map((card) => (
        <Card
          key={card.id}
          suit={card.suit}
          rank={card.rank}
          faceUp
          size="large"
          disabled={!interactive}
          onClick={interactive ? () => handleCardClick(card.id) : undefined}
          testId={`player-card-${card.id}`}
        />
      ))}
    </div>
  );
}

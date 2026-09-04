import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { GameStateDTO, Suit } from "../types/game";
import * as GameClientService from "../services/GameClientService";
import { createPollManager, Connectivity } from "../services/PollManager";
import { logError } from "../services/logError";

export type NotificationKind = "illegal-move" | "connectivity";

export interface NotificationMessage {
  text: string;
  kind: NotificationKind;
  id: number;
}

interface GameContextValue {
  state: GameStateDTO | null;
  connectivity: Connectivity;
  notification: NotificationMessage | null;
  isSubmitting: boolean;
  playCard: (cardId: string) => void;
  selectTrump: (suit: Suit) => void;
  startNewMatch: () => void;
  showIllegalMoveMessage: (text: string) => void;
}

const GameContext = createContext<GameContextValue | undefined>(undefined);

const ILLEGAL_MOVE_DISPLAY_MS = 2500;

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameStateDTO | null>(null);
  const [connectivity, setConnectivity] = useState<Connectivity>("ok");
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const notificationIdRef = useRef(0);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevConnectivityRef = useRef<Connectivity>("ok");
  const pollManagerRef = useRef<ReturnType<typeof createPollManager> | null>(null);

  const showMessage = useCallback((text: string, kind: NotificationKind, autoDismiss: boolean) => {
    notificationIdRef.current += 1;
    const id = notificationIdRef.current;
    setNotification({ text, kind, id });
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    if (autoDismiss) {
      dismissTimerRef.current = setTimeout(() => {
        setNotification((current) => (current?.id === id ? null : current));
      }, ILLEGAL_MOVE_DISPLAY_MS);
    }
  }, []);

  const showIllegalMoveMessage = useCallback(
    (text: string) => showMessage(text, "illegal-move", true),
    [showMessage]
  );

  useEffect(() => {
    // UI-BR-8: session bootstrap on first load.
    let cancelled = false;

    async function bootstrap() {
      try {
        const initialState = await GameClientService.startNewMatch();
        if (cancelled) return;
        setState(initialState);
      } catch (error) {
        logError("Failed to start new match", error);
      }

      const manager = createPollManager((update) => {
        if (cancelled) return;
        if (update.data) setState(update.data);

        if (update.connectivity !== prevConnectivityRef.current) {
          if (update.connectivity === "reconnecting") {
            showMessage("Reconnecting...", "connectivity", false);
          } else {
            setNotification((current) => (current?.kind === "connectivity" ? null : current));
          }
          prevConnectivityRef.current = update.connectivity;
        }
        setConnectivity(update.connectivity);
      });
      pollManagerRef.current = manager;
      manager.start();
    }

    void bootstrap();

    return () => {
      cancelled = true;
      pollManagerRef.current?.stop();
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playCard = useCallback(
    (cardId: string) => {
      // UI-BR-4/UI-BR-5: turn gating + double-submit guard.
      if (!state || state.turnSeat !== "player" || state.phase !== "TRICK_PLAY" || isSubmitting) {
        return;
      }
      setIsSubmitting(true);
      GameClientService.playCard(cardId)
        .then((result) => {
          if (result.ok && result.state) {
            setState(result.state);
          } else if (result.error) {
            showMessage(result.error, "illegal-move", true);
          }
        })
        .catch((error) => {
          logError("Failed to play card", error);
          showMessage("Something went wrong playing that card.", "illegal-move", true);
        })
        .finally(() => setIsSubmitting(false));
    },
    [state, isSubmitting, showMessage]
  );

  const selectTrump = useCallback(
    (suit: Suit) => {
      // Mirrors playCard's turn-gating: only valid during TRUMP_SELECTION, and only for the player.
      if (!state || state.turnSeat !== "player" || state.phase !== "TRUMP_SELECTION" || isSubmitting) {
        return;
      }
      setIsSubmitting(true);
      GameClientService.selectTrump(suit)
        .then((result) => {
          if (result.ok && result.state) {
            setState(result.state);
          } else if (result.error) {
            showMessage(result.error, "illegal-move", true);
          }
        })
        .catch((error) => {
          logError("Failed to select trump", error);
          showMessage("Something went wrong selecting trump.", "illegal-move", true);
        })
        .finally(() => setIsSubmitting(false));
    },
    [state, isSubmitting, showMessage]
  );

  const startNewMatch = useCallback(() => {
    // UI-BR-6: new match trigger resets transient UI state.
    setNotification(null);
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    GameClientService.startNewMatch()
      .then((newState) => setState(newState))
      .catch((error) => logError("Failed to start new match", error));
  }, []);

  const value: GameContextValue = {
    state,
    connectivity,
    notification,
    isSubmitting,
    playCard,
    selectTrump,
    startNewMatch,
    showIllegalMoveMessage,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return ctx;
}

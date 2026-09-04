import { Router } from "express";
import { SessionManager } from "../session/sessionManager";
import { resolveSession } from "../services/sessionService";
import * as matchService from "../services/matchService";
import { getPublicState } from "../services/stateQueryService";
import { validateBody, playCardBodySchema, selectTrumpBodySchema } from "./validation";

export function createRoutes(sessionManager: SessionManager): Router {
  const router = Router();

  router.post("/api/match/new", (req, res) => {
    const gameSession = resolveSession(sessionManager, req, res);
    matchService.startNewMatch(gameSession);
    res.json(getPublicState(gameSession));
  });

  router.get("/api/state", (req, res) => {
    const gameSession = resolveSession(sessionManager, req, res);
    res.json(getPublicState(gameSession));
  });

  router.post("/api/play-card", validateBody(playCardBodySchema), (req, res, next) => {
    try {
      const gameSession = resolveSession(sessionManager, req, res);
      matchService.playCard(gameSession, req.body.cardId);
      res.json(getPublicState(gameSession));
    } catch (err) {
      next(err);
    }
  });

  router.post("/api/select-trump", validateBody(selectTrumpBodySchema), (req, res, next) => {
    try {
      const gameSession = resolveSession(sessionManager, req, res);
      matchService.selectTrump(gameSession, req.body.suit);
      res.json(getPublicState(gameSession));
    } catch (err) {
      next(err);
    }
  });

  return router;
}

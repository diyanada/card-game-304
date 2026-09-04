import { Request, Response } from "express";
import { SessionManager } from "../session/sessionManager";
import { GameSession } from "../session/gameSession";

export const SESSION_COOKIE_NAME = "sessionId";

// application-design/services.md: SessionService — request-level cookie handling on top of SessionManager.
export function resolveSession(
  sessionManager: SessionManager,
  req: Request,
  res: Response
): GameSession {
  const cookieValue: string | undefined = req.cookies?.[SESSION_COOKIE_NAME];
  const { sessionId, gameSession, isNew } = sessionManager.getOrCreateSession(cookieValue);

  if (isNew) {
    res.cookie(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      sameSite: "lax",
    });
  }

  return gameSession;
}

import { NextFunction, Request, Response } from "express";
import { ClientError } from "./errors";

// NFR Design Question 1:A — global error-handling middleware. Registered last.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ClientError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  // eslint-disable-next-line no-console
  console.error("[304-card-game-backend] Unexpected error:", err);
  res.status(500).json({ error: "Something went wrong." });
}

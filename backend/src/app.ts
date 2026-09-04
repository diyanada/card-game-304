import express, { Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { SessionManager } from "./session/sessionManager";
import { createRoutes } from "./api/routes";
import { errorHandler } from "./api/errorHandler";

const ALLOWED_ORIGIN = "http://localhost:3000"; // NFR Requirements Question 2:A (hardcoded)

export function createApp(sessionManager: SessionManager): Express {
  const app = express();

  app.use(cors({ origin: ALLOWED_ORIGIN, credentials: true }));
  app.use(cookieParser());
  app.use(express.json());

  app.use(createRoutes(sessionManager));

  app.use(errorHandler);

  return app;
}

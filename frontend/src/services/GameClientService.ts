// The Frontend unit's single integration point with the backend (application-design/services.md:
// GameClientService). During Frontend-first development (functional-design/business-logic-model.md
// Question 1:A) this delegates to the temporary mockGameEngine instead of real HTTP calls. Both paths
// return the identical GameStateDTO shape, so swapping USE_MOCK to false (and confirming apiBaseUrl
// resolves correctly) is the only change needed once the Backend unit exists — no UI component changes.

import { GameStateDTO, Suit } from "../types/game";
import * as mockGameEngine from "../mock/mockGameEngine";
import { logError } from "./logError";

export interface PlayCardResult {
  ok: boolean;
  state?: GameStateDTO;
  error?: string;
}

// Swap point for Backend integration: set to false once the Backend unit's real API is deployed
// and CORS is confirmed working from this app's origin (infrastructure-design.md).
const USE_MOCK = true;

let apiBaseUrl: string | null = null;

async function loadConfig(): Promise<void> {
  if (apiBaseUrl !== null) return;
  try {
    const response = await fetch("/config.json");
    const config = await response.json();
    apiBaseUrl = config.apiBaseUrl ?? "";
  } catch (error) {
    logError("Failed to load config.json", error);
    apiBaseUrl = "";
  }
}

async function httpStartNewMatch(): Promise<GameStateDTO> {
  const response = await fetch(`${apiBaseUrl}/api/match/new`, { method: "POST", credentials: "include" });
  return response.json();
}

async function httpPollState(): Promise<GameStateDTO> {
  const response = await fetch(`${apiBaseUrl}/api/state`, { credentials: "include" });
  return response.json();
}

async function httpPlayCard(cardId: string): Promise<PlayCardResult> {
  const response = await fetch(`${apiBaseUrl}/api/play-card`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cardId }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return { ok: false, error: body.error ?? "Failed to play card." };
  }
  const state: GameStateDTO = await response.json();
  return { ok: true, state };
}

async function httpSelectTrump(suit: Suit): Promise<PlayCardResult> {
  const response = await fetch(`${apiBaseUrl}/api/select-trump`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ suit }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    return { ok: false, error: body.error ?? "Failed to select trump." };
  }
  const state: GameStateDTO = await response.json();
  return { ok: true, state };
}

export async function startNewMatch(): Promise<GameStateDTO> {
  await loadConfig();
  if (USE_MOCK) {
    return mockGameEngine.startNewMatch();
  }
  return httpStartNewMatch();
}

export async function pollState(): Promise<GameStateDTO> {
  await loadConfig();
  if (USE_MOCK) {
    return mockGameEngine.getState();
  }
  return httpPollState();
}

export async function playCard(cardId: string): Promise<PlayCardResult> {
  await loadConfig();
  if (USE_MOCK) {
    const result = mockGameEngine.playCard(cardId);
    return result.ok ? { ok: true, state: result.state } : { ok: false, error: result.error };
  }
  return httpPlayCard(cardId);
}

export async function selectTrump(suit: Suit): Promise<PlayCardResult> {
  await loadConfig();
  if (USE_MOCK) {
    const result = mockGameEngine.selectTrump(suit);
    return result.ok ? { ok: true, state: result.state } : { ok: false, error: result.error };
  }
  return httpSelectTrump(suit);
}

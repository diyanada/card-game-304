# 304 Card Game — Backend (Game Engine & API)

Authoritative game-rule engine and REST API for the 304 card game. Implements the exact contract the Frontend unit was already built against.

## Setup

```bash
cd backend
npm install
```

## Run (development)

```bash
npm run dev
```

Starts a hot-reloading server (via `tsx watch`) on `http://localhost:4000` (override with `PORT`).

## Run (production-style, local)

```bash
npm run build
npm start
```

## Test

```bash
npm test        # watch/run once (see package.json)
npm run test:ci # CI mode
```

## Lint / type-check

```bash
npm run lint
```

## API Reference

All endpoints resolve the caller's session via an `httpOnly` `sessionId` cookie, transparently creating a new session if none is present or the presented one has expired.

| Method | Path | Body | Response |
|---|---|---|---|
| `POST` | `/api/match/new` | — | `200` + `GameStateDTO` |
| `GET` | `/api/state` | — | `200` + `GameStateDTO` |
| `POST` | `/api/play-card` | `{ "cardId": string }` | `200` + `GameStateDTO`, or `400` + `{ "error": string }` |

Unexpected server errors return `500` + `{ "error": "Something went wrong." }`.

CORS is restricted to `http://localhost:3000` (the Frontend's dev server origin) with credentials enabled — requests from other origins are rejected by the browser.

## Project Structure

```
backend/
├── src/
│   ├── types/game.ts          # shared DTO/domain types (mirrors frontend/src/types/game.ts)
│   ├── engine/                 # authoritative rule engine (ported from the validated frontend mock)
│   │   ├── deck.ts
│   │   ├── gameEngine.ts
│   │   ├── gameStateMachine.ts
│   │   └── turnScheduler.ts
│   ├── session/                 # per-session state (in-memory), session lifecycle
│   │   ├── gameSession.ts
│   │   ├── sessionManager.ts
│   │   └── sessionSweeper.ts
│   ├── services/                 # request-level orchestration
│   │   ├── sessionService.ts
│   │   ├── matchService.ts
│   │   └── stateQueryService.ts
│   ├── api/                      # HTTP boundary
│   │   ├── routes.ts
│   │   ├── validation.ts
│   │   ├── errorHandler.ts
│   │   └── errors.ts
│   ├── app.ts                    # Express app factory (used by server.ts and tests)
│   └── server.ts                 # process entry point
└── package.json
```

## Integrating with the Frontend Unit

This unit does not modify the Frontend. To wire them together:
1. Run this backend (`npm run dev`, listening on `:4000`)
2. In `frontend/src/services/GameClientService.ts`, change `const USE_MOCK = true;` to `false`
3. Ensure `frontend/public/config.json` has `"apiBaseUrl": "http://localhost:4000"` (already the default)
4. Run the frontend (`npm start` in `frontend/`) — it will now call this real backend instead of its temporary mock engine

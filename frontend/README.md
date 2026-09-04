# 304 Card Game — Frontend (Web UI)

Single-player 304 card game web client. You play against 3 computer-controlled opponents (1 partner, 2 opponents), partnership rules, first team to 304 cumulative points wins.

This is the **Frontend unit** (Create React App + TypeScript). It was built first, against a temporary in-browser mock game engine (`src/mock/mockGameEngine.ts`) that fully implements the 304 rules, so the app is playable end-to-end before the Backend unit exists. See `aidlc-docs/construction/frontend/functional-design/business-logic-model.md` for why.

## Setup

```bash
cd frontend
npm install
```

## Run (development)

```bash
npm start
```

Opens the app at `http://localhost:3000` with hot reload. Uses the mock game engine — fully playable, no backend required.

## Run (production build, local)

```bash
npm run build
npx serve -s build
```

## Test

```bash
npm test          # watch mode
npm run test:ci   # single run, non-interactive (used in CI)
```

## Lint / type-check

```bash
npm run lint
```

## Configuration

`public/config.json` supplies the backend API base URL at runtime (not baked into the build):

```json
{ "apiBaseUrl": "http://localhost:4000" }
```

Edit this file to point at a different backend without rebuilding. Note: as of this build, `GameClientService` still uses the mock engine (`USE_MOCK = true` in `src/services/GameClientService.ts`) rather than calling this URL — see that file's comments for the Backend-integration swap point.

## Project Structure

```
frontend/
├── public/
│   ├── index.html
│   └── config.json        # runtime apiBaseUrl
├── src/
│   ├── types/game.ts       # shared DTO/domain types
│   ├── mock/                # TEMPORARY mock game engine (see business-logic-model.md)
│   ├── services/             # GameClientService, PollManager, logError
│   ├── context/              # GameProvider (React Context state management)
│   ├── components/           # one folder per component, each with .module.css
│   ├── styles/theme.css      # global theme
│   ├── App.tsx
│   └── index.tsx
└── package.json
```

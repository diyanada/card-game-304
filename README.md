# 304

A web implementation of **304**, the South Asian trick-taking card game for four players in two partnerships. Play against three computer-controlled opponents (one partner, two rivals) — first team to reach 304 cumulative points wins the match.

## How it plays

- 24-card deck (9, 10, J, Q, K, A in each suit), dealt 6 cards to each of 4 seats.
- The seat leading the first trick each hand chooses trump by looking at their own hand.
- Standard trick-taking: follow suit if you can, trump wins over led suit, highest card of the winning suit takes the trick.
- Card points (J=30, 9=20, A=11, 10=10, K=3, Q=2) sum to exactly 304 across the full deck — a hand's points go to whichever team won the most valuable tricks.
- First team to 304 cumulative points across hands wins the match.

## Project structure

```
.
├── backend/    Express + TypeScript REST API and authoritative game engine
└── frontend/   React + TypeScript web client (Create React App)
```

Each has its own setup, run, and test instructions — see [backend/README.md](backend/README.md) and [frontend/README.md](frontend/README.md).

## Quick start

Run the frontend on its own first (it ships with a mock game engine, so it's playable without the backend):

```bash
cd frontend
npm install
npm start
```

Opens at `http://localhost:3000`.

To play against the real backend instead of the mock engine:

```bash
cd backend
npm install
npm run dev
```

Starts the API on `http://localhost:4000`, then follow the "Integrating with the Frontend Unit" section in [backend/README.md](backend/README.md) to point the frontend at it.

## Tech stack

- **Backend**: Node.js, Express, TypeScript, Zod, Jest
- **Frontend**: React, TypeScript, Framer Motion, Create React App

## License

GPL-3.0 — see [LICENSE](LICENSE).

import request from "supertest";
import { createApp } from "../app";
import { SessionManager } from "../session/sessionManager";

function buildApp() {
  return createApp(new SessionManager());
}

describe("API routes", () => {
  test("POST /api/match/new returns 200, sets a session cookie, and starts DEALING", async () => {
    const app = buildApp();
    const res = await request(app).post("/api/match/new");

    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"]).toBeDefined();
    expect(res.body.phase).toBe("DEALING");
    expect(res.body.scores.playerTeam.cumulative).toBe(0);
    expect(res.body.scores.opponentTeam.cumulative).toBe(0);
    expect(res.body.handsWon).toEqual({ playerTeam: 0, opponentTeam: 0 });
  });

  test("GET /api/state without a prior cookie creates a fresh session and sets a cookie", async () => {
    const app = buildApp();
    const res = await request(app).get("/api/state");

    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"]).toBeDefined();
    expect(res.body.playerHand).toEqual([]);
    expect(res.body.legalMoves).toEqual([]);
  });

  test("the same session is reused across requests via the cookie", async () => {
    const app = buildApp();
    const agent = request.agent(app);

    const first = await agent.post("/api/match/new");
    expect(first.status).toBe(200);

    const second = await agent.get("/api/state");
    expect(second.status).toBe(200);
    // Same session: both responses reflect the same in-progress match (still DEALING, no elapsed timers).
    expect(second.body.phase).toBe("DEALING");
  });

  test("two different clients (no shared cookie) get independent sessions", async () => {
    const app = buildApp();
    const clientA = await request(app).post("/api/match/new");
    const clientB = await request(app).post("/api/match/new");

    expect(clientA.headers["set-cookie"]).toBeDefined();
    expect(clientB.headers["set-cookie"]).toBeDefined();
    expect(clientA.headers["set-cookie"]![0]).not.toBe(clientB.headers["set-cookie"]![0]);
  });

  test("POST /api/play-card with a missing cardId returns 400 with a validation error", async () => {
    const app = buildApp();
    const res = await request(app).post("/api/play-card").send({});

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe("string");
  });

  test("POST /api/play-card before a match has started returns 400 (not your turn / wrong phase)", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    // No /api/match/new call — a fresh session defaults to phase DEALING, so play-card must be rejected.
    const res = await agent.post("/api/play-card").send({ cardId: "10H" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not your turn/i);
  });

  test("POST /api/select-trump with an invalid suit returns 400 with a validation error", async () => {
    const app = buildApp();
    const res = await request(app).post("/api/select-trump").send({ suit: "Stars" });

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe("string");
  });

  test("POST /api/select-trump before it is the player's turn to choose returns 400", async () => {
    const app = buildApp();
    const agent = request.agent(app);
    // No /api/match/new call — a fresh session defaults to phase DEALING, so select-trump must be rejected.
    const res = await agent.post("/api/select-trump").send({ suit: "Spades" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not your turn/i);
  });
});

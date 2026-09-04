import { GameStateDTO } from "../types/game";
import { createPollManager, PollUpdate } from "./PollManager";

const sampleState: GameStateDTO = {
  phase: "TRICK_PLAY",
  trumpSuit: "Hearts",
  dealerSeat: "player",
  turnSeat: "player",
  playerHand: [],
  opponentCardCounts: { partner: 8, opponentLeft: 8, opponentRight: 8 },
  currentTrick: [],
  legalMoves: [],
  scores: { playerTeam: { hand: 0, cumulative: 0 }, opponentTeam: { hand: 0, cumulative: 0 } },
  handsWon: { playerTeam: 0, opponentTeam: 0 },
  lastTrickWinner: null,
  matchWinner: null,
};

jest.mock("./GameClientService", () => ({
  pollState: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const GameClientService = require("./GameClientService");

// react-scripts 5 pins a Jest version without jest.advanceTimersByTimeAsync, so advance the fake
// timer synchronously and then flush the microtask queue for the async tick() to resolve.
async function advanceAndFlush(ms: number) {
  jest.advanceTimersByTime(ms);
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe("PollManager", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    GameClientService.pollState.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("reports connectivity ok with data on a successful poll", async () => {
    GameClientService.pollState.mockResolvedValue(sampleState);
    const updates: PollUpdate[] = [];
    const manager = createPollManager((u) => updates.push(u));

    manager.start();
    await advanceAndFlush(0);
    manager.stop();

    expect(updates[0]).toEqual({ data: sampleState, connectivity: "ok" });
  });

  test("retains stale data and reports reconnecting only after 3 consecutive failures", async () => {
    GameClientService.pollState
      .mockResolvedValueOnce(sampleState) // first tick succeeds
      .mockRejectedValueOnce(new Error("net-1"))
      .mockRejectedValueOnce(new Error("net-2"))
      .mockRejectedValueOnce(new Error("net-3"));

    const updates: PollUpdate[] = [];
    const manager = createPollManager((u) => updates.push(u));

    manager.start();
    await advanceAndFlush(0); // tick 1: success
    await advanceAndFlush(500); // tick 2: fail 1
    await advanceAndFlush(500); // tick 3: fail 2
    await advanceAndFlush(500); // tick 4: fail 3 -> reconnecting
    manager.stop();

    expect(updates).toHaveLength(4);
    expect(updates[0].connectivity).toBe("ok");
    expect(updates[1]).toEqual({ data: sampleState, connectivity: "ok" }); // stale data retained, still under threshold
    expect(updates[2]).toEqual({ data: sampleState, connectivity: "ok" });
    expect(updates[3]).toEqual({ data: sampleState, connectivity: "reconnecting" });
  });

  test("stop() prevents further polling", async () => {
    GameClientService.pollState.mockResolvedValue(sampleState);
    const updates: PollUpdate[] = [];
    const manager = createPollManager((u) => updates.push(u));

    manager.start();
    await advanceAndFlush(0);
    manager.stop();
    const countAfterStop = updates.length;

    await advanceAndFlush(2000);
    expect(updates.length).toBe(countAfterStop);
  });
});

import { GameStateDTO } from "../types/game";

const sampleState: GameStateDTO = {
  phase: "TRICK_PLAY",
  trumpSuit: "Spades",
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

jest.mock("../mock/mockGameEngine", () => ({
  startNewMatch: jest.fn(),
  getState: jest.fn(),
  playCard: jest.fn(),
}));

describe("GameClientService", () => {
  let GameClientService: typeof import("./GameClientService");
  let mockGameEngine: {
    startNewMatch: jest.Mock;
    getState: jest.Mock;
    playCard: jest.Mock;
  };

  beforeEach(async () => {
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    mockGameEngine = require("../mock/mockGameEngine");
    mockGameEngine.startNewMatch.mockReset().mockReturnValue(sampleState);
    mockGameEngine.getState.mockReset().mockReturnValue(sampleState);
    mockGameEngine.playCard.mockReset().mockReturnValue({ ok: true, state: sampleState });

    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ apiBaseUrl: "http://localhost:4000" }),
    }) as unknown as typeof fetch;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    GameClientService = require("./GameClientService");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("startNewMatch delegates to the mock game engine and returns its state", async () => {
    const result = await GameClientService.startNewMatch();
    expect(mockGameEngine.startNewMatch).toHaveBeenCalledTimes(1);
    expect(result).toEqual(sampleState);
  });

  test("pollState delegates to the mock game engine", async () => {
    const result = await GameClientService.pollState();
    expect(mockGameEngine.getState).toHaveBeenCalledTimes(1);
    expect(result).toEqual(sampleState);
  });

  test("playCard delegates to the mock game engine and returns its result on success", async () => {
    const result = await GameClientService.playCard("10H");
    expect(mockGameEngine.playCard).toHaveBeenCalledWith("10H");
    expect(result).toEqual({ ok: true, state: sampleState });
  });

  test("playCard surfaces a failure result without throwing", async () => {
    mockGameEngine.playCard.mockReturnValue({ ok: false, error: "Illegal move" });
    const result = await GameClientService.playCard("10S");
    expect(result).toEqual({ ok: false, error: "Illegal move" });
  });

  test("fetches config.json only once across multiple calls", async () => {
    await GameClientService.startNewMatch();
    await GameClientService.pollState();
    await GameClientService.playCard("10H");
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith("/config.json");
  });
});

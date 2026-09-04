import { createApp } from "./app";
import { SessionManager } from "./session/sessionManager";
import { SessionSweeper } from "./session/sessionSweeper";

const PORT = Number(process.env.PORT) || 4000;

const sessionManager = new SessionManager();
const sweeper = new SessionSweeper(sessionManager);
sweeper.start();

const app = createApp(sessionManager);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[304-card-game-backend] listening on http://localhost:${PORT}`);
});

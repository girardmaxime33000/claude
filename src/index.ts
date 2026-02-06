import "dotenv/config";
import { loadConfig } from "./config/loader.js";
import { Orchestrator } from "./orchestrator/orchestrator.js";

/**
 * Main entry point - starts the orchestrator in continuous polling mode.
 *
 * Usage: npm start
 *
 * Required env vars (see .env.example):
 *   TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_BOARD_ID,
 *   ANTHROPIC_API_KEY,
 *   GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO
 */
async function main() {
  const config = loadConfig();
  const orchestrator = new Orchestrator(config);

  // Graceful shutdown
  const shutdown = () => {
    console.log("\nShutting down...");
    orchestrator.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await orchestrator.start();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

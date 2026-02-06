import { loadConfig } from "./config/loader.js";
import { Orchestrator } from "./orchestrator/orchestrator.js";
import { AGENT_DEFINITIONS } from "./config/agents.js";

/**
 * CLI for interacting with the AI Marketing Agents system.
 *
 * Commands:
 *   run <cardId>  - Run a single task by Trello card ID
 *   poll          - Run one poll cycle (fetch + process tasks)
 *   status        - Show registered agents and their capabilities
 *   agents        - List all available agents
 */
async function cli() {
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case "run": {
      const cardId = args[0];
      if (!cardId) {
        console.error("Usage: agent:run <trello-card-id>");
        process.exit(1);
      }
      const config = loadConfig();
      const orchestrator = new Orchestrator(config);
      const result = await orchestrator.runSingle(cardId);
      console.log("\n--- Result ---");
      console.log(`Status: ${result.status}`);
      console.log(`Summary: ${result.summary}`);
      console.log(`Deliverable: ${result.deliverable.location}`);
      break;
    }

    case "poll": {
      const config = loadConfig();
      const orchestrator = new Orchestrator(config);
      // Initialize and run a single poll
      await orchestrator.start();
      orchestrator.stop();
      break;
    }

    case "status": {
      const config = loadConfig();
      const orchestrator = new Orchestrator(config);
      const status = orchestrator.getStatus();
      if (status.length === 0) {
        console.log("No tasks currently running.");
      } else {
        console.log("Running tasks:");
        for (const s of status) {
          console.log(
            `  - "${s.taskTitle}" by ${s.agent} (${Math.round(s.runningFor / 1000)}s)`
          );
        }
      }
      break;
    }

    case "agents": {
      console.log("Available AI Marketing Agents:\n");
      for (const agent of AGENT_DEFINITIONS) {
        console.log(`  [${agent.domain.toUpperCase()}] ${agent.name}`);
        console.log(`    ${agent.description}`);
        console.log(`    Capabilities: ${agent.capabilities.join(", ")}`);
        console.log();
      }
      break;
    }

    default:
      console.log(`AI Marketing Agents CLI

Usage:
  npm run agent:run <card-id>   Run a single Trello card
  npm run agent:poll            Run one poll cycle
  npm run agent:status          Show running tasks
  tsx src/cli.ts agents         List all agents

Start continuous mode:
  npm start                     Start polling Trello continuously
  npm run dev                   Start in watch mode (auto-restart)
`);
  }
}

cli().catch((err) => {
  console.error("CLI error:", err);
  process.exit(1);
});

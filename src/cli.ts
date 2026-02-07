import "dotenv/config";
import { loadConfig } from "./config/loader.js";
import { Orchestrator } from "./orchestrator/orchestrator.js";
import { AGENT_DEFINITIONS } from "./config/agents.js";
import type { AgentDomain, WorkflowStage } from "./config/types.js";
import { validateDomain, validateStage, validatePriority } from "./utils/validator.js";

/**
 * CLI for interacting with the AI Marketing Agents system.
 *
 * SECURITY patches applied:
 * - MOYENNE-02: All CLI inputs are validated against allowed values
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
      // Basic card ID validation (alphanumeric only)
      if (!/^[a-zA-Z0-9]+$/.test(cardId)) {
        console.error("Error: Invalid card ID format. Expected alphanumeric characters only.");
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

    case "create-card": {
      const title = args[0];
      if (!title) {
        console.error(
          "Usage: tsx src/cli.ts create-card <title> --domain <domain> --desc <description> [--priority <priority>] [--stage <stage>]"
        );
        process.exit(1);
      }

      const flags = parseFlags(args.slice(1));

      // MOYENNE-02: Validate all inputs against allowed values
      let domain: AgentDomain = "strategy";
      let priority: "low" | "medium" | "high" | "urgent" = "medium";
      let stage: WorkflowStage = "todo";
      try {
        domain = validateDomain(flags.domain ?? "strategy");
        priority = validatePriority(flags.priority ?? "medium");
        stage = validateStage(flags.stage ?? "todo");
      } catch (err) {
        console.error(`Validation error: ${err instanceof Error ? err.message : err}`);
        process.exit(1);
      }

      const description = flags.desc ?? flags.description ?? "";

      const config = loadConfig();
      const orchestrator = new Orchestrator(config);
      const result = await orchestrator.createCard({
        title,
        description,
        stage,
        targetDomain: domain,
        priority,
      });

      console.log("\n--- Card Created ---");
      console.log(`Title: ${result.title}`);
      console.log(`Domain: ${result.targetDomain}`);
      console.log(`Card ID: ${result.cardId}`);
      console.log(`URL: ${result.cardUrl}`);
      break;
    }

    case "generate": {
      const objective = args.join(" ");
      if (!objective) {
        console.error(
          "Usage: tsx src/cli.ts generate <objective>\n\nExample: tsx src/cli.ts generate \"Lancer une campagne de notoriété pour notre nouveau produit SaaS\""
        );
        process.exit(1);
      }

      const config = loadConfig();
      const orchestrator = new Orchestrator(config);

      console.log(`\nGenerating tasks for: "${objective}"...\n`);
      const { prompts, cards } = await orchestrator.generateAndCreateCards({
        objective,
      });

      console.log(`\n--- ${cards.length} Cards Created ---\n`);
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const prompt = prompts[i];
        console.log(`  [${card.targetDomain.toUpperCase()}] ${card.title}`);
        console.log(`    URL: ${card.cardUrl}`);
        if (prompt?.acceptanceCriteria.length) {
          console.log(`    Criteria: ${prompt.acceptanceCriteria.join(" | ")}`);
        }
        console.log();
      }
      break;
    }

    case "preview": {
      const objective = args.join(" ");
      if (!objective) {
        console.error(
          "Usage: tsx src/cli.ts preview <objective>\n\nPreview generated prompts without creating cards."
        );
        process.exit(1);
      }

      const config = loadConfig();
      const orchestrator = new Orchestrator(config);

      console.log(`\nGenerating prompts for: "${objective}"...\n`);
      const prompts = await orchestrator.generatePrompts({ objective });

      console.log(`--- ${prompts.length} Prompts Generated ---\n`);
      for (const prompt of prompts) {
        console.log(`═══════════════════════════════════════`);
        console.log(`Agent: ${prompt.targetDomain.toUpperCase()}`);
        console.log(`Title: ${prompt.title}`);
        console.log(`Deliverable: ${prompt.expectedDeliverable}`);
        console.log(`\nInstructions:\n${prompt.instructions}`);
        if (prompt.acceptanceCriteria.length) {
          console.log(`\nAcceptance Criteria:`);
          for (const c of prompt.acceptanceCriteria) {
            console.log(`  - ${c}`);
          }
        }
        console.log();
      }
      break;
    }

    default:
      console.log(`AI Marketing Agents CLI

Usage:
  npm run agent:run <card-id>                Run a single Trello card
  npm run agent:poll                         Run one poll cycle
  npm run agent:status                       Show running tasks

  tsx src/cli.ts agents                      List all agents
  tsx src/cli.ts create-card <title> [opts]  Create a Trello card
  tsx src/cli.ts generate <objective>        Generate prompts & create cards
  tsx src/cli.ts preview <objective>         Preview prompts (no creation)

Card creation options:
  --domain <domain>     Target agent domain (default: strategy)
                        Valid: seo, content, ads, analytics, social, email, brand, strategy
  --desc <description>  Card description
  --priority <level>    low | medium | high | urgent (default: medium)
  --stage <stage>       backlog | todo | in_progress | review | done (default: todo)

Start continuous mode:
  npm start                     Start polling Trello continuously
  npm run dev                   Start in watch mode (auto-restart)

Examples:
  tsx src/cli.ts create-card "Audit SEO du site" --domain seo --priority high
  tsx src/cli.ts generate "Lancer une campagne de notoriété pour notre produit SaaS"
  tsx src/cli.ts preview "Améliorer notre stratégie email marketing"
`);
  }
}

/** Parse --key value flags from args */
function parseFlags(args: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : "true";
      flags[key] = value;
      if (value !== "true") i++;
    }
  }
  return flags;
}

cli().catch((err) => {
  console.error("CLI error:", err instanceof Error ? err.message : err);
  process.exit(1);
});

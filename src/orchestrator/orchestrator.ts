import type {
  AgentDomain,
  AgentResult,
  AgentSystemConfig,
  MarketingTask,
  WorkflowStage,
} from "../config/types.js";
import { AGENT_MAP } from "../config/agents.js";
import { TrelloClient } from "../trello/client.js";
import { MarketingAgent } from "../agents/base-agent.js";
import { DeliverableManager } from "../deliverables/manager.js";

interface RunningTask {
  task: MarketingTask;
  agent: MarketingAgent;
  startedAt: Date;
}

/**
 * Central orchestrator that:
 * 1. Polls Trello for available tasks
 * 2. Assigns them to the right specialized agent
 * 3. Manages execution and concurrency
 * 4. Updates Trello with results
 * 5. Produces deliverables (docs, PRs, etc.)
 */
export class Orchestrator {
  private config: AgentSystemConfig;
  private trello: TrelloClient;
  private deliverables: DeliverableManager;
  private agents: Map<AgentDomain, MarketingAgent> = new Map();
  private running: Map<string, RunningTask> = new Map();
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: AgentSystemConfig) {
    this.config = config;
    this.trello = new TrelloClient(
      config.trello.apiKey,
      config.trello.token,
      config.trello.boardId
    );
    this.deliverables = new DeliverableManager(config.github);

    // Initialize all agents
    for (const [domain, definition] of AGENT_MAP) {
      this.agents.set(
        domain,
        new MarketingAgent(definition, config.anthropic.apiKey)
      );
    }
  }

  /** Start the orchestrator - initialize Trello and begin polling */
  async start(): Promise<void> {
    console.log("🚀 Starting AI Marketing Agents Orchestrator...");
    console.log(`   Agents loaded: ${this.agents.size}`);
    console.log(`   Max concurrent: ${this.config.maxConcurrentAgents}`);
    console.log(`   Poll interval: ${this.config.pollIntervalMs}ms`);

    await this.trello.initialize();
    console.log("✅ Trello board connected");

    // Run immediately, then poll
    await this.poll();

    this.pollTimer = setInterval(
      () => this.poll().catch(console.error),
      this.config.pollIntervalMs
    );

    console.log("✅ Orchestrator running. Waiting for tasks...");
  }

  /** Stop the orchestrator */
  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    console.log("⏹️ Orchestrator stopped");
  }

  /** Single poll cycle: fetch tasks, assign agents, process results */
  async poll(): Promise<void> {
    console.log(`\n[${new Date().toISOString()}] Polling for tasks...`);

    const availableSlots =
      this.config.maxConcurrentAgents - this.running.size;
    if (availableSlots <= 0) {
      console.log("   All agent slots occupied, skipping...");
      return;
    }

    const cards = await this.trello.getAvailableTasks();
    console.log(`   Found ${cards.length} tasks in Todo`);

    // Parse and prioritize
    const tasks = cards
      .map((card) => this.trello.parseCard(card))
      .filter((task) => !this.running.has(task.id))
      .sort((a, b) => {
        const priority = { urgent: 0, high: 1, medium: 2, low: 3 };
        return priority[a.priority] - priority[b.priority];
      });

    // Assign tasks to agents up to available slots
    const toProcess = tasks.slice(0, availableSlots);

    for (const task of toProcess) {
      await this.processTask(task);
    }
  }

  /** Process a single task: assign agent, execute, handle result */
  private async processTask(task: MarketingTask): Promise<void> {
    const agent = this.agents.get(task.domain);
    if (!agent) {
      console.warn(`   No agent found for domain: ${task.domain}`);
      return;
    }

    console.log(
      `   Assigning "${task.title}" to ${agent.definition.name}`
    );

    // Move to in_progress
    await this.trello.moveCard(task.trelloCardId, "in_progress");
    this.running.set(task.id, { task, agent, startedAt: new Date() });

    try {
      const result = await agent.execute(task);
      await this.handleResult(task, result);
    } catch (error) {
      await this.handleError(task, error);
    } finally {
      this.running.delete(task.id);
    }
  }

  /** Handle a successful agent result */
  private async handleResult(
    task: MarketingTask,
    result: AgentResult
  ): Promise<void> {
    console.log(
      `   ✅ Task "${task.title}" completed: ${result.status}`
    );

    // Produce the deliverable
    const deliverableUrl = await this.deliverables.produce(result.deliverable);

    // Update Trello
    const comment = `${result.trelloComment}\n\n📎 **Livrable** : ${deliverableUrl}`;
    await this.trello.addComment(task.trelloCardId, comment);

    // Add next steps as checklist
    const nextSteps = result.summary.includes("prochaines")
      ? [result.summary]
      : ["Relire le livrable", "Valider ou demander des modifications"];
    await this.trello.addChecklist(
      task.trelloCardId,
      "Prochaines étapes",
      nextSteps
    );

    // Move card to appropriate stage
    const targetStage: WorkflowStage =
      result.status === "needs_review" ? "review" : "done";
    await this.trello.moveCard(task.trelloCardId, targetStage);
  }

  /** Handle an agent error */
  private async handleError(
    task: MarketingTask,
    error: unknown
  ): Promise<void> {
    const message =
      error instanceof Error ? error.message : String(error);
    console.error(
      `   ❌ Task "${task.title}" failed: ${message}`
    );

    await this.trello.addComment(
      task.trelloCardId,
      `❌ **Erreur lors du traitement automatique**\n\n\`\`\`\n${message}\n\`\`\`\n\n*La carte a été remise dans Todo pour retraitement ou intervention manuelle.*`
    );

    // Move back to todo
    await this.trello.moveCard(task.trelloCardId, "todo");
  }

  /** Get current status of all running tasks */
  getStatus(): Array<{
    taskTitle: string;
    agent: string;
    runningFor: number;
  }> {
    return Array.from(this.running.values()).map((r) => ({
      taskTitle: r.task.title,
      agent: r.agent.definition.name,
      runningFor: Date.now() - r.startedAt.getTime(),
    }));
  }

  /** Run a single task by Trello card ID (manual trigger) */
  async runSingle(cardId: string): Promise<AgentResult> {
    await this.trello.initialize();
    const cards = await this.trello.getAllCards();
    const card = cards.find((c) => c.id === cardId);
    if (!card) throw new Error(`Card not found: ${cardId}`);

    const task = this.trello.parseCard(card);
    const agent = this.agents.get(task.domain);
    if (!agent) throw new Error(`No agent for domain: ${task.domain}`);

    await this.trello.moveCard(task.trelloCardId, "in_progress");

    try {
      const result = await agent.execute(task);
      await this.handleResult(task, result);
      return result;
    } catch (error) {
      await this.handleError(task, error);
      throw error;
    }
  }
}

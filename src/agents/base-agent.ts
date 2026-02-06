import type {
  AgentDefinition,
  AgentResult,
  Deliverable,
  MarketingTask,
} from "../config/types.js";

/**
 * Base class for all marketing agents.
 * Each agent uses Claude to process tasks within their domain of expertise.
 */
export class MarketingAgent {
  definition: AgentDefinition;
  private anthropicApiKey: string;

  constructor(definition: AgentDefinition, anthropicApiKey: string) {
    this.definition = definition;
    this.anthropicApiKey = anthropicApiKey;
  }

  /** Execute a marketing task and return the result */
  async execute(task: MarketingTask): Promise<AgentResult> {
    console.log(
      `[${this.definition.name}] Processing task: ${task.title}`
    );

    const prompt = this.buildPrompt(task);
    const response = await this.callClaude(prompt);
    const deliverable = this.parseDeliverable(task, response);

    return {
      taskId: task.id,
      domain: this.definition.domain,
      status: task.deliverableType === "review_request" ? "needs_review" : "success",
      deliverable,
      summary: this.extractSummary(response),
      trelloComment: this.buildTrelloComment(task, deliverable),
    };
  }

  /** Build the full prompt for Claude based on the task */
  private buildPrompt(task: MarketingTask): string {
    const contextBlock = Object.entries(task.context)
      .map(([k, v]) => `- **${k}**: ${v}`)
      .join("\n");

    return `# Tâche à réaliser

**Titre** : ${task.title}
**Priorité** : ${task.priority}
**Date limite** : ${task.dueDate ?? "Aucune"}
**Type de livrable attendu** : ${task.deliverableType}

## Description
${task.description}

${contextBlock ? `## Contexte additionnel\n${contextBlock}` : ""}

## Instructions
1. Analyse la tâche en détail
2. Produis le livrable demandé avec un contenu complet et actionnable
3. Structure ta réponse avec les sections suivantes :

### SUMMARY
Un résumé en 2-3 phrases de ce que tu as fait.

### DELIVERABLE_TITLE
Le titre du livrable.

### DELIVERABLE_CONTENT
Le contenu complet du livrable.

### NEXT_STEPS
Les prochaines étapes recommandées (liste à puces).
`;
  }

  /** Call the Claude API */
  private async callClaude(prompt: string): Promise<string> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: this.definition.systemPrompt,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text: string }>;
    };
    return data.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");
  }

  /** Parse Claude's response into a structured deliverable */
  private parseDeliverable(task: MarketingTask, response: string): Deliverable {
    const title = this.extractSection(response, "DELIVERABLE_TITLE") || task.title;
    const content = this.extractSection(response, "DELIVERABLE_CONTENT") || response;

    const slug = task.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const locationMap: Record<string, string> = {
      document: `deliverables/docs/${slug}.md`,
      pull_request: `feature/${slug}`,
      review_request: `review/${slug}`,
      report: `deliverables/reports/${slug}.md`,
      campaign_config: `deliverables/campaigns/${slug}.json`,
    };

    return {
      type: task.deliverableType,
      title,
      content,
      location: locationMap[task.deliverableType] ?? `deliverables/${slug}.md`,
      metadata: {
        agent: this.definition.name,
        domain: this.definition.domain,
        taskId: task.id,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  private extractSection(text: string, section: string): string {
    const regex = new RegExp(
      `###\\s*${section}\\s*\\n([\\s\\S]*?)(?=###|$)`,
      "i"
    );
    const match = regex.exec(text);
    return match?.[1]?.trim() ?? "";
  }

  private extractSummary(response: string): string {
    return this.extractSection(response, "SUMMARY") || "Tâche complétée.";
  }

  private buildTrelloComment(
    task: MarketingTask,
    deliverable: Deliverable
  ): string {
    return `🤖 **${this.definition.name}** a terminé cette tâche.

**Livrable** : ${deliverable.title}
**Type** : ${deliverable.type}
**Emplacement** : \`${deliverable.location}\`

---
*Traité automatiquement le ${new Date().toLocaleDateString("fr-FR")}*`;
  }
}

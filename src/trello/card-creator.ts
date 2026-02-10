import type {
  CardCreationRequest,
  CardCreationResult,
  GeneratedPrompt,
  AgentDomain,
} from "../config/types.js";
import { AGENT_MAP } from "../config/agents.js";
import { TrelloClient } from "./client.js";

/**
 * Service that creates Trello cards from agent requests or generated prompts.
 * This is the bridge between prompt generation and Trello board management.
 */
export class CardCreator {
  private trello: TrelloClient;

  constructor(trello: TrelloClient) {
    this.trello = trello;
  }

  /** Create a single Trello card from a direct request */
  async createFromRequest(
    request: CardCreationRequest
  ): Promise<CardCreationResult> {
    const description = this.buildCardDescription(request);

    // Resolve label IDs
    const labelIds: string[] = [];
    const domainLabel = this.findDomainLabel(request.targetDomain);
    if (domainLabel) labelIds.push(domainLabel);
    const priorityLabel = this.trello.findLabelId(request.priority);
    if (priorityLabel) labelIds.push(priorityLabel);

    const card = await this.trello.createCard(
      request.stage,
      request.title,
      description,
      {
        labelIds,
        dueDate: request.dueDate,
      }
    );

    // Add checklist if provided
    if (request.checklist?.length) {
      await this.trello.addChecklist(
        card.id,
        "Critères de validation",
        request.checklist
      );
    }

    // If there's a parent card, add a comment linking them
    if (request.parentCardId) {
      await this.trello.addComment(
        request.parentCardId,
        `➡️ Sous-tâche créée : **${request.title}**\nCarte : ${card.url}\nAgent cible : ${request.targetDomain}`
      );
      await this.trello.addComment(
        card.id,
        `⬆️ Carte parente : https://trello.com/c/${request.parentCardId}`
      );
    }

    console.log(
      `   🆕 Card created: "${request.title}" → ${request.targetDomain} (${request.stage})`
    );

    return {
      cardId: card.id,
      cardUrl: card.url,
      title: request.title,
      targetDomain: request.targetDomain,
    };
  }

  /** Create Trello cards from an array of generated prompts */
  async createFromPrompts(
    prompts: GeneratedPrompt[],
    parentCardId?: string
  ): Promise<CardCreationResult[]> {
    const results: CardCreationResult[] = [];

    for (const prompt of prompts) {
      const result = await this.createFromRequest({
        title: prompt.title,
        description: this.formatPromptAsDescription(prompt),
        stage: "review",
        targetDomain: prompt.targetDomain,
        priority: "medium",
        checklist: prompt.acceptanceCriteria,
        parentCardId,
      });
      results.push(result);
    }

    return results;
  }

  /** Format a generated prompt into a Trello card description */
  private formatPromptAsDescription(prompt: GeneratedPrompt): string {
    const contextBlock = Object.entries(prompt.context)
      .map(([k, v]) => `**${k}**: ${v}`)
      .join("\n");

    const criteriaBlock = prompt.acceptanceCriteria
      .map((c) => `- [ ] ${c}`)
      .join("\n");

    return `## Instructions

${prompt.instructions}

${contextBlock ? `## Contexte\n${contextBlock}\n` : ""}
## Type de livrable attendu
${prompt.expectedDeliverable}

## Critères d'acceptation
${criteriaBlock}

---
*Carte générée automatiquement par le système d'agents IA*`;
  }

  /** Build a card description from a creation request */
  private buildCardDescription(request: CardCreationRequest): string {
    return request.description;
  }

  /** Find the label ID for a domain based on the agent's configured color */
  private findDomainLabel(domain: AgentDomain): string | undefined {
    const agentDef = AGENT_MAP.get(domain);
    if (!agentDef) return undefined;

    // Try by domain name first, then by color
    return (
      this.trello.findLabelId(domain) ??
      this.trello.findLabelId(agentDef.trelloLabelColor)
    );
  }
}

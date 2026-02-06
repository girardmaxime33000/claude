import type {
  TrelloCard,
  TrelloList,
  TrelloLabel,
  WorkflowStage,
  MarketingTask,
  AgentDomain,
  DeliverableType,
} from "../config/types.js";

const TRELLO_API = "https://api.trello.com/1";

/**
 * Trello API client for managing marketing task boards.
 * Handles reading cards, moving between lists, adding comments, etc.
 */
export class TrelloClient {
  private apiKey: string;
  private token: string;
  private boardId: string;
  private listCache: Map<string, TrelloList> = new Map();
  private stageToListId: Map<WorkflowStage, string> = new Map();

  constructor(apiKey: string, token: string, boardId: string) {
    this.apiKey = apiKey;
    this.token = token;
    this.boardId = boardId;
  }

  private authParams(): string {
    return `key=${this.apiKey}&token=${this.token}`;
  }

  private async request<T>(
    path: string,
    method: string = "GET",
    body?: Record<string, unknown>
  ): Promise<T> {
    const separator = path.includes("?") ? "&" : "?";
    const url = `${TRELLO_API}${path}${separator}${this.authParams()}`;

    const options: RequestInit = {
      method,
      headers: { "Content-Type": "application/json" },
    };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(
        `Trello API error: ${response.status} ${response.statusText} on ${method} ${path}`
      );
    }
    return response.json() as Promise<T>;
  }

  /** Initialize list cache and stage mapping */
  async initialize(): Promise<void> {
    const lists = await this.request<TrelloList[]>(
      `/boards/${this.boardId}/lists`
    );

    this.listCache.clear();
    this.stageToListId.clear();

    for (const list of lists) {
      this.listCache.set(list.id, list);
      const stage = this.listNameToStage(list.name);
      if (stage) {
        this.stageToListId.set(stage, list.id);
      }
    }
  }

  /** Map a Trello list name to a workflow stage */
  private listNameToStage(name: string): WorkflowStage | null {
    const normalized = name.toLowerCase().trim();
    const mapping: Record<string, WorkflowStage> = {
      backlog: "backlog",
      "à faire": "todo",
      todo: "todo",
      "to do": "todo",
      "en cours": "in_progress",
      "in progress": "in_progress",
      "in_progress": "in_progress",
      review: "review",
      "en review": "review",
      "à valider": "review",
      done: "done",
      terminé: "done",
      fait: "done",
    };
    return mapping[normalized] ?? null;
  }

  /** Get list ID for a workflow stage */
  getListId(stage: WorkflowStage): string | undefined {
    return this.stageToListId.get(stage);
  }

  /** Get all cards in the "todo" list (available for agents to pick up) */
  async getAvailableTasks(): Promise<TrelloCard[]> {
    const todoListId = this.stageToListId.get("todo");
    if (!todoListId) {
      throw new Error("No 'Todo' list found on the board");
    }
    return this.request<TrelloCard[]>(
      `/lists/${todoListId}/cards?fields=id,name,desc,idList,labels,due,idMembers,url`
    );
  }

  /** Get all cards on the board */
  async getAllCards(): Promise<TrelloCard[]> {
    return this.request<TrelloCard[]>(
      `/boards/${this.boardId}/cards?fields=id,name,desc,idList,labels,due,idMembers,url`
    );
  }

  /** Move a card to a different workflow stage */
  async moveCard(cardId: string, stage: WorkflowStage): Promise<void> {
    const listId = this.stageToListId.get(stage);
    if (!listId) {
      throw new Error(`No list found for stage: ${stage}`);
    }
    await this.request(`/cards/${cardId}`, "PUT", { idList: listId });
  }

  /** Add a comment to a card */
  async addComment(cardId: string, text: string): Promise<void> {
    await this.request(`/cards/${cardId}/actions/comments`, "POST", {
      text,
    });
  }

  /** Add a checklist to a card */
  async addChecklist(
    cardId: string,
    name: string,
    items: string[]
  ): Promise<void> {
    const checklist = await this.request<{ id: string }>(
      `/cards/${cardId}/checklists`,
      "POST",
      { name }
    );
    for (const item of items) {
      await this.request(`/checklists/${checklist.id}/checkItems`, "POST", {
        name: item,
      });
    }
  }

  /** Update card description */
  async updateDescription(cardId: string, desc: string): Promise<void> {
    await this.request(`/cards/${cardId}`, "PUT", { desc });
  }

  /** Parse a Trello card into an internal MarketingTask */
  parseCard(card: TrelloCard): MarketingTask {
    const domain = this.detectDomain(card);
    const stage = this.detectStage(card.idList);
    const priority = this.detectPriority(card);
    const deliverableType = this.detectDeliverableType(card);
    const context = this.extractContext(card);

    return {
      id: `task_${card.id}`,
      title: card.name,
      description: card.desc,
      domain,
      stage,
      priority,
      trelloCardId: card.id,
      trelloCardUrl: card.url,
      dueDate: card.due,
      context,
      deliverableType,
    };
  }

  /** Detect domain from card labels */
  private detectDomain(card: TrelloCard): AgentDomain {
    const labelMap: Record<string, AgentDomain> = {
      seo: "seo",
      référencement: "seo",
      content: "content",
      contenu: "content",
      rédaction: "content",
      ads: "ads",
      publicité: "ads",
      "paid media": "ads",
      analytics: "analytics",
      data: "analytics",
      social: "social",
      "réseaux sociaux": "social",
      email: "email",
      emailing: "email",
      crm: "email",
      brand: "brand",
      marque: "brand",
      strategy: "strategy",
      stratégie: "strategy",
    };

    for (const label of card.labels) {
      const key = label.name.toLowerCase();
      if (labelMap[key]) return labelMap[key];
    }

    // Fallback: detect from card name/description
    const text = `${card.name} ${card.desc}`.toLowerCase();
    for (const [keyword, domain] of Object.entries(labelMap)) {
      if (text.includes(keyword)) return domain;
    }

    return "strategy"; // default
  }

  private detectStage(listId: string): WorkflowStage {
    const list = this.listCache.get(listId);
    if (!list) return "todo";
    return this.listNameToStage(list.name) ?? "todo";
  }

  private detectPriority(
    card: TrelloCard
  ): "low" | "medium" | "high" | "urgent" {
    for (const label of card.labels) {
      const name = label.name.toLowerCase();
      if (name.includes("urgent")) return "urgent";
      if (name.includes("high") || name.includes("prioritaire")) return "high";
      if (name.includes("low") || name.includes("bas")) return "low";
    }
    // If has a due date soon, increase priority
    if (card.due) {
      const daysUntilDue =
        (new Date(card.due).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysUntilDue < 1) return "urgent";
      if (daysUntilDue < 3) return "high";
    }
    return "medium";
  }

  private detectDeliverableType(card: TrelloCard): DeliverableType {
    const text = `${card.name} ${card.desc}`.toLowerCase();
    if (text.includes("pull request") || text.includes("pr") || text.includes("code"))
      return "pull_request";
    if (text.includes("review") || text.includes("valider"))
      return "review_request";
    if (text.includes("rapport") || text.includes("report") || text.includes("analyse"))
      return "report";
    if (text.includes("campagne") || text.includes("campaign"))
      return "campaign_config";
    return "document";
  }

  private extractContext(card: TrelloCard): Record<string, string> {
    const context: Record<string, string> = {};
    // Extract key-value pairs from description (format: **Key**: Value)
    const regex = /\*\*([^*]+)\*\*\s*:\s*(.+)/g;
    let match;
    while ((match = regex.exec(card.desc)) !== null) {
      context[match[1].trim().toLowerCase()] = match[2].trim();
    }
    return context;
  }

  /** Create a new card on the board */
  async createCard(
    listStage: WorkflowStage,
    name: string,
    desc: string,
    labelIds?: string[]
  ): Promise<TrelloCard> {
    const listId = this.stageToListId.get(listStage);
    if (!listId) throw new Error(`No list for stage ${listStage}`);

    return this.request<TrelloCard>("/cards", "POST", {
      idList: listId,
      name,
      desc,
      idLabels: labelIds ?? [],
    });
  }
}

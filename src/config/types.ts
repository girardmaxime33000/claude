// ============================================================
// Core Types for AI Marketing Agents System
// ============================================================

/** Marketing domains handled by specialized agents */
export type AgentDomain =
  | "seo"
  | "content"
  | "ads"
  | "analytics"
  | "social"
  | "email"
  | "brand"
  | "strategy";

/** Trello list names mapping to workflow stages */
export type WorkflowStage =
  | "backlog"
  | "todo"
  | "in_progress"
  | "review"
  | "done";

/** A task as represented in Trello */
export interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  idList: string;
  labels: TrelloLabel[];
  due: string | null;
  idMembers: string[];
  url: string;
  customFieldItems?: CustomFieldItem[];
}

export interface TrelloLabel {
  id: string;
  name: string;
  color: string;
}

export interface TrelloList {
  id: string;
  name: string;
}

export interface CustomFieldItem {
  idCustomField: string;
  value: { text?: string; number?: string; checked?: string };
}

/** Internal task representation parsed from Trello */
export interface MarketingTask {
  id: string;
  title: string;
  description: string;
  domain: AgentDomain;
  stage: WorkflowStage;
  priority: "low" | "medium" | "high" | "urgent";
  trelloCardId: string;
  trelloCardUrl: string;
  dueDate: string | null;
  context: Record<string, string>;
  deliverableType: DeliverableType;
}

/** Types of deliverables an agent can produce */
export type DeliverableType =
  | "document"
  | "pull_request"
  | "review_request"
  | "report"
  | "campaign_config";

/** Result produced by an agent after completing a task */
export interface AgentResult {
  taskId: string;
  domain: AgentDomain;
  status: "success" | "needs_review" | "failed";
  deliverable: Deliverable;
  summary: string;
  trelloComment: string;
}

export interface Deliverable {
  type: DeliverableType;
  title: string;
  content: string;
  /** File path for docs, branch name for PRs */
  location: string;
  metadata: Record<string, string>;
}

/** Configuration for the agent system */
export interface AgentSystemConfig {
  trello: {
    apiKey: string;
    token: string;
    boardId: string;
  };
  anthropic: {
    apiKey: string;
  };
  github: {
    token: string;
    owner: string;
    repo: string;
  };
  pollIntervalMs: number;
  maxConcurrentAgents: number;
  autoAssign: boolean;
}

/** Agent definition */
export interface AgentDefinition {
  domain: AgentDomain;
  name: string;
  description: string;
  systemPrompt: string;
  capabilities: string[];
  trelloLabelColor: string;
}

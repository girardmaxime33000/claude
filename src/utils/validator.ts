// ============================================================
// Input Validation Utilities
// Addresses: MOYENNE-02 (CLI validation), MOYENNE-04 (domain validation)
// ============================================================

import type { AgentDomain, WorkflowStage, DeliverableType } from "../config/types.js";

const VALID_DOMAINS: ReadonlySet<string> = new Set<AgentDomain>([
  "seo", "content", "ads", "analytics", "social", "email", "brand", "strategy",
]);

const VALID_STAGES: ReadonlySet<string> = new Set<WorkflowStage>([
  "backlog", "todo", "in_progress", "review", "done",
]);

const VALID_PRIORITIES: ReadonlySet<string> = new Set([
  "low", "medium", "high", "urgent",
]);

const VALID_DELIVERABLE_TYPES: ReadonlySet<string> = new Set<DeliverableType>([
  "document", "pull_request", "review_request", "report", "campaign_config",
]);

export function isValidDomain(value: string): value is AgentDomain {
  return VALID_DOMAINS.has(value);
}

export function isValidStage(value: string): value is WorkflowStage {
  return VALID_STAGES.has(value);
}

export function isValidPriority(value: string): value is "low" | "medium" | "high" | "urgent" {
  return VALID_PRIORITIES.has(value);
}

export function isValidDeliverableType(value: string): value is DeliverableType {
  return VALID_DELIVERABLE_TYPES.has(value);
}

/**
 * Validate and return a domain, or throw with a helpful message.
 */
export function validateDomain(value: string): AgentDomain {
  if (isValidDomain(value)) return value;
  throw new Error(
    `Invalid domain "${value}". Valid domains: ${[...VALID_DOMAINS].join(", ")}`
  );
}

export function validateStage(value: string): WorkflowStage {
  if (isValidStage(value)) return value;
  throw new Error(
    `Invalid stage "${value}". Valid stages: ${[...VALID_STAGES].join(", ")}`
  );
}

export function validatePriority(value: string): "low" | "medium" | "high" | "urgent" {
  if (isValidPriority(value)) return value;
  throw new Error(
    `Invalid priority "${value}". Valid priorities: ${[...VALID_PRIORITIES].join(", ")}`
  );
}

export function validateDeliverableType(value: string): DeliverableType {
  if (isValidDeliverableType(value)) return value;
  throw new Error(
    `Invalid deliverable type "${value}". Valid types: ${[...VALID_DELIVERABLE_TYPES].join(", ")}`
  );
}

// ============================================================
// Delegation limits (CRITIQUE-04)
// ============================================================

/** Maximum number of sub-tasks an agent can create per execution. */
export const MAX_DELEGATIONS_PER_TASK = 5;

/** Maximum delegation depth (agent → sub-agent → sub-sub-agent). */
export const MAX_DELEGATION_DEPTH = 2;

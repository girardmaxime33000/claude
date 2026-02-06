import type { AgentSystemConfig } from "./types.js";

/**
 * Load configuration from environment variables.
 * Call this at startup.
 */
export function loadConfig(): AgentSystemConfig {
  function required(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }

  function optional(key: string, defaultValue: string): string {
    return process.env[key] ?? defaultValue;
  }

  return {
    trello: {
      apiKey: required("TRELLO_API_KEY"),
      token: required("TRELLO_TOKEN"),
      boardId: required("TRELLO_BOARD_ID"),
    },
    anthropic: {
      apiKey: required("ANTHROPIC_API_KEY"),
    },
    github: {
      token: required("GITHUB_TOKEN"),
      owner: required("GITHUB_OWNER"),
      repo: required("GITHUB_REPO"),
    },
    umami: process.env.UMAMI_API_KEY
      ? {
          apiKey: required("UMAMI_API_KEY"),
          apiEndpoint: process.env.UMAMI_API_ENDPOINT,
          websiteId: required("UMAMI_WEBSITE_ID"),
          timezone: process.env.UMAMI_TIMEZONE,
        }
      : undefined,
    pollIntervalMs: parseInt(optional("POLL_INTERVAL_MS", "30000"), 10),
    maxConcurrentAgents: parseInt(optional("MAX_CONCURRENT_AGENTS", "3"), 10),
    autoAssign: optional("AUTO_ASSIGN", "true") === "true",
  };
}

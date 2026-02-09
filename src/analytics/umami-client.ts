// ============================================================
// Umami Analytics API Client — Direct HTTP (no third-party dependency)
// Auth: x-umami-api-key header (Umami Cloud API Key)
// Docs: https://umami.is/docs/api
// ============================================================

import type {
  UmamiConfig,
  UmamiStats,
  UmamiPageviewsResponse,
  UmamiMetric,
  UmamiEventMetric,
  UmamiMetricType,
  UmamiDateRange,
} from "./types.js";

const DEFAULT_API_ENDPOINT = "https://api.umami.is/v1";
const REQUEST_TIMEOUT_MS = 15_000;

export class UmamiClient {
  private baseUrl: string;
  private apiKey: string;
  private websiteId: string;
  private timezone: string;

  constructor(config: UmamiConfig) {
    this.baseUrl = (config.apiEndpoint ?? DEFAULT_API_ENDPOINT).replace(/\/+$/, "");
    this.apiKey = config.apiKey;
    this.websiteId = config.websiteId;
    this.timezone = config.timezone ?? "UTC";
  }

  // ----- Low-level HTTP -----

  private async request<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "x-umami-api-key": this.apiKey,
          "Accept": "application/json",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(
          `Umami API ${response.status} ${response.statusText} on ${path}: ${body.slice(0, 300)}`
        );
      }

      return (await response.json()) as T;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error(`Umami API timeout after ${REQUEST_TIMEOUT_MS}ms on ${path}`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  // ----- Stats -----

  async getStats(range: UmamiDateRange): Promise<UmamiStats> {
    return this.request<UmamiStats>(
      `/websites/${this.websiteId}/stats`,
      { startAt: range.startAt, endAt: range.endAt },
    );
  }

  // ----- Pageviews -----

  async getPageviews(
    range: UmamiDateRange,
    unit: "hour" | "day" | "month" | "year" = "day",
  ): Promise<UmamiPageviewsResponse> {
    return this.request<UmamiPageviewsResponse>(
      `/websites/${this.websiteId}/pageviews`,
      { startAt: range.startAt, endAt: range.endAt, unit, timezone: this.timezone },
    );
  }

  // ----- Metrics -----

  async getMetrics(
    range: UmamiDateRange,
    type: UmamiMetricType,
    limit = 10,
  ): Promise<UmamiMetric[]> {
    return this.request<UmamiMetric[]>(
      `/websites/${this.websiteId}/metrics`,
      { startAt: range.startAt, endAt: range.endAt, type, limit },
    );
  }

  // ----- Events -----

  async getEvents(
    range: UmamiDateRange,
    unit: "hour" | "day" | "month" | "year" = "day",
  ): Promise<UmamiEventMetric[]> {
    return this.request<UmamiEventMetric[]>(
      `/websites/${this.websiteId}/events`,
      { startAt: range.startAt, endAt: range.endAt, unit, timezone: this.timezone },
    );
  }

  // ----- Active Visitors -----

  async getActiveVisitors(): Promise<number> {
    const result = await this.request<{ x: number }>(
      `/websites/${this.websiteId}/active`,
    );
    return result.x;
  }

  // ----- Convenience methods -----

  async getTopPages(range: UmamiDateRange, limit = 10): Promise<UmamiMetric[]> {
    return this.getMetrics(range, "url", limit);
  }

  async getTopReferrers(range: UmamiDateRange, limit = 10): Promise<UmamiMetric[]> {
    return this.getMetrics(range, "referrer", limit);
  }

  async getTopCountries(range: UmamiDateRange, limit = 10): Promise<UmamiMetric[]> {
    return this.getMetrics(range, "country", limit);
  }

  async getTopBrowsers(range: UmamiDateRange, limit = 10): Promise<UmamiMetric[]> {
    return this.getMetrics(range, "browser", limit);
  }

  async getTopDevices(range: UmamiDateRange, limit = 10): Promise<UmamiMetric[]> {
    return this.getMetrics(range, "device", limit);
  }

  async getTopOS(range: UmamiDateRange, limit = 10): Promise<UmamiMetric[]> {
    return this.getMetrics(range, "os", limit);
  }
}

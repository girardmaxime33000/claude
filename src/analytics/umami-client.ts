// ============================================================
// Umami Analytics API Client (Cloud API Key auth)
// ============================================================

import { UmamiApiClient } from "@umami/api-client";
import type {
  UmamiConfig,
  UmamiStats,
  UmamiPageviewsResponse,
  UmamiMetric,
  UmamiEventMetric,
  UmamiActive,
  UmamiMetricType,
  UmamiDateRange,
} from "./types.js";

const DEFAULT_API_ENDPOINT = "https://api.umami.is/v1";

export class UmamiClient {
  private api: UmamiApiClient;
  private websiteId: string;
  private timezone: string;

  constructor(config: UmamiConfig) {
    this.api = new UmamiApiClient({
      apiEndpoint: config.apiEndpoint ?? DEFAULT_API_ENDPOINT,
      apiKey: config.apiKey,
    });
    this.websiteId = config.websiteId;
    this.timezone = config.timezone ?? "UTC";
  }

  /**
   * Get website stats (pageviews, visitors, visits, bounces, totaltime)
   * with comparison to previous period.
   */
  async getStats(range: UmamiDateRange): Promise<UmamiStats> {
    const result = await this.api.getWebsiteStats(this.websiteId, {
      startAt: range.startAt,
      endAt: range.endAt,
    });
    if (!result.ok) {
      throw new Error(`Failed to get stats: ${result.error ?? result.status}`);
    }
    return result.data as UmamiStats;
  }

  /**
   * Get pageviews and sessions over time (grouped by unit: hour, day, month, year).
   */
  async getPageviews(
    range: UmamiDateRange,
    unit: "hour" | "day" | "month" | "year" = "day",
  ): Promise<UmamiPageviewsResponse> {
    const result = await this.api.getWebsitePageviews(this.websiteId, {
      startAt: range.startAt,
      endAt: range.endAt,
      unit,
      timezone: this.timezone,
    });
    if (!result.ok) {
      throw new Error(`Failed to get pageviews: ${result.error ?? result.status}`);
    }
    return result.data as unknown as UmamiPageviewsResponse;
  }

  /**
   * Get metrics by type (url, referrer, browser, os, device, country, language, event).
   */
  async getMetrics(
    range: UmamiDateRange,
    type: UmamiMetricType,
    limit = 10,
  ): Promise<UmamiMetric[]> {
    const result = await this.api.getWebsiteMetrics(this.websiteId, {
      startAt: range.startAt,
      endAt: range.endAt,
      type,
      limit,
    });
    if (!result.ok) {
      throw new Error(`Failed to get metrics: ${result.error ?? result.status}`);
    }
    return (result.data as unknown as { data: UmamiMetric[] }).data ?? (result.data as unknown as UmamiMetric[]);
  }

  /**
   * Get event metrics.
   */
  async getEvents(
    range: UmamiDateRange,
    unit: "hour" | "day" | "month" | "year" = "day",
  ): Promise<UmamiEventMetric[]> {
    const result = await this.api.getEventMetrics(this.websiteId, {
      startAt: String(range.startAt),
      endAt: String(range.endAt),
      unit,
      timezone: this.timezone,
    });
    if (!result.ok) {
      throw new Error(`Failed to get events: ${result.error ?? result.status}`);
    }
    return result.data as unknown as UmamiEventMetric[];
  }

  /**
   * Get current active visitors count.
   */
  async getActiveVisitors(): Promise<number> {
    const result = await this.api.getWebsiteActive(this.websiteId);
    if (!result.ok) {
      throw new Error(`Failed to get active visitors: ${result.error ?? result.status}`);
    }
    return (result.data as UmamiActive).x;
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

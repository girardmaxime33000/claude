// ============================================================
// Unified Analytics Service — wraps Umami API
// ============================================================

import { UmamiClient } from "./umami-client.js";
import type { UmamiConfig, UmamiDateRange, UmamiStats, AnalyticsSummary } from "./types.js";

export class AnalyticsService {
  public readonly umami: UmamiClient;

  constructor(config: UmamiConfig) {
    this.umami = new UmamiClient(config);
  }

  /**
   * Generate a full analytics summary for a date range.
   */
  async getSummary(range: UmamiDateRange): Promise<AnalyticsSummary> {
    const [rawStats, topPages, topReferrers, topCountries, topBrowsers, topDevices, topEvents] =
      await Promise.all([
        this.umami.getStats(range),
        this.umami.getTopPages(range, 10),
        this.umami.getTopReferrers(range, 10),
        this.umami.getTopCountries(range, 10),
        this.umami.getTopBrowsers(range, 10),
        this.umami.getTopDevices(range, 10),
        this.umami.getEvents(range),
      ]);

    console.log("[AnalyticsService] Raw stats:", JSON.stringify(rawStats).slice(0, 500));
    console.log("[AnalyticsService] Raw topPages:", JSON.stringify(topPages).slice(0, 300));

    // Normalize stats to handle different Umami API response formats
    const stats = AnalyticsService.normalizeStats(rawStats);

    return {
      stats,
      topPages: Array.isArray(topPages) ? topPages : [],
      topReferrers: Array.isArray(topReferrers) ? topReferrers : [],
      topCountries: Array.isArray(topCountries) ? topCountries : [],
      topBrowsers: Array.isArray(topBrowsers) ? topBrowsers : [],
      topDevices: Array.isArray(topDevices) ? topDevices : [],
      topEvents: Array.isArray(topEvents) ? topEvents : [],
      period: range,
    };
  }

  /**
   * Normalize stats response from Umami API.
   * Handles multiple response shapes:
   * - { pageviews: { value: N, prev: M } }
   * - { pageviews: { value: N, change: M } }
   * - { pageviews: N }  (flat numbers)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static normalizeStats(raw: any): UmamiStats {
    const norm = (field: unknown): { value: number; prev: number } => {
      if (field === null || field === undefined) return { value: 0, prev: 0 };
      if (typeof field === "number") return { value: field, prev: 0 };
      if (typeof field === "object") {
        const obj = field as Record<string, unknown>;
        const value = typeof obj.value === "number" ? obj.value : 0;
        const prev = typeof obj.prev === "number" ? obj.prev
          : typeof obj.change === "number" ? obj.change : 0;
        return { value, prev };
      }
      return { value: 0, prev: 0 };
    };
    return {
      pageviews: norm(raw?.pageviews),
      visitors: norm(raw?.visitors),
      visits: norm(raw?.visits),
      bounces: norm(raw?.bounces),
      totaltime: norm(raw?.totaltime),
    };
  }

  /**
   * Helper: create a date range from "days ago" to now.
   */
  static daysAgo(days: number): UmamiDateRange {
    const now = Date.now();
    return {
      startAt: now - days * 24 * 60 * 60 * 1000,
      endAt: now,
    };
  }

  /**
   * Format a summary into a human-readable markdown report.
   */
  static formatSummaryAsMarkdown(summary: AnalyticsSummary): string {
    const lines: string[] = [];
    const start = new Date(summary.period.startAt).toISOString().split("T")[0];
    const end = new Date(summary.period.endAt).toISOString().split("T")[0];

    lines.push(`# Umami Analytics Report`);
    lines.push(`**Period:** ${start} — ${end}`);
    lines.push("");

    // Global stats
    const s = summary.stats;
    const visits = s.visits.value;
    const bounceRate = visits > 0
      ? ((s.bounces.value / visits) * 100).toFixed(1)
      : "0.0";
    const avgTime = visits > 0
      ? (s.totaltime.value / visits).toFixed(0)
      : "0";

    lines.push("## Overview");
    lines.push("");
    lines.push(`| Metric | Current | Previous |`);
    lines.push(`|--------|---------|----------|`);
    lines.push(`| Page Views | ${s.pageviews.value.toLocaleString()} | ${s.pageviews.prev.toLocaleString()} |`);
    lines.push(`| Visitors | ${s.visitors.value.toLocaleString()} | ${s.visitors.prev.toLocaleString()} |`);
    lines.push(`| Visits | ${s.visits.value.toLocaleString()} | ${s.visits.prev.toLocaleString()} |`);
    lines.push(`| Bounces | ${s.bounces.value.toLocaleString()} | ${s.bounces.prev.toLocaleString()} |`);
    lines.push(`| Bounce Rate | ${bounceRate}% | — |`);
    lines.push(`| Avg Visit Time | ${avgTime}s | — |`);
    lines.push("");

    // Top pages
    if (summary.topPages.length > 0) {
      lines.push("## Top Pages");
      lines.push("");
      lines.push(`| URL | Views |`);
      lines.push(`|-----|-------|`);
      for (const p of summary.topPages) {
        lines.push(`| ${p.x} | ${p.y.toLocaleString()} |`);
      }
      lines.push("");
    }

    // Top referrers
    if (summary.topReferrers.length > 0) {
      lines.push("## Top Referrers");
      lines.push("");
      lines.push(`| Referrer | Visits |`);
      lines.push(`|----------|--------|`);
      for (const r of summary.topReferrers) {
        lines.push(`| ${r.x || "(direct)"} | ${r.y.toLocaleString()} |`);
      }
      lines.push("");
    }

    // Top countries
    if (summary.topCountries.length > 0) {
      lines.push("## Top Countries");
      lines.push("");
      lines.push(`| Country | Visitors |`);
      lines.push(`|---------|----------|`);
      for (const c of summary.topCountries) {
        lines.push(`| ${c.x} | ${c.y.toLocaleString()} |`);
      }
      lines.push("");
    }

    // Top browsers
    if (summary.topBrowsers.length > 0) {
      lines.push("## Top Browsers");
      lines.push("");
      lines.push(`| Browser | Visitors |`);
      lines.push(`|---------|----------|`);
      for (const b of summary.topBrowsers) {
        lines.push(`| ${b.x} | ${b.y.toLocaleString()} |`);
      }
      lines.push("");
    }

    // Top devices
    if (summary.topDevices.length > 0) {
      lines.push("## Top Devices");
      lines.push("");
      lines.push(`| Device | Visitors |`);
      lines.push(`|--------|----------|`);
      for (const d of summary.topDevices) {
        lines.push(`| ${d.x} | ${d.y.toLocaleString()} |`);
      }
    }

    return lines.join("\n");
  }
}

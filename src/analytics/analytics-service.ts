// ============================================================
// Unified Analytics Facade — combines GA4 + Search Console
// ============================================================

import { GA4Client } from "./ga4-client.js";
import { SearchConsoleClient } from "./search-console-client.js";
import type { GoogleAuthConfig, AnalyticsSummary } from "./types.js";

export interface AnalyticsConfig {
  auth: GoogleAuthConfig;
  /** GA4 property ID (numeric) */
  ga4PropertyId: string;
  /** Search Console site URL (e.g. "https://example.com" or "sc-domain:example.com") */
  searchConsoleSiteUrl: string;
}

export class AnalyticsService {
  public readonly ga4: GA4Client;
  public readonly searchConsole: SearchConsoleClient;
  private readonly propertyId: string;
  private readonly siteUrl: string;

  constructor(config: AnalyticsConfig) {
    this.ga4 = new GA4Client(config.auth);
    this.searchConsole = new SearchConsoleClient(config.auth);
    this.propertyId = config.ga4PropertyId;
    this.siteUrl = config.searchConsoleSiteUrl;
  }

  /**
   * Generate a full analytics summary combining GA4 and Search Console data.
   */
  async getSummary(startDate: string, endDate: string): Promise<AnalyticsSummary> {
    const [keyMetrics, topPages, topCountries, topQueries, topSearchPages] =
      await Promise.all([
        this.ga4.getKeyMetrics(this.propertyId, startDate, endDate),
        this.ga4.getTopPages(this.propertyId, startDate, endDate, 10),
        this.ga4.getTopCountries(this.propertyId, startDate, endDate, 10),
        this.searchConsole.getTopQueries(this.siteUrl, startDate, endDate, 10),
        this.searchConsole.getTopPages(this.siteUrl, startDate, endDate, 10),
      ]);

    const scTotals = topQueries.reduce(
      (acc, q) => {
        acc.clicks += q.clicks;
        acc.impressions += q.impressions;
        return acc;
      },
      { clicks: 0, impressions: 0 },
    );

    const averageCtr =
      scTotals.impressions > 0 ? scTotals.clicks / scTotals.impressions : 0;
    const averagePosition =
      topQueries.length > 0
        ? topQueries.reduce((sum, q) => sum + q.position, 0) / topQueries.length
        : 0;

    return {
      ga4: {
        sessions: keyMetrics.sessions,
        activeUsers: keyMetrics.activeUsers,
        pageViews: keyMetrics.pageViews,
        avgSessionDuration: keyMetrics.avgSessionDuration,
        bounceRate: keyMetrics.bounceRate,
        topPages,
        topCountries,
      },
      searchConsole: {
        totalClicks: scTotals.clicks,
        totalImpressions: scTotals.impressions,
        averageCtr,
        averagePosition,
        topQueries,
        topPages: topSearchPages,
      },
      period: { startDate, endDate },
    };
  }

  /**
   * Format a summary into a human-readable markdown report.
   */
  static formatSummaryAsMarkdown(summary: AnalyticsSummary): string {
    const lines: string[] = [];

    lines.push(`# Analytics Report`);
    lines.push(`**Period:** ${summary.period.startDate} — ${summary.period.endDate}`);
    lines.push("");

    // GA4 section
    lines.push("## Google Analytics (GA4)");
    lines.push("");
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Sessions | ${summary.ga4.sessions.toLocaleString()} |`);
    lines.push(`| Active Users | ${summary.ga4.activeUsers.toLocaleString()} |`);
    lines.push(`| Page Views | ${summary.ga4.pageViews.toLocaleString()} |`);
    lines.push(`| Avg Session Duration | ${summary.ga4.avgSessionDuration.toFixed(1)}s |`);
    lines.push(`| Bounce Rate | ${(summary.ga4.bounceRate * 100).toFixed(1)}% |`);
    lines.push("");

    lines.push("### Top Pages");
    lines.push("");
    lines.push(`| Page | Views |`);
    lines.push(`|------|-------|`);
    for (const p of summary.ga4.topPages) {
      lines.push(`| ${p.path} | ${p.views.toLocaleString()} |`);
    }
    lines.push("");

    lines.push("### Top Countries");
    lines.push("");
    lines.push(`| Country | Users |`);
    lines.push(`|---------|-------|`);
    for (const c of summary.ga4.topCountries) {
      lines.push(`| ${c.country} | ${c.users.toLocaleString()} |`);
    }
    lines.push("");

    // Search Console section
    lines.push("## Google Search Console");
    lines.push("");
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Total Clicks | ${summary.searchConsole.totalClicks.toLocaleString()} |`);
    lines.push(`| Total Impressions | ${summary.searchConsole.totalImpressions.toLocaleString()} |`);
    lines.push(`| Average CTR | ${(summary.searchConsole.averageCtr * 100).toFixed(2)}% |`);
    lines.push(`| Average Position | ${summary.searchConsole.averagePosition.toFixed(1)} |`);
    lines.push("");

    lines.push("### Top Queries");
    lines.push("");
    lines.push(`| Query | Clicks | Impressions | CTR | Position |`);
    lines.push(`|-------|--------|-------------|-----|----------|`);
    for (const q of summary.searchConsole.topQueries) {
      lines.push(
        `| ${q.query} | ${q.clicks} | ${q.impressions} | ${(q.ctr * 100).toFixed(2)}% | ${q.position.toFixed(1)} |`,
      );
    }
    lines.push("");

    lines.push("### Top Pages (Search)");
    lines.push("");
    lines.push(`| Page | Clicks | Impressions | CTR | Position |`);
    lines.push(`|------|--------|-------------|-----|----------|`);
    for (const p of summary.searchConsole.topPages) {
      lines.push(
        `| ${p.page} | ${p.clicks} | ${p.impressions} | ${(p.ctr * 100).toFixed(2)}% | ${p.position.toFixed(1)} |`,
      );
    }

    return lines.join("\n");
  }
}

// ============================================================
// Google Analytics GA4 Data API Client
// ============================================================

import { BetaAnalyticsDataClient } from "@google-analytics/data";
import type { GoogleAuthConfig } from "./types.js";
import type {
  GA4ReportRequest,
  GA4ReportResponse,
  GA4ReportRow,
  GA4RealtimeRequest,
} from "./types.js";
import { readFileSync } from "node:fs";

export class GA4Client {
  private client: BetaAnalyticsDataClient;

  constructor(authConfig: GoogleAuthConfig) {
    if (authConfig.serviceAccountKeyPath) {
      const keyFile = JSON.parse(
        readFileSync(authConfig.serviceAccountKeyPath, "utf-8"),
      );
      this.client = new BetaAnalyticsDataClient({
        credentials: {
          client_email: keyFile.client_email,
          private_key: keyFile.private_key,
        },
      });
    } else if (authConfig.clientEmail && authConfig.privateKey) {
      this.client = new BetaAnalyticsDataClient({
        credentials: {
          client_email: authConfig.clientEmail,
          private_key: authConfig.privateKey,
        },
      });
    } else {
      throw new Error(
        "GA4Client requires serviceAccountKeyPath or clientEmail+privateKey",
      );
    }
  }

  /**
   * Parse response rows into typed GA4ReportRow array.
   */
  private parseRows(response: {
    rows?: Array<{
      dimensionValues?: Array<{ value?: string | null }> | null;
      metricValues?: Array<{ value?: string | null }> | null;
    }> | null;
    dimensionHeaders?: Array<{ name?: string | null }> | null;
    metricHeaders?: Array<{ name?: string | null }> | null;
  }): GA4ReportRow[] {
    return (response.rows ?? []).map((row) => {
      const dimensions: Record<string, string> = {};
      const metrics: Record<string, string> = {};

      response.dimensionHeaders?.forEach(
        (header: { name?: string | null }, i: number) => {
          dimensions[header.name ?? `dim_${i}`] =
            row.dimensionValues?.[i]?.value ?? "";
        },
      );

      response.metricHeaders?.forEach(
        (header: { name?: string | null }, i: number) => {
          metrics[header.name ?? `metric_${i}`] =
            row.metricValues?.[i]?.value ?? "0";
        },
      );

      return { dimensions, metrics };
    });
  }

  /**
   * Run a report against the GA4 Data API.
   */
  async runReport(request: GA4ReportRequest): Promise<GA4ReportResponse> {
    const reportRequest: Parameters<typeof this.client.runReport>[0] = {
      property: `properties/${request.propertyId}`,
      dateRanges: [
        { startDate: request.startDate, endDate: request.endDate },
      ],
      metrics: request.metrics.map((name) => ({ name })),
      dimensions: request.dimensions?.map((name) => ({ name })),
      limit: request.limit ?? undefined,
      orderBys: request.orderBys?.map((ob) => ({
        metric: { metricName: ob.fieldName },
        desc: ob.desc ?? false,
      })),
    };

    if (request.dimensionFilter?.stringFilter) {
      reportRequest.dimensionFilter = {
        filter: {
          fieldName: request.dimensionFilter.fieldName,
          stringFilter: {
            matchType: request.dimensionFilter.stringFilter.matchType as
              | "EXACT"
              | "BEGINS_WITH"
              | "ENDS_WITH"
              | "CONTAINS"
              | "FULL_REGEXP"
              | "PARTIAL_REGEXP",
            value: request.dimensionFilter.stringFilter.value,
            caseSensitive:
              request.dimensionFilter.stringFilter.caseSensitive ?? false,
          },
        },
      };
    }

    const response = await this.client.runReport(reportRequest);
    const data = response[0];

    const rows = this.parseRows(data);

    return {
      rows,
      rowCount: Number(data.rowCount ?? rows.length),
      metadata: {
        currencyCode: data.metadata?.currencyCode ?? undefined,
        timeZone: data.metadata?.timeZone ?? undefined,
      },
    };
  }

  /**
   * Run a real-time report (last 30 minutes of activity).
   */
  async runRealtimeReport(
    request: GA4RealtimeRequest,
  ): Promise<GA4ReportResponse> {
    const response = await this.client.runRealtimeReport({
      property: `properties/${request.propertyId}`,
      metrics: request.metrics.map((name) => ({ name })),
      dimensions: request.dimensions?.map((name) => ({ name })),
      limit: request.limit ?? undefined,
    });
    const data = response[0];

    const rows = this.parseRows(data);

    return {
      rows,
      rowCount: rows.length,
      metadata: {},
    };
  }

  /**
   * Convenience: get key metrics for a date range.
   */
  async getKeyMetrics(
    propertyId: string,
    startDate: string,
    endDate: string,
  ): Promise<{
    sessions: number;
    activeUsers: number;
    pageViews: number;
    avgSessionDuration: number;
    bounceRate: number;
  }> {
    const report = await this.runReport({
      propertyId,
      startDate,
      endDate,
      metrics: [
        "sessions",
        "activeUsers",
        "screenPageViews",
        "averageSessionDuration",
        "bounceRate",
      ],
    });

    const row = report.rows[0];
    if (!row) {
      return {
        sessions: 0,
        activeUsers: 0,
        pageViews: 0,
        avgSessionDuration: 0,
        bounceRate: 0,
      };
    }

    return {
      sessions: parseInt(row.metrics["sessions"] ?? "0", 10),
      activeUsers: parseInt(row.metrics["activeUsers"] ?? "0", 10),
      pageViews: parseInt(row.metrics["screenPageViews"] ?? "0", 10),
      avgSessionDuration: parseFloat(
        row.metrics["averageSessionDuration"] ?? "0",
      ),
      bounceRate: parseFloat(row.metrics["bounceRate"] ?? "0"),
    };
  }

  /**
   * Convenience: get top pages by page views.
   */
  async getTopPages(
    propertyId: string,
    startDate: string,
    endDate: string,
    limit = 10,
  ): Promise<Array<{ path: string; views: number }>> {
    const report = await this.runReport({
      propertyId,
      startDate,
      endDate,
      metrics: ["screenPageViews"],
      dimensions: ["pagePath"],
      limit,
      orderBys: [{ fieldName: "screenPageViews", desc: true }],
    });

    return report.rows.map((row) => ({
      path: row.dimensions["pagePath"] ?? "",
      views: parseInt(row.metrics["screenPageViews"] ?? "0", 10),
    }));
  }

  /**
   * Convenience: get top countries by active users.
   */
  async getTopCountries(
    propertyId: string,
    startDate: string,
    endDate: string,
    limit = 10,
  ): Promise<Array<{ country: string; users: number }>> {
    const report = await this.runReport({
      propertyId,
      startDate,
      endDate,
      metrics: ["activeUsers"],
      dimensions: ["country"],
      limit,
      orderBys: [{ fieldName: "activeUsers", desc: true }],
    });

    return report.rows.map((row) => ({
      country: row.dimensions["country"] ?? "",
      users: parseInt(row.metrics["activeUsers"] ?? "0", 10),
    }));
  }
}

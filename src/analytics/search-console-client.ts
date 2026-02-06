// ============================================================
// Google Search Console API Client
// ============================================================

import { google, type webmasters_v3 } from "googleapis";
import type { GoogleAuth } from "googleapis-common";
import type { GoogleAuthConfig } from "./types.js";
import { createGoogleAuth } from "./auth.js";
import type {
  SearchConsoleRequest,
  SearchConsoleResponse,
  SearchConsoleRow,
  SearchConsoleSite,
} from "./types.js";

export class SearchConsoleClient {
  private webmasters: webmasters_v3.Webmasters;

  constructor(authConfig: GoogleAuthConfig) {
    const auth = createGoogleAuth(authConfig);
    this.webmasters = google.webmasters({
      version: "v3",
      auth: auth as unknown as GoogleAuth,
    });
  }

  /**
   * List all sites the service account has access to.
   */
  async listSites(): Promise<SearchConsoleSite[]> {
    const response = await this.webmasters.sites.list();
    return (response.data.siteEntry ?? []).map((site) => ({
      siteUrl: site.siteUrl ?? "",
      permissionLevel: site.permissionLevel ?? "unknown",
    }));
  }

  /**
   * Query search analytics data.
   */
  async query(request: SearchConsoleRequest): Promise<SearchConsoleResponse> {
    const response = await this.webmasters.searchanalytics.query({
      siteUrl: request.siteUrl,
      requestBody: {
        startDate: request.startDate,
        endDate: request.endDate,
        dimensions: request.dimensions,
        searchType: request.searchType ?? "web",
        rowLimit: request.rowLimit ?? 1000,
        startRow: request.startRow ?? 0,
        dimensionFilterGroups: request.dimensionFilterGroups?.map((group) => ({
          groupType: group.groupType ?? "and",
          filters: group.filters.map((f) => ({
            dimension: f.dimension,
            operator: f.operator,
            expression: f.expression,
          })),
        })),
      },
    });

    const rows: SearchConsoleRow[] = (response.data.rows ?? []).map((row) => ({
      keys: row.keys ?? [],
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    }));

    return {
      rows,
      responseAggregationType:
        response.data.responseAggregationType ?? "auto",
    };
  }

  /**
   * Convenience: get top queries for a site.
   */
  async getTopQueries(
    siteUrl: string,
    startDate: string,
    endDate: string,
    limit = 10,
  ): Promise<
    Array<{
      query: string;
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    }>
  > {
    const result = await this.query({
      siteUrl,
      startDate,
      endDate,
      dimensions: ["query"],
      rowLimit: limit,
    });

    return result.rows.map((row) => ({
      query: row.keys[0] ?? "",
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }));
  }

  /**
   * Convenience: get top pages for a site.
   */
  async getTopPages(
    siteUrl: string,
    startDate: string,
    endDate: string,
    limit = 10,
  ): Promise<
    Array<{
      page: string;
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    }>
  > {
    const result = await this.query({
      siteUrl,
      startDate,
      endDate,
      dimensions: ["page"],
      rowLimit: limit,
    });

    return result.rows.map((row) => ({
      page: row.keys[0] ?? "",
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }));
  }

  /**
   * Convenience: get performance by device type.
   */
  async getPerformanceByDevice(
    siteUrl: string,
    startDate: string,
    endDate: string,
  ): Promise<
    Array<{
      device: string;
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    }>
  > {
    const result = await this.query({
      siteUrl,
      startDate,
      endDate,
      dimensions: ["device"],
    });

    return result.rows.map((row) => ({
      device: row.keys[0] ?? "",
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }));
  }

  /**
   * Convenience: get daily performance over a date range.
   */
  async getDailyPerformance(
    siteUrl: string,
    startDate: string,
    endDate: string,
  ): Promise<
    Array<{
      date: string;
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    }>
  > {
    const result = await this.query({
      siteUrl,
      startDate,
      endDate,
      dimensions: ["date"],
      rowLimit: 25000,
    });

    return result.rows.map((row) => ({
      date: row.keys[0] ?? "",
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }));
  }
}

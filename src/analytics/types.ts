// ============================================================
// Types for Google Analytics GA4 & Search Console modules
// ============================================================

// ----- Google Auth -----

export interface GoogleAuthConfig {
  /** Path to the service account JSON key file */
  serviceAccountKeyPath?: string;
  /** Or inline credentials */
  clientEmail?: string;
  privateKey?: string;
}

// ----- GA4 Types -----

/** GA4 property identifier (e.g. "properties/123456789") */
export type GA4PropertyId = string;

export interface GA4ReportRequest {
  /** GA4 property ID (numeric, without "properties/" prefix) */
  propertyId: string;
  /** Start date in YYYY-MM-DD format or relative: "today", "yesterday", "7daysAgo", "30daysAgo" */
  startDate: string;
  /** End date in YYYY-MM-DD format or relative */
  endDate: string;
  /** Metrics to retrieve (e.g. "sessions", "activeUsers", "screenPageViews") */
  metrics: string[];
  /** Dimensions to group by (e.g. "date", "country", "pagePath") */
  dimensions?: string[];
  /** Maximum number of rows to return */
  limit?: number;
  /** Dimension filter expressions */
  dimensionFilter?: GA4DimensionFilter;
  /** Order-by clauses */
  orderBys?: GA4OrderBy[];
}

export interface GA4DimensionFilter {
  /** Field name (dimension) */
  fieldName: string;
  /** String filter value */
  stringFilter?: {
    matchType: "EXACT" | "BEGINS_WITH" | "ENDS_WITH" | "CONTAINS" | "FULL_REGEXP" | "PARTIAL_REGEXP";
    value: string;
    caseSensitive?: boolean;
  };
}

export interface GA4OrderBy {
  /** Metric or dimension name */
  fieldName: string;
  /** Sort direction */
  desc?: boolean;
}

export interface GA4ReportRow {
  dimensions: Record<string, string>;
  metrics: Record<string, string>;
}

export interface GA4ReportResponse {
  rows: GA4ReportRow[];
  rowCount: number;
  metadata: {
    currencyCode?: string;
    timeZone?: string;
  };
}

export interface GA4RealtimeRequest {
  propertyId: string;
  metrics: string[];
  dimensions?: string[];
  limit?: number;
}

// ----- Search Console Types -----

export interface SearchConsoleRequest {
  /** Site URL (e.g. "https://example.com" or "sc-domain:example.com") */
  siteUrl: string;
  /** Start date in YYYY-MM-DD format */
  startDate: string;
  /** End date in YYYY-MM-DD format */
  endDate: string;
  /** Dimensions: "query", "page", "country", "device", "date" */
  dimensions?: SearchConsoleDimension[];
  /** Search type filter */
  searchType?: "web" | "image" | "video" | "news" | "discover" | "googleNews";
  /** Row limit (max 25000) */
  rowLimit?: number;
  /** Start row for pagination */
  startRow?: number;
  /** Dimension filter groups */
  dimensionFilterGroups?: SearchConsoleDimensionFilterGroup[];
}

export type SearchConsoleDimension = "query" | "page" | "country" | "device" | "date";

export interface SearchConsoleDimensionFilterGroup {
  groupType?: "and";
  filters: SearchConsoleDimensionFilterEntry[];
}

export interface SearchConsoleDimensionFilterEntry {
  dimension: SearchConsoleDimension;
  operator: "equals" | "notEquals" | "contains" | "notContains" | "includingRegex" | "excludingRegex";
  expression: string;
}

export interface SearchConsoleRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchConsoleResponse {
  rows: SearchConsoleRow[];
  responseAggregationType: string;
}

export interface SearchConsoleSite {
  siteUrl: string;
  permissionLevel: string;
}

// ----- Unified Analytics Report -----

export interface AnalyticsSummary {
  ga4: {
    sessions: number;
    activeUsers: number;
    pageViews: number;
    avgSessionDuration: number;
    bounceRate: number;
    topPages: Array<{ path: string; views: number }>;
    topCountries: Array<{ country: string; users: number }>;
  };
  searchConsole: {
    totalClicks: number;
    totalImpressions: number;
    averageCtr: number;
    averagePosition: number;
    topQueries: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>;
    topPages: Array<{ page: string; clicks: number; impressions: number; ctr: number; position: number }>;
  };
  period: {
    startDate: string;
    endDate: string;
  };
}

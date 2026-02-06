// ============================================================
// Analytics module — public API
// ============================================================

export { GA4Client } from "./ga4-client.js";
export { SearchConsoleClient } from "./search-console-client.js";
export { AnalyticsService } from "./analytics-service.js";
export type { AnalyticsConfig } from "./analytics-service.js";
export { createGoogleAuth } from "./auth.js";
export type {
  GoogleAuthConfig,
  GA4ReportRequest,
  GA4ReportResponse,
  GA4ReportRow,
  GA4RealtimeRequest,
  GA4DimensionFilter,
  GA4OrderBy,
  SearchConsoleRequest,
  SearchConsoleResponse,
  SearchConsoleRow,
  SearchConsoleSite,
  SearchConsoleDimension,
  AnalyticsSummary,
} from "./types.js";

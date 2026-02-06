// ============================================================
// Types for Umami Analytics module
// ============================================================

// ----- Umami Auth / Config -----

export interface UmamiConfig {
  /** Umami server URL (e.g. "https://analytics.example.com") */
  serverUrl: string;
  /** Username for authentication */
  username: string;
  /** Password for authentication */
  password: string;
  /** Website ID to query */
  websiteId: string;
  /** Timezone for date-based queries (default: "UTC") */
  timezone?: string;
}

// ----- Stats -----

export interface UmamiStats {
  pageviews: { value: number; prev: number };
  visitors: { value: number; prev: number };
  visits: { value: number; prev: number };
  bounces: { value: number; prev: number };
  totaltime: { value: number; prev: number };
}

// ----- Pageviews -----

export interface UmamiPageviewsResponse {
  pageviews: Array<{ t: string; y: number }>;
  sessions: Array<{ t: string; y: number }>;
}

// ----- Metrics -----

export interface UmamiMetric {
  x: string;
  y: number;
}

// ----- Events -----

export interface UmamiEventMetric {
  x: string;
  t: string;
  y: number;
}

// ----- Active users -----

export interface UmamiActive {
  x: number;
}

// ----- Query params -----

export interface UmamiDateRange {
  startAt: number;
  endAt: number;
}

export type UmamiMetricType =
  | "url"
  | "referrer"
  | "browser"
  | "os"
  | "device"
  | "country"
  | "language"
  | "event";

// ----- Analytics Summary -----

export interface AnalyticsSummary {
  stats: UmamiStats;
  topPages: UmamiMetric[];
  topReferrers: UmamiMetric[];
  topCountries: UmamiMetric[];
  topBrowsers: UmamiMetric[];
  topDevices: UmamiMetric[];
  topEvents: UmamiEventMetric[];
  period: {
    startAt: number;
    endAt: number;
  };
}

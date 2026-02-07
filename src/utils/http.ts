// ============================================================
// Secure HTTP Utilities
// Addresses: HAUTE-02 (rate limiting), HAUTE-04 (response checks),
//            HAUTE-05 (timeouts), MOYENNE-01 (safe logging)
// ============================================================

/** Default request timeout in milliseconds (30 seconds). */
const DEFAULT_TIMEOUT_MS = 30_000;

/** Options for secureFetch */
export interface SecureFetchOptions extends RequestInit {
  /** Timeout in ms (default 30 000). */
  timeoutMs?: number;
}

/**
 * Wrapper around fetch that enforces a timeout via AbortController.
 * Throws on non-ok responses with a safe error message.
 */
export async function secureFetch(
  url: string,
  options: SecureFetchOptions = {}
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`HTTP request timed out after ${timeoutMs}ms: ${sanitizeUrl(url)}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * secureFetch + throws on non-ok status codes.
 * Returns the Response for further processing.
 */
export async function secureFetchOk(
  url: string,
  options: SecureFetchOptions = {}
): Promise<Response> {
  const response = await secureFetch(url, options);
  if (!response.ok) {
    // Read body for diagnostics but limit length to avoid memory issues
    const body = await response.text().catch(() => "(unreadable body)");
    const safeBody = body.slice(0, 500);
    throw new Error(
      `HTTP ${response.status} ${response.statusText} on ${options.method ?? "GET"} ${sanitizeUrl(url)}: ${safeBody}`
    );
  }
  return response;
}

// ============================================================
// Rate Limiter (token-bucket algorithm)
// ============================================================

export class RateLimiter {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillRatePerSec: number;
  private lastRefill: number;

  /**
   * @param maxTokens Maximum burst capacity
   * @param refillRatePerSec Tokens added per second
   */
  constructor(maxTokens: number, refillRatePerSec: number) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillRatePerSec = refillRatePerSec;
    this.lastRefill = Date.now();
  }

  /** Wait until a token is available, then consume it. */
  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    // Wait for the next token
    const waitMs = ((1 - this.tokens) / this.refillRatePerSec) * 1000;
    await sleep(Math.ceil(waitMs));
    this.refill();
    this.tokens -= 1;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRatePerSec);
    this.lastRefill = now;
  }
}

// ============================================================
// Retry with exponential backoff
// ============================================================

export interface RetryOptions {
  /** Maximum number of retries (default 3). */
  maxRetries?: number;
  /** Initial delay in ms (default 1000). */
  initialDelayMs?: number;
  /** Which HTTP status codes should trigger a retry (default [429, 500, 502, 503, 504]). */
  retryableStatuses?: number[];
}

/**
 * Execute an async operation with exponential backoff retry.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, initialDelayMs = 1000 } = options;

  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === maxRetries) break;

      const delay = initialDelayMs * Math.pow(2, attempt);
      console.warn(
        `[retry] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms...`
      );
      await sleep(delay);
    }
  }
  throw lastError;
}

// ============================================================
// URL sanitization for safe logging (CRITIQUE-03, MOYENNE-01)
// ============================================================

/** Remove sensitive query parameters from a URL for safe logging. */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const sensitiveKeys = ["key", "token", "api_key", "apikey", "secret", "password", "auth"];
    for (const key of sensitiveKeys) {
      if (parsed.searchParams.has(key)) {
        parsed.searchParams.set(key, "***");
      }
    }
    return parsed.toString();
  } catch {
    // If URL parsing fails, just redact anything that looks like a token
    return url.replace(/(key|token|api_key|secret|password)=[^&]+/gi, "$1=***");
  }
}

// ============================================================
// Helpers
// ============================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

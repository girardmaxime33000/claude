// ============================================================
// Google API Authentication (Service Account)
// ============================================================

import { google } from "googleapis";
import type { GoogleAuthConfig } from "./types.js";
import { readFileSync } from "node:fs";

const SCOPES = [
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/webmasters.readonly",
];

/**
 * Create a Google Auth client from service account credentials.
 *
 * Supports two modes:
 * 1. Path to a service account JSON key file (`serviceAccountKeyPath`)
 * 2. Inline credentials (`clientEmail` + `privateKey`)
 */
export function createGoogleAuth(config: GoogleAuthConfig) {
  if (config.serviceAccountKeyPath) {
    const keyFile = JSON.parse(
      readFileSync(config.serviceAccountKeyPath, "utf-8"),
    );
    return new google.auth.GoogleAuth({
      credentials: {
        client_email: keyFile.client_email,
        private_key: keyFile.private_key,
      },
      scopes: SCOPES,
    });
  }

  if (config.clientEmail && config.privateKey) {
    return new google.auth.GoogleAuth({
      credentials: {
        client_email: config.clientEmail,
        private_key: config.privateKey,
      },
      scopes: SCOPES,
    });
  }

  throw new Error(
    "Google auth requires either serviceAccountKeyPath or clientEmail+privateKey",
  );
}

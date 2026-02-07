import { resolve, normalize } from "node:path";

// ============================================================
// Input Sanitization Utilities
// Addresses: CRITIQUE-01 (prompt injection), CRITIQUE-02 (path traversal)
// ============================================================

/**
 * Boundaries used to clearly delimit user-provided content inside LLM prompts.
 * This "input marking" technique helps the model distinguish instructions from data.
 */
const USER_DATA_OPEN = "<<BEGIN_USER_DATA>>";
const USER_DATA_CLOSE = "<<END_USER_DATA>>";

/**
 * Wrap user-provided text with clear boundary markers so the LLM
 * can distinguish system instructions from untrusted data.
 *
 * Also strips any attempt to inject the boundary markers themselves.
 */
export function wrapUserData(text: string): string {
  const cleaned = text
    .replace(/<<BEGIN_USER_DATA>>/g, "")
    .replace(/<<END_USER_DATA>>/g, "")
    .replace(/<<BEGIN_SYSTEM>>/g, "")
    .replace(/<<END_SYSTEM>>/g, "");
  return `${USER_DATA_OPEN}\n${cleaned}\n${USER_DATA_CLOSE}`;
}

/**
 * Strip common prompt-injection patterns from untrusted input.
 * This is a defence-in-depth measure — not a silver bullet.
 */
export function sanitizePromptInput(text: string): string {
  let sanitized = text;

  // Remove attempts to override system instructions
  const injectionPatterns = [
    /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|rules?)/gi,
    /ignore\s+tout\s+(ce\s+qui\s+pr[ée]c[èe]de|instructions?|r[èe]gles?)/gi,
    /you\s+are\s+now\s+/gi,
    /tu\s+es\s+maintenant\s+/gi,
    /new\s+(system\s+)?instructions?:/gi,
    /nouvelles?\s+instructions?:/gi,
    /override\s+(system|instructions?)/gi,
    /system\s*prompt/gi,
    /\[SYSTEM\]/gi,
    /\[INST\]/gi,
    /<\/?system>/gi,
    /### ?(SYSTEM|ADMIN|ROOT|OVERRIDE)/gi,
  ];

  for (const pattern of injectionPatterns) {
    sanitized = sanitized.replace(pattern, "[FILTERED]");
  }

  return sanitized;
}

/**
 * Full pipeline: sanitize then wrap with boundary markers.
 */
export function prepareUserInput(text: string): string {
  return wrapUserData(sanitizePromptInput(text));
}

// ============================================================
// Path Traversal Protection  (CRITIQUE-02)
// ============================================================

/**
 * Validate that a resolved file path stays inside the allowed base directory.
 * Throws if the path escapes the base directory.
 */
export function safePath(baseDir: string, untrustedRelative: string): string {
  // Reject obviously malicious patterns early
  if (untrustedRelative.includes("\0")) {
    throw new Error("Security: null byte in path");
  }

  const resolvedBase = resolve(baseDir);
  const resolvedTarget = resolve(resolvedBase, normalize(untrustedRelative));

  if (!resolvedTarget.startsWith(resolvedBase + "/") && resolvedTarget !== resolvedBase) {
    throw new Error(
      `Security: path traversal detected — "${untrustedRelative}" escapes base directory`
    );
  }

  return resolvedTarget;
}

/**
 * Sanitize a string to produce a safe filesystem slug.
 * Removes anything that isn't alphanumeric, dash, or underscore.
 */
export function safeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 128); // cap length
}

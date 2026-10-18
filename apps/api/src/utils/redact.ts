/**
 * Secret detection & redaction (FR-COMP-02).
 * Used by the Evidence Compiler on every snippet and by the logger on every line.
 */

export const REDACTION_TOKEN = "[REDACTED_SECRET]";

const SECRET_PATTERNS: RegExp[] = [
  // PEM private keys (whole block)
  /-----BEGIN(?: [A-Z0-9]+)* PRIVATE KEY-----[\s\S]*?(?:-----END(?: [A-Z0-9]+)* PRIVATE KEY-----|$)/g,
  // GitHub tokens (classic, OAuth, user-to-server, server-to-server, refresh) and fine-grained PATs
  /\bgh[pousr]_[A-Za-z0-9]{30,255}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{40,255}\b/g,
  // AWS access key ids
  /\b(?:AKIA|ASIA|AGPA|AIDA|AROA|ANPA|ANVA|AIPA)[0-9A-Z]{16}\b/g,
  // Google API keys
  /\bAIza[0-9A-Za-z_-]{35}\b/g,
  // Groq API keys
  /\bgsk_[A-Za-z0-9]{20,}\b/g,
  // Slack tokens & webhooks
  /\bxox[abposr]-[A-Za-z0-9-]{10,}\b/g,
  /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/_-]+/g,
  // Stripe live keys
  /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b/g,
  // OpenAI-style keys
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/g,
  // JWTs
  /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  // Credentials embedded in URLs: scheme://user:pass@host
  /\b[a-z][a-z0-9+.-]*:\/\/[^\s:/@]+:[^\s@/]{3,}@/gi,
];

/** key = value assignments whose value looks like a high-entropy secret. */
const ASSIGNMENT_PATTERN =
  /\b([A-Za-z0-9_.-]*(?:secret|token|passw(?:or)?d|api[_-]?key|access[_-]?key|private[_-]?key|client[_-]?secret|auth)[A-Za-z0-9_.-]*)(\s*[:=]\s*["']?)([A-Za-z0-9/+_=.\-]{16,})/gi;

const PLACEHOLDER_HINTS = /(your|example|placeholder|changeme|xxxx|dummy|sample|<|\$\{|process\.env|todo)/i;

export function shannonEntropy(value: string): number {
  if (!value) return 0;
  const freq = new Map<string, number>();
  for (const ch of value) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / value.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

export interface RedactionResult {
  text: string;
  redactions: number;
}

export function redactSecrets(input: string): RedactionResult {
  let redactions = 0;
  let text = input;

  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, (match) => {
      redactions++;
      // Preserve the scheme for URL credentials so the evidence stays readable.
      const scheme = /^[a-z][a-z0-9+.-]*:\/\//i.exec(match);
      return scheme && match.endsWith("@") ? `${scheme[0]}${REDACTION_TOKEN}@` : REDACTION_TOKEN;
    });
  }

  text = text.replace(ASSIGNMENT_PATTERN, (match, key: string, sep: string, value: string) => {
    if (value === REDACTION_TOKEN || PLACEHOLDER_HINTS.test(value)) return match;
    if (shannonEntropy(value) < 3.5) return match;
    redactions++;
    return `${key}${sep}${REDACTION_TOKEN}`;
  });

  return { text, redactions };
}

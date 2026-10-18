import { config } from "../config.js";
import { redactSecrets } from "./redact.js";

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const;
type Level = keyof typeof LEVELS;

function format(value: unknown): string {
  if (value instanceof Error) return value.stack ?? value.message;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Minimal logger that scrubs every line through the secret redactor (NFR-SEC-02),
 * so a token accidentally included in an error message never reaches stdout.
 */
function log(level: Level, ...parts: unknown[]) {
  if (LEVELS[level] < LEVELS[config.logLevel]) return;
  const line = redactSecrets(parts.map(format).join(" ")).text;
  const stamp = new Date().toISOString();
  const out = `${stamp} ${level.toUpperCase().padEnd(5)} ${line}`;
  if (level === "error" || level === "warn") console.error(out);
  else console.log(out);
}

export const logger = {
  debug: (...p: unknown[]) => log("debug", ...p),
  info: (...p: unknown[]) => log("info", ...p),
  warn: (...p: unknown[]) => log("warn", ...p),
  error: (...p: unknown[]) => log("error", ...p),
};

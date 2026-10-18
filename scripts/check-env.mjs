#!/usr/bin/env node
/**
 * RepoSage preflight: checks local prerequisites without printing any secret values.
 * Usage: npm run preflight
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ok = (msg) => console.log(`  \u2714 ${msg}`);
const warn = (msg) => console.log(`  \u26A0 ${msg}`);
const fail = (msg) => console.log(`  \u2716 ${msg}`);
let blocking = 0;

console.log("\nRepoSage preflight\n");

// Node.js version
const [major, minor] = process.versions.node.split(".").map(Number);
if (major > 20 || (major === 20 && minor >= 11)) ok(`Node.js ${process.versions.node}`);
else {
  fail(`Node.js ${process.versions.node} — RepoSage requires >= 20.11`);
  blocking++;
}

// GitHub CLI
try {
  const version = execFileSync("gh", ["--version"], { encoding: "utf8", windowsHide: true }).split("\n")[0];
  ok(version);
  try {
    const status = execFileSync("gh", ["auth", "status", "--hostname", "github.com"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    const user = /Logged in to github\.com (?:account|as) ([^\s(]+)/i.exec(status)?.[1];
    ok(`gh authenticated${user ? ` as ${user}` : ""}`);
  } catch (err) {
    const out = `${err.stdout ?? ""}${err.stderr ?? ""}`;
    const user = /Logged in to github\.com (?:account|as) ([^\s(]+)/i.exec(out)?.[1];
    if (user) ok(`gh authenticated as ${user}`);
    else {
      fail("gh is not authenticated — run: gh auth login --web --scopes repo,read:org");
      blocking++;
    }
  }
} catch {
  fail("GitHub CLI (gh) not found — install from https://cli.github.com");
  blocking++;
}

// API env file
const apiEnvPath = path.join(root, "apps/api/.env");
const env = {};
if (existsSync(apiEnvPath)) {
  for (const line of readFileSync(apiEnvPath, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  ok("apps/api/.env found");
} else {
  warn("apps/api/.env missing — defaults will be used (copy apps/api/.env.example)");
}

// Ollama
const ollamaUrl = (env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/+$/, "");
const model = env.LOCAL_GEMMA_MODEL || "gemma4:e4b";
try {
  const res = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(2500) });
  const data = await res.json();
  const names = (data.models ?? []).map((m) => m.name);
  if (names.includes(model) || names.includes(`${model}:latest`)) ok(`Ollama reachable, ${model} available`);
  else warn(`Ollama reachable but ${model} not pulled — run: ollama pull ${model}`);
} catch {
  warn(`Ollama not reachable at ${ollamaUrl} — Local mode will degrade to the deterministic report`);
}

// Google AI Studio key (presence only)
const key = env.GOOGLE_AI_API_KEY || process.env.GOOGLE_AI_API_KEY;
if (key && !key.includes("your_google_ai_studio_api_key")) ok("GOOGLE_AI_API_KEY configured");
else warn("GOOGLE_AI_API_KEY not set — Hosted mode will degrade to the deterministic report");

console.log(blocking ? `\n${blocking} blocking issue(s) found.\n` : "\nReady. Run: npm run dev\n");
process.exit(blocking ? 1 : 0);

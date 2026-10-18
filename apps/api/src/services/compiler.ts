import type { EvidenceManifest, HealthReport } from "@reposage/shared";
import { canonicalStringify, estimateTokens, sha256Hex } from "../utils/canonical.js";
import { redactSecrets } from "../utils/redact.js";
import type { CollectedEvidence } from "./collector.js";

export interface CompiledManifest {
  manifest: EvidenceManifest;
  /** Canonical JSON (sorted keys) — the exact bytes hashed and sent to every model. */
  canonicalJson: string;
  sha256: string;
  tokenEstimate: number;
}

interface ExcerptSource {
  path: string;
  text: string;
  priority: number;
  limit: number;
}

const MIN_EXCERPT_CHARS = 160;

/** Collapses whitespace noise so small models spend tokens on signal. */
function tidy(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return `${text.slice(0, Math.max(0, limit - 14)).trimEnd()}\n…[truncated]`;
}

/** package.json reduced to the fields that matter for an audit. */
function compactPackageJson(raw: string): string {
  try {
    const pj = JSON.parse(raw) as Record<string, unknown>;
    const pick: Record<string, unknown> = {};
    for (const k of ["name", "private", "type", "engines", "packageManager", "workspaces", "scripts", "dependencies", "devDependencies"]) {
      if (pj[k] !== undefined) pick[k] = pj[k];
    }
    return JSON.stringify(pick);
  } catch {
    return raw;
  }
}

function excerptSources(evidence: CollectedEvidence): { sources: ExcerptSource[]; redactions: number } {
  let redactions = 0;
  const sources: ExcerptSource[] = [];
  const add = (path: string, priority: number, limit: number, transform?: (s: string) => string) => {
    const file = evidence.files.get(path);
    if (!file?.content) return;
    // FR-COMP-02: redact on the full text *before* truncation so no secret fragment survives.
    const red = redactSecrets(file.content);
    redactions += red.redactions;
    const text = tidy(transform ? transform(red.text) : red.text);
    if (text) sources.push({ path, text, priority, limit });
  };

  const paths = [...evidence.files.keys()];
  const readme = paths.find((p) => /^readme(\.(md|markdown|rst|txt))?$/i.test(p));
  if (readme) add(readme, 0, 1600);
  if (evidence.files.has("package.json")) add("package.json", 1, 1000, compactPackageJson);
  paths
    .filter((p) => p.startsWith(".github/workflows/"))
    .slice(0, 6)
    .forEach((p) => add(p, 2, 700));
  for (const p of ["pyproject.toml", "requirements.txt", "Cargo.toml", "go.mod"]) add(p, 3, 500);
  for (const p of [".gitignore", ".env.example"]) add(p, 4, 300);
  const dependabot = paths.find((p) => /dependabot\.ya?ml$|renovate/i.test(p));
  if (dependabot) add(dependabot, 5, 300);
  for (const p of ["Dockerfile", "docker-compose.yml"]) add(p, 6, 400);

  return { sources, redactions };
}

function notablePaths(evidence: CollectedEvidence): string[] {
  const paths = evidence.blobs.map((b) => b.path);
  const notable = new Set<string>();
  for (const p of evidence.files.keys()) notable.add(p);
  paths.filter((p) => /(^|\/)[^/]+\.(test|spec)\.[a-z0-9]+$|(^|\/)test_[^/]+\.py$|_test\.go$/i.test(p)).slice(0, 6).forEach((p) => notable.add(p));
  paths.filter((p) => /^(src|lib|app|apps|packages|cmd|internal)\/[^/]+$/.test(p)).slice(0, 10).forEach((p) => notable.add(p));
  return [...notable].sort();
}

/**
 * Evidence Compiler (FR-COMP-01, NFR-PERF-02): distills collected evidence and deterministic
 * results into a compact, canonical, SHA-256-hashed manifest under the token budget.
 */
export function compileEvidence(evidence: CollectedEvidence, health: HealthReport, maxTokens: number): CompiledManifest {
  const { sources, redactions } = excerptSources(evidence);
  const meta = evidence.metadata;

  const topLevel = [...new Set(evidence.blobs.map((b) => (b.path.includes("/") ? `${b.path.split("/")[0]}/` : b.path)))].sort();

  const failing = health.checks.filter((c) => c.status === "FAIL" || c.status === "WARN");
  const deterministicResults = failing.map((c) => ({
    checkId: c.checkId,
    status: c.status,
    evidence: redactSecrets(c.observedEvidence).text,
    ...(c.filePath ? { filePath: c.filePath } : {}),
  }));

  let topLimit = 40;
  let notable = notablePaths(evidence);
  let limits = sources.map((s) => s.limit);
  let included = sources.map(() => true);

  const build = (): EvidenceManifest => ({
    schemaVersion: 1,
    repo: {
      nameWithOwner: meta.nameWithOwner,
      description: meta.description ? truncate(redactSecrets(meta.description).text, 280) : null,
      defaultBranch: meta.defaultBranch,
      headSha: meta.headSha,
      isPrivate: meta.isPrivate,
      isArchived: meta.isArchived,
      license: meta.license?.spdxId ?? null,
      languages: meta.languages.slice(0, 6).map((l) => l.name),
      stars: meta.stars,
      openIssues: meta.openIssues,
      openPullRequests: meta.openPullRequests,
      pushedAt: meta.pushedAt,
    },
    healthScore: health.overallScore,
    deterministicResults,
    passedCheckIds: health.checks.filter((c) => c.status === "PASS").map((c) => c.checkId),
    treeSummary: {
      totalFiles: evidence.blobs.length,
      topLevel: topLevel.slice(0, topLimit),
      notablePaths: notable,
    },
    excerpts: sources
      .map((s, i) => ({ s, i }))
      .filter(({ i }) => included[i])
      .sort((a, b) => a.s.priority - b.s.priority || a.s.path.localeCompare(b.s.path))
      .map(({ s, i }) => ({ path: s.path, text: truncate(s.text, limits[i]!) })),
    redactions,
  });

  let manifest = build();
  let json = canonicalStringify(manifest);

  // Progressive compression until the manifest fits the budget.
  for (let guard = 0; estimateTokens(json) > maxTokens && guard < 60; guard++) {
    const shrinkable = limits.some((l, i) => included[i] && l > MIN_EXCERPT_CHARS);
    if (shrinkable) {
      limits = limits.map((l) => Math.max(MIN_EXCERPT_CHARS, Math.floor(l * 0.8)));
    } else if (included.some(Boolean)) {
      // Drop the lowest-priority remaining excerpt.
      let drop = -1;
      sources.forEach((s, i) => {
        if (included[i] && (drop < 0 || s.priority >= sources[drop]!.priority)) drop = i;
      });
      included = included.map((v, i) => (i === drop ? false : v));
    } else if (notable.length > 8) {
      notable = notable.slice(0, Math.floor(notable.length * 0.7));
    } else if (topLimit > 10) {
      topLimit = Math.floor(topLimit * 0.7);
    } else {
      break;
    }
    manifest = build();
    json = canonicalStringify(manifest);
  }

  return { manifest, canonicalJson: json, sha256: sha256Hex(json), tokenEstimate: estimateTokens(json) };
}

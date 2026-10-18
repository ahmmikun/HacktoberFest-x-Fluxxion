import type { AuditFinding, ConsensusEntry, HealthReport, ModelRunResult } from "@reposage/shared";
import { logger } from "../utils/logger.js";
import type { CompiledManifest } from "./compiler.js";
import type { ChatTurn, ModelClient } from "./modelClient.js";
import { buildRepairPrompt, buildUserPrompt, SYSTEM_PROMPT } from "./prompts.js";
import { parseModelOutput, verifyFindings } from "./verifier.js";

/**
 * Gemma Inference Orchestrator: prompt → parse → (≤1 schema-repair retry, NFR-PERF-03) →
 * citation verification → telemetry. Never throws; failures degrade to the deterministic report.
 */
export async function runModel(
  client: ModelClient,
  compiled: CompiledManifest,
  validTreePaths: Set<string>,
  health: HealthReport,
): Promise<ModelRunResult> {
  const started = performance.now();
  const base = {
    runtime: client.runtime,
    modelId: client.modelId,
    executiveSummary: null,
    architecturalRisks: [],
    quickWins: [],
    verifiedFindings: [],
    quarantinedFindings: [],
  } satisfies Partial<ModelRunResult>;

  const turns: ChatTurn[] = [{ role: "user", content: buildUserPrompt(compiled) }];
  let raw: string;
  try {
    raw = await client.generate(SYSTEM_PROMPT, turns);
  } catch (err) {
    logger.warn(`[${client.runtime}] inference failed: ${(err as Error).message}`);
    return { ...base, status: "FAILED", error: (err as Error).message, telemetry: null };
  }

  let parsed = parseModelOutput(raw);
  const schemaValidFirstTry = parsed.ok;
  let repairAttempted = false;

  if (!parsed.ok) {
    repairAttempted = true;
    logger.info(`[${client.runtime}] schema invalid, attempting 1 repair: ${parsed.error.split("\n")[0]}`);
    try {
      const repairRaw = await client.generate(SYSTEM_PROMPT, [
        ...turns,
        { role: "assistant", content: raw.slice(0, 12_000) },
        { role: "user", content: buildRepairPrompt(parsed.error) },
      ]);
      parsed = parseModelOutput(repairRaw);
    } catch (err) {
      parsed = { ok: false, error: (err as Error).message };
    }
  }

  const latencyMs = Math.round(performance.now() - started);

  if (!parsed.ok) {
    return {
      ...base,
      status: "DEGRADED",
      error: `Model output failed schema validation after repair; showing deterministic report only. ${parsed.error.split("\n").slice(0, 3).join(" ")}`,
      telemetry: {
        modelId: client.modelId,
        runtime: client.runtime,
        latencyMs,
        schemaValidFirstTry,
        repairAttempted,
        totalFindings: 0,
        verifiedFindingsCount: 0,
        unsupportedClaimsCount: 0,
        citationAccuracyPct: 0,
        manifestSha256: compiled.sha256,
      },
    };
  }

  const prefix = { OLLAMA_LOCAL: "e4b", GOOGLE_AI_STUDIO: "26b", GROQ: "groq" }[client.runtime];
  const { verified, quarantined } = verifyFindings(parsed.data.findings, validTreePaths, health, prefix);
  const total = verified.length + quarantined.length;

  return {
    ...base,
    status: "SUCCESS",
    executiveSummary: parsed.data.executiveSummary,
    architecturalRisks: parsed.data.architecturalRisks,
    quickWins: parsed.data.quickWins,
    verifiedFindings: verified,
    quarantinedFindings: quarantined,
    telemetry: {
      modelId: client.modelId,
      runtime: client.runtime,
      latencyMs,
      schemaValidFirstTry,
      repairAttempted,
      totalFindings: total,
      verifiedFindingsCount: verified.length,
      unsupportedClaimsCount: quarantined.length,
      // No claims means no false claims.
      citationAccuracyPct: total === 0 ? 100 : Math.round((verified.length / total) * 1000) / 10,
      manifestSha256: compiled.sha256,
    },
  };
}

/**
 * Runs the first engine in `chain`; if it FAILS (unreachable, timeout, auth, quota) or DEGRADES
 * (output invalid even after repair), the next engine runs on the identical manifest. The
 * returned result records which engine it fell back from.
 */
export async function runWithFallback(
  chain: ModelClient[],
  compiled: CompiledManifest,
  validTreePaths: Set<string>,
  health: HealthReport,
  onFallback?: (from: ModelRunResult, to: ModelClient) => void,
): Promise<ModelRunResult> {
  let previous: ModelRunResult | null = null;
  for (const [i, client] of chain.entries()) {
    const run = await runModel(client, compiled, validTreePaths, health);
    if (previous) {
      run.fallbackFrom = { runtime: previous.runtime, modelId: previous.modelId, error: previous.error ?? previous.status };
    }
    const next = chain[i + 1];
    if (run.status === "SUCCESS" || !next) return run;
    logger.warn(`[${client.runtime}] ${run.status.toLowerCase()}, falling back to ${next.runtime} (${next.modelId})`);
    onFallback?.(run, next);
    previous = run;
  }
  throw new Error("runWithFallback requires at least one client.");
}

/* -------------------------------------------------------------------------- */
/*                         Comparison / consensus matrix                      */
/* -------------------------------------------------------------------------- */

function anchors(f: AuditFinding): Set<string> {
  const set = new Set<string>();
  for (const r of f.evidenceRefs) {
    if (r.checkId) set.add(`check:${r.checkId}`);
    if (r.filePath && r.filePath !== "REPO_ROOT") set.add(`path:${r.filePath}`);
  }
  return set;
}

/** Matches verified findings across runtimes by category + shared evidence anchors. */
export function buildConsensus(local: AuditFinding[], hosted: AuditFinding[]): ConsensusEntry[] {
  const entries: ConsensusEntry[] = [];
  const usedHosted = new Set<string>();

  for (const l of local) {
    const la = anchors(l);
    const match = hosted.find(
      (h) => !usedHosted.has(h.id) && h.category === l.category && [...anchors(h)].some((a) => la.has(a)),
    );
    if (match) {
      usedHosted.add(match.id);
      entries.push({
        key: `${l.id}|${match.id}`,
        title: l.title,
        category: l.category,
        agreement: "BOTH",
        localFindingId: l.id,
        hostedFindingId: match.id,
        localSeverity: l.severity,
        hostedSeverity: match.severity,
      });
    } else {
      entries.push({ key: l.id, title: l.title, category: l.category, agreement: "LOCAL_ONLY", localFindingId: l.id, localSeverity: l.severity });
    }
  }
  for (const h of hosted) {
    if (usedHosted.has(h.id)) continue;
    entries.push({ key: h.id, title: h.title, category: h.category, agreement: "HOSTED_ONLY", hostedFindingId: h.id, hostedSeverity: h.severity });
  }
  const order = { BOTH: 0, LOCAL_ONLY: 1, HOSTED_ONLY: 2 } as const;
  return entries.sort((a, b) => order[a.agreement] - order[b.agreement]);
}

import type { ModelRunResult } from "@reposage/shared";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";
import { completeSession, emitSnapshot, emitStage, type AuditSession } from "./auditStore.js";
import { collectEvidence } from "./collector.js";
import { compileEvidence } from "./compiler.js";
import { runDeterministicEngine } from "./deterministic.js";
import { GeminiClient } from "./geminiClient.js";
import { GhCliBridge } from "./ghBridge.js";
import { describeGitHubError } from "./github.js";
import type { ModelClient } from "./modelClient.js";
import { OllamaClient } from "./ollamaClient.js";
import { buildConsensus, runModel } from "./orchestrator.js";

function clientsFor(mode: AuditSession["result"]["mode"]): ModelClient[] {
  if (mode === "local") return [new OllamaClient()];
  if (mode === "hosted") return [new GeminiClient()];
  return [new OllamaClient(), new GeminiClient()];
}

/** Full audit pipeline. Streams stage events and never rejects (errors become an ERROR stage). */
export async function runAuditPipeline(session: AuditSession): Promise<void> {
  const { result } = session;
  try {
    // 1. gh session guard
    emitStage(session, "AUTH_CHECK", "Verifying local GitHub CLI session…");
    // Token hydration runs alongside the status check so collection starts with a warm cache.
    const [auth] = await Promise.all([GhCliBridge.verifySession(), GhCliBridge.getEphemeralToken().catch(() => null)]);
    if (!auth.authenticated) throw Object.assign(new Error(auth.error ?? "gh is not authenticated."), { expose: true });
    emitStage(session, "AUTH_CHECK", `Authenticated as ${auth.username ?? "unknown"} via gh CLI.`);

    // 2. Evidence collection
    emitStage(session, "COLLECTING", `Collecting evidence for ${result.repo}…`);
    let evidence;
    try {
      evidence = await collectEvidence(result.repo);
    } catch (err) {
      const { message } = describeGitHubError(err);
      throw Object.assign(new Error(message), { expose: true });
    }
    session.validTreePaths = evidence.validTreePaths;
    result.metadata = evidence.metadata;
    result.treeFileCount = evidence.blobs.length;
    result.treeTruncated = evidence.treeTruncated;
    emitStage(session, "COLLECTING", `Collected ${evidence.blobs.length} tree paths and ${evidence.files.size} high-signal files.`, {
      durationMs: evidence.durationMs,
      files: [...evidence.files.keys()],
    });

    // 3. Deterministic scoring — always runs before (and independently of) any LLM.
    const health = runDeterministicEngine(evidence);
    result.health = health;
    emitStage(session, "DETERMINISTIC_DONE", `Health score ${health.overallScore}/100 (grade ${health.grade}).`, {
      score: health.overallScore,
      counts: health.counts,
      durationMs: health.durationMs,
    });
    emitSnapshot(session);

    // 4. Evidence manifest
    emitStage(session, "COMPILING", "Compiling and redacting the Evidence Manifest…");
    const compiled = compileEvidence(evidence, health, config.limits.maxManifestTokens);
    result.manifestSha256 = compiled.sha256;
    result.manifestTokenEstimate = compiled.tokenEstimate;
    emitStage(session, "COMPILING", `Manifest sealed: ~${compiled.tokenEstimate} tokens, ${compiled.manifest.redactions} redaction(s).`, {
      manifestSha256: compiled.sha256,
      tokenEstimate: compiled.tokenEstimate,
      redactions: compiled.manifest.redactions,
    });

    // 5. Gemma inference (parallel in compare mode, identical manifest bytes)
    const clients = clientsFor(result.mode);
    emitStage(session, "AI_INFERENCE", `Running ${clients.map((c) => c.modelId).join(" + ")}…`, {
      models: clients.map((c) => ({ runtime: c.runtime, modelId: c.modelId })),
    });
    const runs: ModelRunResult[] = await Promise.all(
      clients.map(async (client) => {
        const run = await runModel(client, compiled, evidence.validTreePaths, health);
        emitStage(
          session,
          "AI_INFERENCE",
          run.status === "SUCCESS"
            ? `${client.modelId} responded in ${run.telemetry?.latencyMs} ms.`
            : `${client.modelId} ${run.status.toLowerCase()}: ${run.error}`,
          { runtime: client.runtime, status: run.status },
        );
        return run;
      }),
    );
    result.models = runs;

    // 6. Verification summary + consensus
    const local = runs.find((r) => r.runtime === "OLLAMA_LOCAL");
    const hosted = runs.find((r) => r.runtime === "GOOGLE_AI_STUDIO");
    if (result.mode === "compare" && local?.status === "SUCCESS" && hosted?.status === "SUCCESS") {
      result.consensus = buildConsensus(local.verifiedFindings, hosted.verifiedFindings);
    }
    const verified = runs.reduce((s, r) => s + r.verifiedFindings.length, 0);
    const quarantined = runs.reduce((s, r) => s + r.quarantinedFindings.length, 0);
    emitStage(session, "VERIFIED", `Citation verifier: ${verified} verified, ${quarantined} quarantined.`, { verified, quarantined });

    emitStage(session, "COMPLETE", "Audit complete.");
    completeSession(session);
  } catch (err) {
    const e = err as Error & { expose?: boolean };
    const message = e.expose ? e.message : "Unexpected audit failure. Check API logs.";
    logger.error(`Audit ${result.auditId} failed:`, e);
    result.error = message;
    emitStage(session, "ERROR", message);
    completeSession(session);
  }
}

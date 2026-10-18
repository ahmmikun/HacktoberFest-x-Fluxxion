"use client";

import { FingerprintPattern, ShieldCheck, TriangleAlert } from "lucide-react";
import type { AuditResult, ModelTelemetry } from "@reposage/shared";
import { Badge, Card, cx, SEVERITY_TONE } from "./ui";

const METRICS: Array<{ key: keyof ModelTelemetry; label: string; fmt: (t: ModelTelemetry) => string; better?: "low" | "high" }> = [
  { key: "latencyMs", label: "Latency", fmt: (t) => `${t.latencyMs.toLocaleString()} ms`, better: "low" },
  { key: "schemaValidFirstTry", label: "Schema valid 1st try", fmt: (t) => (t.schemaValidFirstTry ? "Yes" : t.repairAttempted ? "No (repaired)" : "No") },
  { key: "totalFindings", label: "Total findings", fmt: (t) => String(t.totalFindings) },
  { key: "verifiedFindingsCount", label: "Verified findings", fmt: (t) => String(t.verifiedFindingsCount), better: "high" },
  { key: "unsupportedClaimsCount", label: "Unsupported claims", fmt: (t) => String(t.unsupportedClaimsCount), better: "low" },
  { key: "citationAccuracyPct", label: "Citation accuracy", fmt: (t) => `${t.citationAccuracyPct}%`, better: "high" },
];

/** Side-by-side E4B vs 26B telemetry scorecard + consensus matrix. */
export function ModelComparisonArena({ audit }: { audit: AuditResult }) {
  const runs = audit.models.filter((r) => r.telemetry);
  if (runs.length === 0) return null;
  const hashes = new Set(runs.map((r) => r.telemetry!.manifestSha256));
  const identical = hashes.size === 1 && runs.length > 1;

  const best = (key: keyof ModelTelemetry, better?: "low" | "high") => {
    if (!better || runs.length < 2) return null;
    const values = runs.map((r) => Number(r.telemetry![key]));
    const target = better === "low" ? Math.min(...values) : Math.max(...values);
    return values.every((v) => v === target) ? null : target;
  };

  return (
    <Card title="Model Comparison Arena">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <FingerprintPattern className="h-4 w-4 text-sky-400" aria-hidden="true" />
        <span className="text-zinc-400">manifest_sha256</span>
        <code className="break-all font-mono text-xs text-zinc-200">{audit.manifestSha256}</code>
        {runs.length > 1 &&
          (identical ? (
            <Badge tone="green">
              <ShieldCheck className="h-3 w-3" aria-hidden="true" /> Both models saw identical bytes
            </Badge>
          ) : (
            <Badge tone="red">
              <TriangleAlert className="h-3 w-3" aria-hidden="true" /> Manifest mismatch
            </Badge>
          ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <caption className="sr-only">Model telemetry comparison</caption>
          <thead className="bg-zinc-900 text-xs uppercase text-zinc-400">
            <tr>
              <th scope="col" className="px-3 py-2 text-left">Metric</th>
              {runs.map((r) => (
                <th key={r.runtime} scope="col" className="px-3 py-2 text-right">
                  {r.runtime === "OLLAMA_LOCAL" ? "E4B (local)" : r.runtime === "GROQ" ? "gpt-oss (Groq fallback)" : "26B (hosted)"}
                  <div className="font-mono text-[10px] normal-case text-zinc-500">{r.modelId}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {METRICS.map((m) => {
              const target = best(m.key, m.better);
              return (
                <tr key={m.key}>
                  <th scope="row" className="px-3 py-2 text-left font-normal text-zinc-300">
                    {m.label}
                  </th>
                  {runs.map((r) => (
                    <td key={r.runtime} className={cx("px-3 py-2 text-right font-mono", target !== null && Number(r.telemetry![m.key]) === target ? "text-emerald-300" : "text-zinc-200")}>
                      {m.fmt(r.telemetry!)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {audit.consensus.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold">Consensus matrix</h3>
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-sm">
              <caption className="sr-only">Findings agreement between models</caption>
              <thead className="bg-zinc-900 text-xs uppercase text-zinc-400">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left">Finding</th>
                  <th scope="col" className="px-3 py-2 text-left">Agreement</th>
                  <th scope="col" className="px-3 py-2 text-left">Local</th>
                  <th scope="col" className="px-3 py-2 text-left">Hosted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {audit.consensus.map((c) => (
                  <tr key={c.key}>
                    <td className="px-3 py-2">
                      {c.title}
                      <div className="text-[11px] text-zinc-500">{c.category}</div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={c.agreement === "BOTH" ? "green" : "zinc"}>{c.agreement === "BOTH" ? "Consensus" : c.agreement === "LOCAL_ONLY" ? "Local only" : "Hosted only"}</Badge>
                    </td>
                    <td className="px-3 py-2">{c.localSeverity ? <Badge tone={SEVERITY_TONE[c.localSeverity]}>{c.localSeverity}</Badge> : "—"}</td>
                    <td className="px-3 py-2">{c.hostedSeverity ? <Badge tone={SEVERITY_TONE[c.hostedSeverity]}>{c.hostedSeverity}</Badge> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}

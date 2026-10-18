"use client";

import { useMemo, useState } from "react";
import { Lightbulb, ShieldAlert, TriangleAlert, Zap } from "lucide-react";
import { RUNTIME_LABELS, type AuditResult, type FindingCategory, type ModelRunResult, type Severity } from "@reposage/shared";
import { FindingCard } from "./FindingCard";
import { Badge, Card, cx } from "./ui";

const SEVERITIES: Array<Severity | "ALL"> = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"];
const CATEGORIES: Array<FindingCategory | "ALL"> = ["ALL", "CI_CD", "TESTING", "DEPENDENCIES", "DOCUMENTATION", "SECURITY", "MAINTENANCE"];

const runtimeLabel = (r: ModelRunResult) => `${RUNTIME_LABELS[r.runtime]} · ${r.modelId}`;

/** Filterable VERIFIED findings + quarantine toggle for unverified claims. */
export function FindingsBoard({ audit }: { audit: AuditResult }) {
  const runs = audit.models;
  const [active, setActive] = useState(0);
  const [severity, setSeverity] = useState<Severity | "ALL">("ALL");
  const [category, setCategory] = useState<FindingCategory | "ALL">("ALL");
  const [showQuarantine, setShowQuarantine] = useState(false);
  const run = runs[Math.min(active, runs.length - 1)];

  const findings = useMemo(() => {
    if (!run) return [];
    const list = showQuarantine ? run.quarantinedFindings : run.verifiedFindings;
    return list.filter((f) => (severity === "ALL" || f.severity === severity) && (category === "ALL" || f.category === category));
  }, [run, showQuarantine, severity, category]);

  if (!run) return null;

  return (
    <Card title="AI findings (citation-verified)">
      {runs.length > 1 && (
        <div role="tablist" aria-label="Model" className="mb-4 flex gap-1 border-b border-zinc-800">
          {runs.map((r, i) => (
            <button
              key={r.runtime}
              role="tab"
              type="button"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              className={cx("-mb-px border-b-2 px-3 py-2 text-sm", i === active ? "border-sky-400 text-sky-200" : "border-transparent text-zinc-400 hover:text-zinc-200")}
            >
              {runtimeLabel(r)}
            </button>
          ))}
        </div>
      )}

      {run.fallbackFrom && (
        <p className="mb-3 flex items-start gap-2 rounded-lg border border-sky-800/60 bg-sky-950/30 p-2 text-xs text-sky-200">
          <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            Fallback engine: {run.fallbackFrom.modelId} was unavailable ({run.fallbackFrom.error}), so {run.modelId} analysed the same manifest.
          </span>
        </p>
      )}

      {run.status !== "SUCCESS" ? (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-amber-800 bg-amber-950/40 p-3 text-sm text-amber-200">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <div className="font-medium">
              {runtimeLabel(run)} {run.status === "FAILED" ? "unavailable" : "returned invalid output"}
            </div>
            <div className="text-amber-300/90">{run.error}</div>
            <div className="mt-1 text-xs text-amber-300/70">The deterministic health report above is unaffected.</div>
          </div>
        </div>
      ) : (
        <>
          {run.executiveSummary && <p className="mb-4 text-sm leading-relaxed text-zinc-200">{run.executiveSummary}</p>}
          <div className="mb-4 grid gap-3 md:grid-cols-2">
            {run.architecturalRisks.length > 0 && (
              <div className="rounded-lg border border-zinc-800 p-3">
                <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
                  <ShieldAlert className="h-4 w-4 text-red-400" aria-hidden="true" /> Architectural risks
                </h3>
                <ul className="list-disc space-y-0.5 pl-5 text-sm text-zinc-300">
                  {run.architecturalRisks.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
            {run.quickWins.length > 0 && (
              <div className="rounded-lg border border-zinc-800 p-3">
                <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
                  <Lightbulb className="h-4 w-4 text-amber-300" aria-hidden="true" /> Quick wins
                </h3>
                <ul className="list-disc space-y-0.5 pl-5 text-sm text-zinc-300">
                  {run.quickWins.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <label className="text-xs text-zinc-400" htmlFor="sev-filter">
              Severity
            </label>
            <select id="sev-filter" value={severity} onChange={(e) => setSeverity(e.target.value as Severity | "ALL")} className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm">
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s === "ALL" ? "All" : s}
                </option>
              ))}
            </select>
            <label className="text-xs text-zinc-400" htmlFor="cat-filter">
              Category
            </label>
            <select id="cat-filter" value={category} onChange={(e) => setCategory(e.target.value as FindingCategory | "ALL")} className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c === "ALL" ? "All" : c}
                </option>
              ))}
            </select>
            <label className="ml-auto flex items-center gap-1.5 text-sm text-zinc-300">
              <input type="checkbox" checked={showQuarantine} onChange={(e) => setShowQuarantine(e.target.checked)} className="accent-rose-500" />
              Show quarantine
              <Badge tone="rose">{run.quarantinedFindings.length}</Badge>
            </label>
          </div>

          {showQuarantine && (
            <p className="mb-3 text-xs text-rose-300">
              Quarantined claims cited files or checks that do not exist (or misrepresented a check status). They are excluded from the action plan and cannot be filed as issues.
            </p>
          )}

          <div className="space-y-3">
            {findings.map((f) => (
              <FindingCard key={f.id} finding={f} auditId={audit.auditId} runtime={run.runtime} repo={audit.repo} repoUrl={audit.metadata?.url} headSha={audit.metadata?.headSha} />
            ))}
            {findings.length === 0 && <p className="py-6 text-center text-sm text-zinc-400">{showQuarantine ? "No unverified claims — clean run." : "No findings match the filters."}</p>}
          </div>
        </>
      )}
    </Card>
  );
}

"use client";

import { useMemo, useState } from "react";
import type { CheckStatus, DimensionScore, HealthReport } from "@reposage/shared";
import { Badge, Card, cx, scoreColor, scoreStroke, STATUS_LABEL, STATUS_TONE } from "./ui";

function Gauge({ score, grade }: { score: number; grade: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 128 128" className="h-36 w-36" role="img" aria-label={`Health score ${score} out of 100, grade ${grade}`}>
      <circle cx="64" cy="64" r={r} fill="none" stroke="#27272a" strokeWidth="12" />
      <circle
        cx="64"
        cy="64"
        r={r}
        fill="none"
        stroke={scoreStroke(score)}
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${(score / 100) * c} ${c}`}
        transform="rotate(-90 64 64)"
      />
      <text x="64" y="64" textAnchor="middle" className="fill-zinc-100 text-[28px] font-bold">
        {score}
      </text>
      <text x="64" y="86" textAnchor="middle" className="fill-zinc-400 text-[12px]">
        Grade {grade}
      </text>
    </svg>
  );
}

function Radar({ dimensions }: { dimensions: DimensionScore[] }) {
  const size = 220;
  const cxy = size / 2;
  const R = 80;
  const n = dimensions.length;
  const point = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cxy + Math.cos(a) * R * v, cxy + Math.sin(a) * R * v] as const;
  };
  const polygon = dimensions.map((d, i) => point(i, (d.score ?? 0) / 100).join(",")).join(" ");
  const short: Record<string, string> = { CI_CD: "CI/CD", TESTING: "Tests", DEPS: "Deps", DOCS: "Docs", SECURITY: "Security", MAINTENANCE: "Maint." };
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-56 w-56" role="img" aria-label="Radar chart of dimension scores">
      {[0.25, 0.5, 0.75, 1].map((lvl) => (
        <polygon key={lvl} points={dimensions.map((_, i) => point(i, lvl).join(",")).join(" ")} fill="none" stroke="#3f3f46" strokeWidth="1" />
      ))}
      {dimensions.map((_, i) => {
        const [x, y] = point(i, 1);
        return <line key={i} x1={cxy} y1={cxy} x2={x} y2={y} stroke="#3f3f46" strokeWidth="1" />;
      })}
      <polygon points={polygon} fill="rgba(56,189,248,0.25)" stroke="#38bdf8" strokeWidth="2" />
      {dimensions.map((d, i) => {
        const [x, y] = point(i, 1.22);
        return (
          <text key={d.dimension} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="fill-zinc-300 text-[10px]">
            {short[d.dimension] ?? d.dimension}
          </text>
        );
      })}
    </svg>
  );
}

const FILTERS: Array<CheckStatus | "ALL"> = ["ALL", "FAIL", "WARN", "PASS", "SKIPPED_INSUFFICIENT_EVIDENCE"];

/** 0-100 gauge + radar + 6 deterministic dimension bars + rule breakdown. */
export function HealthScoreCard({ health, repoUrl, headSha }: { health: HealthReport; repoUrl?: string; headSha?: string | null }) {
  const [filter, setFilter] = useState<CheckStatus | "ALL">("ALL");
  const checks = useMemo(() => health.checks.filter((c) => filter === "ALL" || c.status === filter), [health.checks, filter]);

  return (
    <Card
      title="Repository Health Score"
      actions={<span className="text-xs text-zinc-400">100% deterministic · computed in {health.durationMs} ms before any AI</span>}
    >
      <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start">
        <div className="flex flex-col items-center gap-2">
          <Gauge score={health.overallScore} grade={health.grade} />
          <div className="flex flex-wrap justify-center gap-1">
            <Badge tone="green">{health.counts.pass} pass</Badge>
            <Badge tone="amber">{health.counts.warn} warn</Badge>
            <Badge tone="red">{health.counts.fail} fail</Badge>
            <Badge>{health.counts.skipped} skipped</Badge>
          </div>
        </div>
        <Radar dimensions={health.dimensions} />
        <ul className="w-full flex-1 space-y-2.5" aria-label="Dimension scores">
          {health.dimensions.map((d) => (
            <li key={d.dimension}>
              <div className="mb-1 flex justify-between text-sm">
                <span>
                  {d.label} <span className="text-xs text-zinc-500">({d.weightPct}%)</span>
                </span>
                <span className={cx("font-mono", scoreColor(d.score))}>{d.score === null ? "n/a" : d.score}</span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-zinc-800"
                role="progressbar"
                aria-label={d.label}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={d.score ?? 0}
              >
                <div className="h-full rounded-full" style={{ width: `${d.score ?? 0}%`, backgroundColor: scoreStroke(d.score) }} />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex flex-wrap items-center gap-1" role="group" aria-label="Filter checks by status">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={cx("rounded-full border px-2.5 py-0.5 text-xs", filter === f ? "border-sky-500 bg-sky-950 text-sky-200" : "border-zinc-700 text-zinc-400 hover:text-zinc-200")}
            >
              {f === "ALL" ? "All checks" : STATUS_LABEL[f]}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Deterministic rule results</caption>
            <thead className="bg-zinc-900 text-xs uppercase text-zinc-400">
              <tr>
                <th scope="col" className="px-3 py-2">Status</th>
                <th scope="col" className="px-3 py-2">Check</th>
                <th scope="col" className="px-3 py-2">Observed evidence</th>
                <th scope="col" className="px-3 py-2 text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {checks.map((c) => (
                <tr key={c.checkId} className="align-top">
                  <td className="px-3 py-2">
                    <Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{c.title}</div>
                    <div className="font-mono text-[11px] text-zinc-500">{c.checkId}</div>
                  </td>
                  <td className="px-3 py-2 text-zinc-300">
                    {c.observedEvidence}
                    {c.filePath && repoUrl && headSha && (
                      <a
                        href={`${repoUrl}/blob/${headSha}/${c.filePath.split("/").map(encodeURIComponent).join("/")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 font-mono text-xs text-sky-400 underline"
                      >
                        {c.filePath}
                      </a>
                    )}
                    {c.recommendation && c.status !== "PASS" && <div className="mt-1 text-xs text-zinc-400">→ {c.recommendation}</div>}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-zinc-400">
                    {c.status === "SKIPPED_INSUFFICIENT_EVIDENCE" ? "—" : `${c.earnedPoints}/${c.weight}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}

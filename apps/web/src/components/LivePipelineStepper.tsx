"use client";

import { TriangleAlert, CircleCheck, Circle, LoaderCircle } from "lucide-react";
import type { AuditStage, AuditStageEvent } from "@reposage/shared";
import type { StreamStatus } from "@/hooks/useAuditStream";
import { Card, cx } from "./ui";

const STEPS: Array<{ stage: AuditStage; label: string }> = [
  { stage: "AUTH_CHECK", label: "gh session" },
  { stage: "COLLECTING", label: "Evidence" },
  { stage: "DETERMINISTIC_DONE", label: "Scoring" },
  { stage: "COMPILING", label: "Manifest" },
  { stage: "AI_INFERENCE", label: "Gemma 4" },
  { stage: "VERIFIED", label: "Citations" },
  { stage: "COMPLETE", label: "Done" },
];

/** Real-time SSE progress with millisecond stage timings. */
export function LivePipelineStepper({ stages, status }: { stages: AuditStageEvent[]; status: StreamStatus }) {
  const failed = stages.find((s) => s.stage === "ERROR");
  const seen = new Set(stages.map((s) => s.stage));
  const lastIndex = Math.max(-1, ...STEPS.map((s, i) => (seen.has(s.stage) ? i : -1)));
  const latest = stages[stages.length - 1];

  const startedAt = (stage: AuditStage) => stages.find((s) => s.stage === stage)?.elapsedMs;

  return (
    <Card title="Live audit pipeline">
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {STEPS.map((step, i) => {
          const done = i < lastIndex || (i === lastIndex && (step.stage === "COMPLETE" || status === "complete"));
          const active = i === lastIndex && !done && !failed;
          const errored = Boolean(failed) && i === lastIndex + 1;
          const start = startedAt(step.stage);
          const next = STEPS.slice(i + 1).map((s) => startedAt(s.stage)).find((v) => v !== undefined) ?? (done ? latest?.elapsedMs : undefined);
          const duration = start !== undefined && next !== undefined ? next - start : undefined;
          return (
            <li
              key={step.stage}
              className={cx(
                "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm",
                done && "border-emerald-800/60 bg-emerald-950/30",
                active && "border-sky-700 bg-sky-950/40",
                errored && "border-red-800 bg-red-950/40",
                !done && !active && !errored && "border-zinc-800 text-zinc-500",
              )}
              aria-current={active ? "step" : undefined}
            >
              {done ? (
                <CircleCheck className="h-4 w-4 shrink-0 text-emerald-400" aria-label="done" />
              ) : active ? (
                <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-sky-400" aria-label="in progress" />
              ) : errored ? (
                <TriangleAlert className="h-4 w-4 shrink-0 text-red-400" aria-label="failed" />
              ) : (
                <Circle className="h-4 w-4 shrink-0" aria-label="pending" />
              )}
              <span className="min-w-0">
                <span className="block truncate font-medium">{step.label}</span>
                <span className="block font-mono text-[11px] text-zinc-400">{duration !== undefined && step.stage !== "COMPLETE" ? `${duration} ms` : start !== undefined ? `@${start} ms` : "—"}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className={cx("mt-3 text-sm", failed ? "text-red-300" : "text-zinc-400")} role="status" aria-live="polite">
        {status === "connecting" ? "Connecting to audit stream…" : (latest?.message ?? "Waiting for events…")}
      </p>
      {stages.length > 0 && (
        <details className="mt-2 text-xs text-zinc-400">
          <summary className="cursor-pointer select-none">Event log ({stages.length})</summary>
          <ul className="mt-2 max-h-48 space-y-0.5 overflow-y-auto font-mono">
            {stages.map((s) => (
              <li key={`${s.timestamp}-${s.message}`}>
                <span className="text-zinc-500">{String(s.elapsedMs).padStart(6, " ")}ms</span> <span className="text-sky-400">{s.stage}</span> {s.message}
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
}

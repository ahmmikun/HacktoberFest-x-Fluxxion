"use client";

import { CircleCheck, Cloud, Cpu, KeyRound, RefreshCw, CircleX } from "lucide-react";
import type { PreflightResponse } from "@reposage/shared";
import { Button, cx } from "./ui";

function Pill({ ok, warn, icon, label, detail }: { ok: boolean; warn?: boolean; icon: React.ReactNode; label: string; detail: string }) {
  const tone = ok ? "border-emerald-700/60 bg-emerald-950/60" : warn ? "border-amber-700/60 bg-amber-950/60" : "border-red-700/60 bg-red-950/60";
  return (
    <li className={cx("flex min-w-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm", tone)}>
      {icon}
      <span className="font-medium">{label}</span>
      <span className="truncate text-xs text-zinc-300">{detail}</span>
      {ok ? (
        <CircleCheck className="h-4 w-4 shrink-0 text-emerald-400" aria-label="ready" />
      ) : (
        <CircleX className={cx("h-4 w-4 shrink-0", warn ? "text-amber-400" : "text-red-400")} aria-label="not ready" />
      )}
    </li>
  );
}

/** Green/red pills for gh, Ollama (E4B) and Google AI Studio (26B). */
export function PreflightBanner({ data, loading, onRetry }: { data: PreflightResponse | null; loading: boolean; onRetry: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3" aria-live="polite">
      {data ? (
        <ul className="flex flex-wrap gap-2" aria-label="System preflight status">
          <Pill
            ok={data.gh.authenticated}
            icon={<KeyRound className="h-4 w-4" aria-hidden="true" />}
            label="gh CLI"
            detail={data.gh.authenticated ? `@${data.gh.username}` : data.gh.installed ? "not logged in" : "not installed"}
          />
          <Pill
            ok={data.ollama.reachable && data.ollama.modelAvailable}
            warn
            icon={<Cpu className="h-4 w-4" aria-hidden="true" />}
            label="Ollama"
            detail={data.ollama.reachable ? (data.ollama.modelAvailable ? data.ollama.model : `${data.ollama.model} not pulled`) : "offline"}
          />
          <Pill
            ok={data.googleAiStudio.configured}
            warn
            icon={<Cloud className="h-4 w-4" aria-hidden="true" />}
            label="AI Studio"
            detail={data.googleAiStudio.configured ? data.googleAiStudio.model : "no API key"}
          />
        </ul>
      ) : (
        <span className="text-sm text-zinc-400">{loading ? "Running preflight checks…" : "Preflight unavailable"}</span>
      )}
      <Button variant="ghost" onClick={onRetry} disabled={loading} aria-label="Re-run preflight checks">
        <RefreshCw className={cx("h-4 w-4", loading && "animate-spin")} aria-hidden="true" />
        {loading ? "Checking" : "Recheck"}
      </Button>
    </div>
  );
}

"use client";

import { Cloud, Cpu, Scale } from "lucide-react";
import type { AuditMode, PreflightResponse } from "@reposage/shared";
import { cx } from "./ui";

const MODES: Array<{ id: AuditMode; label: string; sub: string; icon: React.ReactNode }> = [
  { id: "local", label: "Local Privacy Mode", sub: "Gemma 4 E4B via Ollama — evidence never leaves this machine", icon: <Cpu className="h-5 w-5" aria-hidden="true" /> },
  { id: "hosted", label: "Hosted Mode", sub: "Gemma 4 26B via Google AI Studio, Groq gpt-oss-120b fallback — redacted manifest only", icon: <Cloud className="h-5 w-5" aria-hidden="true" /> },
  { id: "compare", label: "Comparison / Consensus", sub: "Local vs hosted on the identical SHA-256 manifest", icon: <Scale className="h-5 w-5" aria-hidden="true" /> },
];

export function modeWarning(mode: AuditMode, p: PreflightResponse | null): string | null {
  if (!p) return null;
  const local = p.ollama.reachable && p.ollama.modelAvailable;
  const hosted = p.googleAiStudio.configured || p.groq.configured;
  if (mode === "local" && !local) return "Ollama/E4B is not ready — the audit will fall back to the deterministic report.";
  if (mode === "hosted" && !hosted) return "Neither GOOGLE_AI_API_KEY nor GROQ_API_KEY is set — the audit will fall back to the deterministic report.";
  if (mode !== "local" && hosted && !p.googleAiStudio.configured) return "AI Studio key not set — the hosted slot will use the Groq fallback.";
  if (mode === "compare" && (!local || !hosted)) return `${!local ? "Ollama/E4B" : "Hosted engines"} not ready — only available engines will run.`;
  return null;
}

/** Execution mode picker (FR-AI-01). */
export function ModeSelector({ value, onChange, preflight }: { value: AuditMode; onChange: (m: AuditMode) => void; preflight: PreflightResponse | null }) {
  const warning = modeWarning(value, preflight);
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-zinc-200">Analysis mode</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {MODES.map((m) => (
          <label
            key={m.id}
            className={cx(
              "flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-sky-400",
              value === m.id ? "border-sky-500 bg-sky-950/40" : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-600",
            )}
          >
            <input type="radio" name="mode" value={m.id} checked={value === m.id} onChange={() => onChange(m.id)} className="sr-only" />
            <span className={value === m.id ? "text-sky-400" : "text-zinc-400"}>{m.icon}</span>
            <span>
              <span className="block text-sm font-medium">{m.label}</span>
              <span className="block text-xs text-zinc-400">{m.sub}</span>
            </span>
          </label>
        ))}
      </div>
      {warning && <p className="mt-2 text-xs text-amber-300">{warning}</p>}
    </fieldset>
  );
}

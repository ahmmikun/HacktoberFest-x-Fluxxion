"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import type { AuditMode, PreflightResponse } from "@reposage/shared";
import { DiagnosticPanel } from "@/components/DiagnosticPanel";
import { ModeSelector } from "@/components/ModeSelector";
import { PreflightBanner } from "@/components/PreflightBanner";
import { RepoBrowser } from "@/components/RepoBrowser";
import { api } from "@/lib/api";

/** Mission Control: preflight status + repository browser. */
export default function HomePage() {
  const router = useRouter();
  const [preflight, setPreflight] = useState<PreflightResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<AuditMode>("compare");

  const runPreflight = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.preflight();
      setPreflight(data);
      setApiError(null);
      // Default to the best available engine configuration.
      const local = data.ollama.reachable && data.ollama.modelAvailable;
      const hosted = data.googleAiStudio.configured || data.groq.configured;
      setMode((m) => (m === "compare" && !(local && hosted) ? (local ? "local" : hosted ? "hosted" : "compare") : m));
    } catch (err) {
      setApiError((err as Error).message);
      setPreflight(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void runPreflight();
  }, [runPreflight]);

  const ghReady = Boolean(preflight?.gh.authenticated);

  const startAudit = (slug: string) => {
    const [owner, repo] = slug.split("/");
    router.push(`/audit/${encodeURIComponent(owner!)}/${encodeURIComponent(repo!)}?mode=${mode}`);
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mission Control</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Deterministic health scoring runs first. Gemma 4 interprets the evidence, and every AI claim is verified against the real Git tree before it reaches
            your action plan.
          </p>
        </div>
        <PreflightBanner data={preflight} loading={loading} onRetry={() => void runPreflight()} />
      </section>

      {!loading && (!ghReady || apiError) ? (
        <DiagnosticPanel preflight={preflight} apiError={apiError} onRetry={() => void runPreflight()} retrying={loading} />
      ) : (
        <>
          <ModeSelector value={mode} onChange={setMode} preflight={preflight} />
          {ghReady && <RepoBrowser onSelect={startAudit} />}
        </>
      )}

      <p className="flex items-center gap-1.5 text-xs text-zinc-500">
        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        Your gh token stays in the local API process memory. Nothing is pasted, stored or sent to the browser.
      </p>
    </div>
  );
}

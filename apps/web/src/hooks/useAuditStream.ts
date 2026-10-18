"use client";

import { useEffect, useState } from "react";
import type { AuditResult, AuditStageEvent } from "@reposage/shared";
import { api } from "@/lib/api";

export type StreamStatus = "idle" | "connecting" | "streaming" | "complete" | "error";

export interface AuditStreamState {
  status: StreamStatus;
  stages: AuditStageEvent[];
  result: AuditResult | null;
  error: string | null;
}

const INITIAL: AuditStreamState = { status: "idle", stages: [], result: null, error: null };

/** Subscribes to the audit SSE stream (FR-ACT-01); falls back to a snapshot fetch on disconnect. */
export function useAuditStream(auditId: string | null): AuditStreamState {
  const [state, setState] = useState<AuditStreamState>(INITIAL);

  useEffect(() => {
    if (!auditId) {
      setState(INITIAL);
      return;
    }
    let finished = false;
    setState({ ...INITIAL, status: "connecting" });

    const source = new EventSource(api.streamUrl(auditId));

    const parse = <T,>(e: MessageEvent): T | null => {
      try {
        return JSON.parse(e.data) as T;
      } catch {
        return null;
      }
    };

    source.addEventListener("open", () => setState((s) => (s.status === "connecting" ? { ...s, status: "streaming" } : s)));

    source.addEventListener("stage", (e) => {
      const stage = parse<AuditStageEvent>(e as MessageEvent);
      if (!stage) return;
      // History is replayed on reconnect; dedupe by timestamp + message.
      setState((s) =>
        s.stages.some((x) => x.timestamp === stage.timestamp && x.message === stage.message)
          ? s
          : { ...s, status: "streaming", stages: [...s.stages, stage] },
      );
    });

    source.addEventListener("snapshot", (e) => {
      const result = parse<AuditResult>(e as MessageEvent);
      if (result) setState((s) => ({ ...s, result }));
    });

    source.addEventListener("complete", (e) => {
      const result = parse<AuditResult>(e as MessageEvent);
      finished = true;
      source.close();
      setState((s) => ({
        ...s,
        result: result ?? s.result,
        status: result?.error ? "error" : "complete",
        error: result?.error ?? null,
      }));
    });

    source.onerror = () => {
      if (finished) return;
      if (source.readyState === EventSource.CLOSED) {
        // Stream is gone (expired audit or API restart): try a final snapshot.
        api
          .getAudit(auditId)
          .then((result) =>
            setState((s) => ({ ...s, result, status: result.completedAt ? (result.error ? "error" : "complete") : s.status, error: result.error ?? null })),
          )
          .catch((err: Error) => setState((s) => ({ ...s, status: "error", error: err.message })));
      }
    };

    return () => {
      finished = true;
      source.close();
    };
  }, [auditId]);

  return state;
}

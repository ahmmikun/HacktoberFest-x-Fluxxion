import { randomUUID } from "node:crypto";
import type { AuditMode, AuditResult, AuditStage, AuditStageEvent } from "@reposage/shared";

export type SseMessage =
  | { event: "stage"; data: AuditStageEvent }
  | { event: "snapshot"; data: AuditResult }
  | { event: "complete"; data: AuditResult };

export interface AuditSession {
  result: AuditResult;
  startedAt: number;
  messages: SseMessage[];
  listeners: Set<(msg: SseMessage) => void>;
  done: boolean;
  /** Server-side only: ground truth for verification & issue creation. Never sent to clients. */
  validTreePaths: Set<string>;
  createdIssues: Map<string, string>;
}

const MAX_SESSIONS = 50;
const SESSION_TTL_MS = 60 * 60 * 1000;
const sessions = new Map<string, AuditSession>();

export function createSession(repo: string, mode: AuditMode): AuditSession {
  evictExpired();
  const auditId = randomUUID();
  const session: AuditSession = {
    result: {
      auditId,
      repo,
      mode,
      createdAt: new Date().toISOString(),
      completedAt: null,
      metadata: null,
      health: null,
      manifestSha256: null,
      manifestTokenEstimate: null,
      models: [],
      consensus: [],
      treeFileCount: null,
      treeTruncated: false,
    },
    startedAt: Date.now(),
    messages: [],
    listeners: new Set(),
    done: false,
    validTreePaths: new Set(),
    createdIssues: new Map(),
  };
  sessions.set(auditId, session);
  return session;
}

export function getSession(id: string): AuditSession | undefined {
  return sessions.get(id);
}

function publish(session: AuditSession, msg: SseMessage) {
  session.messages.push(msg);
  for (const listener of session.listeners) {
    try {
      listener(msg);
    } catch {
      /* a broken client connection must not break the pipeline */
    }
  }
}

export function emitStage(session: AuditSession, stage: AuditStage, message: string, detail?: Record<string, unknown>) {
  publish(session, {
    event: "stage",
    data: {
      type: "stage",
      auditId: session.result.auditId,
      stage,
      message,
      elapsedMs: Date.now() - session.startedAt,
      timestamp: new Date().toISOString(),
      ...(detail ? { detail } : {}),
    },
  });
}

export function emitSnapshot(session: AuditSession) {
  publish(session, { event: "snapshot", data: structuredClone(session.result) });
}

export function completeSession(session: AuditSession) {
  session.done = true;
  session.result.completedAt = new Date().toISOString();
  publish(session, { event: "complete", data: structuredClone(session.result) });
}

function evictExpired() {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (s.done && now - s.startedAt > SESSION_TTL_MS) sessions.delete(id);
  }
  // Hard cap: drop oldest finished sessions first.
  if (sessions.size >= MAX_SESSIONS) {
    const finished = [...sessions.entries()].filter(([, s]) => s.done).sort((a, b) => a[1].startedAt - b[1].startedAt);
    for (const [id] of finished.slice(0, sessions.size - MAX_SESSIONS + 1)) sessions.delete(id);
  }
}

export function activeSessionCount(): number {
  return [...sessions.values()].filter((s) => !s.done).length;
}

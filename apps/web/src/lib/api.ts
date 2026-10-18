import type {
  AuditMode,
  AuditResult,
  CreateAuditResponse,
  CreateIssueResponse,
  ModelRuntime,
  PreflightResponse,
  RepoListResponse,
} from "@reposage/shared";

export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1").replace(/\/+$/, "");

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

async function request<T>(path: string, init?: RequestInit, as: "json" | "text" = "json"): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      cache: "no-store",
      headers: { ...(init?.body ? { "content-type": "application/json" } : {}), ...init?.headers },
    });
  } catch {
    throw new ApiClientError(0, `Cannot reach the RepoSage API at ${API_BASE}. Is it running (npm run dev)?`);
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new ApiClientError(res.status, body?.error ?? `Request failed with HTTP ${res.status}`);
  }
  return (as === "json" ? res.json() : res.text()) as Promise<T>;
}

export interface RepoQuery {
  q?: string;
  visibility?: "all" | "public" | "private";
  includeArchived?: boolean;
  after?: string | null;
  first?: number;
}

export const api = {
  preflight: () => request<PreflightResponse>("/system/preflight"),

  listRepos: (query: RepoQuery) => {
    const params = new URLSearchParams();
    if (query.q) params.set("q", query.q);
    if (query.visibility) params.set("visibility", query.visibility);
    if (query.includeArchived) params.set("includeArchived", "true");
    if (query.after) params.set("after", query.after);
    if (query.first) params.set("first", String(query.first));
    return request<RepoListResponse>(`/repos?${params.toString()}`);
  },

  createAudit: (repo: string, mode: AuditMode) =>
    request<CreateAuditResponse>("/audits", { method: "POST", body: JSON.stringify({ repo, mode }) }),

  getAudit: (auditId: string) => request<AuditResult>(`/audits/${encodeURIComponent(auditId)}`),

  exportMarkdown: (auditId: string) =>
    request<string>(`/audits/${encodeURIComponent(auditId)}/export`, { method: "POST" }, "text"),

  createIssue: (auditId: string, modelRuntime: ModelRuntime, findingId: string) =>
    request<CreateIssueResponse>("/actions/create-issue", {
      method: "POST",
      body: JSON.stringify({ auditId, modelRuntime, findingId, confirm: true }),
    }),

  streamUrl: (auditId: string) => `${API_BASE}/audits/${encodeURIComponent(auditId)}/stream`,
};

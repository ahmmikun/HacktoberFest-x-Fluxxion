"use client";

import { useState } from "react";
import {
  Bot,
  Check,
  ExternalLink,
  FileCode,
  GitPullRequestCreate,
  Hash,
  LoaderCircle,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  generateFindingFixPrompt,
  type AuditFinding,
  type AuditResult,
  type ModelRuntime,
} from "@reposage/shared";
import { api } from "@/lib/api";
import { Modal } from "./Modal";
import { Badge, Button, cx, SEVERITY_TONE } from "./ui";

interface Props {
  finding: AuditFinding;
  auditId: string;
  runtime: ModelRuntime;
  repo: string;
  repoUrl?: string;
  headSha?: string | null;
  audit?: AuditResult;
  onOpenPromptModal?: (findingId: string) => void;
}

/** Severity, citation badges, remediation steps and the confirmed "Create gh Issue" action (FR-ACT-03). */
export function FindingCard({ finding, auditId, runtime, repo, repoUrl, headSha, audit, onOpenPromptModal }: Props) {
  const verified = finding.verificationStatus === "VERIFIED";
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [issueUrl, setIssueUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [promptCopied, setPromptCopied] = useState(false);

  const fileUrl = (path: string) =>
    repoUrl && headSha && path !== "REPO_ROOT" ? `${repoUrl}/blob/${headSha}/${path.split("/").map(encodeURIComponent).join("/")}` : null;

  const copyFixPrompt = () => {
    const baseAudit: AuditResult = audit ?? {
      auditId,
      repo,
      mode: "hosted",
      createdAt: new Date().toISOString(),
      completedAt: null,
      metadata: repoUrl
        ? {
            nameWithOwner: repo,
            description: null,
            url: repoUrl,
            isArchived: false,
            isDisabled: false,
            isPrivate: false,
            isFork: false,
            pushedAt: null,
            lastCommitAt: null,
            defaultBranch: null,
            headSha: headSha ?? null,
            stars: 0,
            forks: 0,
            license: null,
            languages: [],
            openIssues: 0,
            closedIssues: 0,
            openPullRequests: 0,
            closedPullRequests: 0,
            mergedPullRequests: 0,
            branchProtection: null,
            branchProtectionVisible: false,
            hasIssuesEnabled: true,
            securityPolicyUrl: null,
            contributingUrl: null,
            viewerPermission: null,
            openIssueSample: [],
          }
        : null,
      health: null,
      manifestSha256: null,
      manifestTokenEstimate: null,
      models: [],
      consensus: [],
      treeFileCount: null,
      treeTruncated: false,
    };

    const res = generateFindingFixPrompt(baseAudit, finding, { preset: "agent" });
    void navigator.clipboard.writeText(res.prompt).then(() => {
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    });
  };

  const createIssue = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await api.createIssue(auditId, runtime, finding.id);
      setIssueUrl(res.issueUrl);
      setConfirmOpen(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <article className={cx("rounded-xl border p-4", verified ? "border-zinc-800 bg-zinc-900/60" : "border-rose-900/70 bg-rose-950/20")} aria-label={finding.title}>
      <header className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-semibold">{finding.title}</h3>
        <div className="flex flex-wrap gap-1">
          <Badge tone={SEVERITY_TONE[finding.severity]}>{finding.severity}</Badge>
          <Badge>P{finding.suggestedPriority}</Badge>
          <Badge tone="violet">{finding.category.replace("_", "/")}</Badge>
          {verified ? (
            <Badge tone="green" title="Every citation exists in the Git tree / deterministic rules">
              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
              Verified
            </Badge>
          ) : (
            <Badge tone="rose" title="Citation failed verification">
              <ShieldAlert className="h-3 w-3" aria-hidden="true" />
              {finding.verificationStatus?.replace("_", " ")}
            </Badge>
          )}
        </div>
      </header>

      <p className="mb-3 text-sm text-zinc-300">{finding.impact}</p>

      <div className="mb-3">
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">Remediation</h4>
        <ol className="list-decimal space-y-0.5 pl-5 text-sm text-zinc-200">
          {finding.remediationSteps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5" aria-label="Evidence citations">
        {finding.evidenceRefs.map((ref, i) => {
          const url = fileUrl(ref.filePath);
          return (
            <span key={i} className="inline-flex flex-wrap items-center gap-1 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 font-mono text-[11px] text-zinc-300" title={ref.snippetQuote}>
              <FileCode className="h-3 w-3 text-sky-400" aria-hidden="true" />
              {url ? (
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-sky-300 underline">
                  {ref.filePath}
                </a>
              ) : (
                ref.filePath
              )}
              {ref.checkId && (
                <>
                  <Hash className="ml-1 h-3 w-3 text-violet-400" aria-hidden="true" />
                  {ref.checkId}
                </>
              )}
            </span>
          );
        })}
      </div>

      {finding.verificationNotes && finding.verificationNotes.length > 0 && (
        <ul className="mb-3 list-disc pl-5 text-xs text-rose-300">
          {finding.verificationNotes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}

      <footer className="flex flex-wrap items-center gap-2 border-t border-zinc-800/80 pt-3">
        {verified && (
          <>
            {issueUrl ? (
              <a href={issueUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-emerald-300 underline">
                <ExternalLink className="h-4 w-4" aria-hidden="true" /> Issue created
              </a>
            ) : (
              <Button onClick={() => setConfirmOpen(true)}>
                <GitPullRequestCreate className="h-4 w-4" aria-hidden="true" />
                Create gh Issue
              </Button>
            )}
          </>
        )}

        <Button
          variant="secondary"
          onClick={copyFixPrompt}
          title="Copy a prompt specifically formatted to fix this finding in Claude, Cursor, or ChatGPT"
          className="border-amber-500/30 hover:border-amber-400 hover:bg-amber-950/20"
        >
          {promptCopied ? (
            <>
              <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <span className="text-emerald-300">Prompt Copied!</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-amber-400" aria-hidden="true" />
              Copy Fix Prompt
            </>
          )}
        </Button>

        {onOpenPromptModal && (
          <Button
            variant="ghost"
            onClick={() => onOpenPromptModal(finding.id)}
            title="Open in AI Agent Prompt Generator"
            className="text-zinc-300 hover:text-amber-200"
          >
            <Bot className="h-4 w-4 text-sky-400" aria-hidden="true" />
            Agent Studio
          </Button>
        )}

        {error && !confirmOpen && <span className="text-xs text-red-300">{error}</span>}
      </footer>


      <Modal open={confirmOpen} onClose={() => !creating && setConfirmOpen(false)} title="Create GitHub issue?">
        <p className="mb-2 text-sm text-zinc-300">
          This runs <code className="font-mono text-xs">gh issue create</code> as your GitHub account on <strong>{repo}</strong>. The issue is public if the repository is public.
        </p>
        <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm">
          <div className="font-medium">[RepoSage Audit] {finding.title}</div>
          <div className="mt-1 text-xs text-zinc-400">
            {finding.severity} · P{finding.suggestedPriority} · {finding.remediationSteps.length} remediation step(s) · {finding.evidenceRefs.length} citation(s)
          </div>
        </div>
        {error && (
          <p role="alert" className="mb-3 text-sm text-red-300">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button onClick={() => setConfirmOpen(false)} disabled={creating}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void createIssue()} disabled={creating}>
            {creating && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Create issue
          </Button>
        </div>
      </Modal>
    </article>
  );
}

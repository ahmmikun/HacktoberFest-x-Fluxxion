"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, FileDown, GitBranch, LoaderCircle, Lock, RotateCcw } from "lucide-react";
import { AuditModeSchema, REPO_SLUG_REGEX, type AuditMode } from "@reposage/shared";
import { FindingsBoard } from "@/components/FindingsBoard";
import { HealthScoreCard } from "@/components/HealthScoreCard";
import { LivePipelineStepper } from "@/components/LivePipelineStepper";
import { MarkdownPreviewModal } from "@/components/MarkdownPreviewModal";
import { ModelComparisonArena } from "@/components/ModelComparisonArena";
import { Badge, Button, Card } from "@/components/ui";
import { useAuditStream } from "@/hooks/useAuditStream";
import { api } from "@/lib/api";

const MODE_LABEL: Record<AuditMode, string> = { local: "Local · E4B", hosted: "Hosted · 26B", compare: "Compare · E4B vs 26B" };

function AuditWorkspace() {
  const params = useParams<{ owner: string; repo: string }>();
  const search = useSearchParams();
  const router = useRouter();

  const slug = `${decodeURIComponent(params.owner)}/${decodeURIComponent(params.repo)}`;
  const modeParse = AuditModeSchema.safeParse(search.get("mode"));
  const mode: AuditMode = modeParse.success ? modeParse.data : "compare";
  const urlAuditId = search.get("auditId");

  const [auditId, setAuditId] = useState<string | null>(urlAuditId);
  const [startError, setStartError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const startedFor = useRef<string | null>(null);

  // Start a new audit once per (repo, mode) unless the URL already carries an auditId.
  useEffect(() => {
    if (urlAuditId) {
      setAuditId(urlAuditId);
      return;
    }
    if (!REPO_SLUG_REGEX.test(slug)) {
      setStartError("Invalid repository identifier.");
      return;
    }
    const key = `${slug}:${mode}`;
    if (startedFor.current === key) return; // guards React StrictMode double-invocation
    startedFor.current = key;
    api
      .createAudit(slug, mode)
      .then(({ auditId: id }) => {
        setAuditId(id);
        router.replace(`/audit/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.repo)}?mode=${mode}&auditId=${id}`, { scroll: false });
      })
      .catch((err: Error) => setStartError(err.message));
  }, [slug, mode, urlAuditId, router, params.owner, params.repo]);

  const { stages, result, status, error } = useAuditStream(auditId);
  const meta = result?.metadata;
  const done = status === "complete" || status === "error";

  const rerun = () => {
    startedFor.current = null;
    setAuditId(null);
    router.replace(`/audit/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.repo)}?mode=${mode}`, { scroll: false });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/" className="mb-1 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-200">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Mission Control
          </Link>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight">
            {slug}
            {meta?.isPrivate && (
              <Badge tone="amber">
                <Lock className="h-3 w-3" aria-hidden="true" /> private
              </Badge>
            )}
            <Badge tone="sky">{MODE_LABEL[mode]}</Badge>
          </h1>
          {meta && (
            <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
              {meta.description && <span className="max-w-xl truncate">{meta.description}</span>}
              {meta.defaultBranch && (
                <span className="inline-flex items-center gap-1 font-mono">
                  <GitBranch className="h-3 w-3" aria-hidden="true" />
                  {meta.defaultBranch}@{meta.headSha?.slice(0, 7)}
                </span>
              )}
              <span>{result?.treeFileCount ?? 0} files{result?.treeTruncated ? " (tree truncated)" : ""}</span>
              {result?.manifestTokenEstimate != null && <span>manifest ~{result.manifestTokenEstimate} tokens</span>}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={rerun} disabled={!done}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Re-run
          </Button>
          <Button variant="primary" onClick={() => setReportOpen(true)} disabled={!done || !auditId}>
            <FileDown className="h-4 w-4" aria-hidden="true" /> Export Markdown
          </Button>
        </div>
      </div>

      {startError ? (
        <Card className="border-red-800">
          <p role="alert" className="text-sm text-red-300">
            Could not start the audit: {startError}
          </p>
        </Card>
      ) : (
        <LivePipelineStepper stages={stages} status={status} />
      )}

      {error && status === "error" && !startError && (
        <Card className="border-red-800">
          <p role="alert" className="text-sm text-red-300">
            {error}
          </p>
        </Card>
      )}

      {result?.health ? (
        <HealthScoreCard health={result.health} repoUrl={meta?.url} headSha={meta?.headSha} />
      ) : (
        !startError &&
        status !== "error" && (
          <Card>
            <p className="flex items-center gap-2 text-sm text-zinc-400">
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Collecting evidence and computing the deterministic health score…
            </p>
          </Card>
        )
      )}

      {result && result.models.length > 0 && (
        <>
          <FindingsBoard audit={result} />
          <ModelComparisonArena audit={result} />
        </>
      )}

      {result?.health && !done && (
        <Card>
          <p className="flex items-center gap-2 text-sm text-zinc-400">
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Gemma 4 is analysing the sealed evidence manifest…
          </p>
        </Card>
      )}

      {auditId && <MarkdownPreviewModal auditId={auditId} repo={slug} open={reportOpen} onClose={() => setReportOpen(false)} />}
    </div>
  );
}

export default function AuditPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-400">Loading audit workspace…</p>}>
      <AuditWorkspace />
    </Suspense>
  );
}

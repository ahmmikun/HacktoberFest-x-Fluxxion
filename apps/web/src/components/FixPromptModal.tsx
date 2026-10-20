"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import {
  Bot,
  Check,
  Copy,
  Download,
  FileCode,
  FileText,
  SlidersHorizontal,
  Sparkles,
  Terminal,
} from "lucide-react";
import {
  generateFindingFixPrompt,
  generateRemediationPrompt,
  type AuditResult,
  type FixPromptPreset,
  type FixPromptScope,
} from "@reposage/shared";
import { Modal } from "./Modal";
import { Badge, Button, cx } from "./ui";

interface Props {
  audit: AuditResult;
  open: boolean;
  onClose: () => void;
  initialFindingId?: string | null;
}

const PRESET_OPTIONS: Array<{
  id: FixPromptPreset;
  label: string;
  icon: typeof Bot;
  description: string;
}> = [
  {
    id: "agent",
    label: "Autonomous Agent",
    icon: Bot,
    description: "Claude Code, Devin, Roo Code, Antigravity (execution protocol, tool rules & verify steps)",
  },
  {
    id: "cursor",
    label: "Cursor & Windsurf",
    icon: Sparkles,
    description: "Composer rules with @file context tagging for surgical IDE modifications",
  },
  {
    id: "aider",
    label: "Aider CLI",
    icon: Terminal,
    description: "Terminal pair programmer format with /add context commands & diff structure",
  },
  {
    id: "generic",
    label: "Universal LLM",
    icon: FileCode,
    description: "Ready-to-paste prompt for ChatGPT, Claude 3.7 Sonnet, Gemini 2.5, or DeepSeek",
  },
];

export function FixPromptModal({ audit, open, onClose, initialFindingId }: Props) {
  // Best available model run
  const run = audit.models.find((m) => m.status === "SUCCESS") ?? audit.models[0];
  const allVerified = run?.verifiedFindings ?? [];
  const criticalHighCount = allVerified.filter((f) => f.severity === "CRITICAL" || f.severity === "HIGH").length;

  const [preset, setPreset] = useState<FixPromptPreset>("agent");
  const [scope, setScope] = useState<FixPromptScope>(initialFindingId ? "single" : "all");
  const [selectedFindingId, setSelectedFindingId] = useState<string>(
    initialFindingId ?? allVerified[0]?.id ?? "",
  );
  const [includeChecks, setIncludeChecks] = useState(true);
  const [includeSnippets, setIncludeSnippets] = useState(true);
  const [viewMode, setViewMode] = useState<"preview" | "raw">("preview");
  const [copied, setCopied] = useState(false);

  // Sync initialFindingId when opened for a specific finding
  useEffect(() => {
    if (initialFindingId) {
      setScope("single");
      setSelectedFindingId(initialFindingId);
    }
  }, [initialFindingId]);

  // Compute the prompt in real-time
  const generated = useMemo(() => {
    if (scope === "single" && selectedFindingId) {
      const targetFinding = allVerified.find((f) => f.id === selectedFindingId);
      if (targetFinding) {
        return generateFindingFixPrompt(audit, targetFinding, {
          preset,
          includeEvidenceSnippets: includeSnippets,
        });
      }
    }

    return generateRemediationPrompt(audit, {
      preset,
      scope,
      selectedFindingId,
      includeDeterministicChecks: includeChecks,
      includeEvidenceSnippets: includeSnippets,
    });
  }, [audit, preset, scope, selectedFindingId, includeChecks, includeSnippets, allVerified]);

  const copyToClipboard = () => {
    void navigator.clipboard.writeText(generated.prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const downloadFile = (filename?: string) => {
    const defaultName =
      preset === "cursor" && scope === "all"
        ? ".cursorrules"
        : `reposage-fix-prompt-${audit.repo.replace(/[^a-zA-Z0-9_.-]+/g, "_")}-${preset}.md`;
    const finalName = filename ?? defaultName;
    const blob = new Blob([generated.prompt], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = finalName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal open={open} onClose={onClose} title="AI Agent Fix Prompt Generator" wide>
      <div className="space-y-4">
        {/* Header Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-zinc-900 to-sky-950/30 p-3.5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-400">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-zinc-100">Turnkey AI Remediation Prompt</span>
                <Badge tone="amber">Ready to Copy</Badge>
              </div>
              <p className="mt-0.5 text-xs text-zinc-300">
                Ground any coding agent or LLM with verified repo citations, deterministic health gaps, and prioritized step-by-step remediation tasks.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              onClick={copyToClipboard}
              className="bg-amber-600 font-semibold hover:bg-amber-500"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-300" aria-hidden="true" /> Copied to Clipboard!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" aria-hidden="true" /> Copy Prompt
                </>
              )}
            </Button>
            <Button onClick={() => downloadFile()}>
              <Download className="h-4 w-4" aria-hidden="true" /> Download .md
            </Button>
            {preset === "cursor" && (
              <Button onClick={() => downloadFile(".cursorrules")} title="Download formatted as .cursorrules file">
                <Download className="h-4 w-4" aria-hidden="true" /> .cursorrules
              </Button>
            )}
          </div>
        </div>

        {/* Preset Selector */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Target AI Tool & Protocol
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PRESET_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = preset === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPreset(opt.id)}
                  className={cx(
                    "flex flex-col items-start rounded-xl border p-3 text-left transition-all",
                    active
                      ? "border-amber-500/80 bg-amber-950/20 shadow-sm shadow-amber-950/40 ring-1 ring-amber-500/50"
                      : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900/60",
                  )}
                >
                  <div className="mb-1 flex items-center gap-1.5">
                    <Icon className={cx("h-4 w-4", active ? "text-amber-400" : "text-zinc-400")} aria-hidden="true" />
                    <span className={cx("text-sm font-medium", active ? "text-amber-200" : "text-zinc-200")}>
                      {opt.label}
                    </span>
                  </div>
                  <span className="text-[11px] leading-tight text-zinc-400">{opt.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scope and Filter Controls */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3.5">
          <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
            Prompt Scope & Content Customization
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {/* Scope selection */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-zinc-400">Scope:</span>
              <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setScope("all")}
                  className={cx(
                    "rounded-md px-2.5 py-1 font-medium transition-colors",
                    scope === "all" ? "bg-amber-600 text-white" : "text-zinc-400 hover:text-zinc-200",
                  )}
                >
                  All Verified ({allVerified.length})
                </button>
                <button
                  type="button"
                  onClick={() => setScope("critical_high")}
                  className={cx(
                    "rounded-md px-2.5 py-1 font-medium transition-colors",
                    scope === "critical_high" ? "bg-amber-600 text-white" : "text-zinc-400 hover:text-zinc-200",
                  )}
                >
                  Critical & High ({criticalHighCount})
                </button>
                <button
                  type="button"
                  onClick={() => setScope("single")}
                  className={cx(
                    "rounded-md px-2.5 py-1 font-medium transition-colors",
                    scope === "single" ? "bg-amber-600 text-white" : "text-zinc-400 hover:text-zinc-200",
                  )}
                >
                  Single Finding
                </button>
              </div>
            </div>

            {/* If single finding scope, show finding dropdown */}
            {scope === "single" && allVerified.length > 0 && (
              <div className="flex items-center gap-2">
                <label htmlFor="finding-select" className="text-xs text-zinc-400">
                  Target:
                </label>
                <select
                  id="finding-select"
                  value={selectedFindingId}
                  onChange={(e) => setSelectedFindingId(e.target.value)}
                  className="max-w-xs truncate rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 focus:border-amber-400 focus:outline-none"
                >
                  {allVerified.map((f) => (
                    <option key={f.id} value={f.id}>
                      [{f.severity}] {f.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Checkbox options */}
            <div className="flex flex-wrap items-center gap-3">
              {scope !== "single" && (
                <label className="flex items-center gap-1.5 text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={includeChecks}
                    onChange={(e) => setIncludeChecks(e.target.checked)}
                    className="accent-amber-500"
                  />
                  Include failing health check deficits
                </label>
              )}
              <label className="flex items-center gap-1.5 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={includeSnippets}
                  onChange={(e) => setIncludeSnippets(e.target.checked)}
                  className="accent-amber-500"
                />
                Include code excerpts & citations
              </label>
            </div>
          </div>
        </div>

        {/* Live Metrics & View Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-zinc-400">Prompt Metrics:</span>
            <Badge tone="sky">~{generated.metadata.tokenEstimate.toLocaleString()} tokens</Badge>
            <Badge tone="zinc">{generated.metadata.charCount.toLocaleString()} chars</Badge>
            <Badge tone="green">{generated.metadata.findingCount} finding(s)</Badge>
            {generated.metadata.failingChecksCount > 0 && (
              <Badge tone="amber">{generated.metadata.failingChecksCount} failing check(s)</Badge>
            )}
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              className={cx(
                "inline-flex items-center gap-1 rounded px-2.5 py-1 font-medium transition-colors",
                viewMode === "preview" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200",
              )}
            >
              <FileText className="h-3.5 w-3.5" aria-hidden="true" /> Formatted Preview
            </button>
            <button
              type="button"
              onClick={() => setViewMode("raw")}
              className={cx(
                "inline-flex items-center gap-1 rounded px-2.5 py-1 font-medium transition-colors",
                viewMode === "raw" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200",
              )}
            >
              <FileCode className="h-3.5 w-3.5" aria-hidden="true" /> Raw Text
            </button>
          </div>
        </div>

        {/* Prompt Output Display */}
        {viewMode === "preview" ? (
          <div className="prose-report max-h-[50vh] overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} skipHtml>
              {generated.prompt}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="relative">
            <textarea
              readOnly
              value={generated.prompt}
              onFocus={(e) => e.target.select()}
              className="h-[50vh] w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs leading-relaxed text-zinc-200 focus:border-amber-400 focus:outline-none"
            />
            <div className="absolute right-3 top-3">
              <Button
                variant="secondary"
                onClick={copyToClipboard}
                className="bg-zinc-900 text-xs shadow-sm"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Select & Copy"}
              </Button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800 pt-3">
          <p className="text-xs text-zinc-400">
            Tip: Paste this prompt directly into <code className="font-mono text-zinc-300">claude</code>, Cursor Composer, or Aider to start fixing the repo immediately.
          </p>
          <div className="flex gap-2">
            <Button onClick={onClose}>Close</Button>
            <Button
              variant="primary"
              onClick={copyToClipboard}
              className="bg-amber-600 font-medium hover:bg-amber-500"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-300" aria-hidden="true" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" aria-hidden="true" /> Copy Prompt
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

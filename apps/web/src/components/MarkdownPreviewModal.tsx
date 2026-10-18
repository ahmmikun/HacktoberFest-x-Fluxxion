"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { Check, Copy, Download, LoaderCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Modal } from "./Modal";
import { Button } from "./ui";

/** Live preview + 1-click download/copy of the portable Markdown report (FR-ACT-02, NFR-SEC-03). */
export function MarkdownPreviewModal({ auditId, repo, open, onClose }: { auditId: string; repo: string; open: boolean; onClose: () => void }) {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMarkdown(null);
    setError(null);
    api
      .exportMarkdown(auditId)
      .then(setMarkdown)
      .catch((err: Error) => setError(err.message));
  }, [open, auditId]);

  const download = () => {
    if (!markdown) return;
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reposage-${repo.replace(/[^a-zA-Z0-9_.-]+/g, "_")}-${auditId.slice(0, 8)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal open={open} onClose={onClose} title="Markdown audit report" wide>
      <div className="mb-3 flex gap-2">
        <Button variant="primary" onClick={download} disabled={!markdown}>
          <Download className="h-4 w-4" aria-hidden="true" /> Download .md
        </Button>
        <Button
          disabled={!markdown}
          onClick={() => {
            if (!markdown) return;
            void navigator.clipboard.writeText(markdown).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
      {!markdown && !error && (
        <p className="flex items-center gap-2 text-sm text-zinc-400">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Generating report…
        </p>
      )}
      {markdown && (
        <div className="prose-report rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm">
          {/* Raw HTML is never rendered; the sanitized HAST pipeline blocks XSS from repo-controlled text. */}
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} skipHtml>
            {markdown}
          </ReactMarkdown>
        </div>
      )}
    </Modal>
  );
}

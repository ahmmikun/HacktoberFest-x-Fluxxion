"use client";

import { useState } from "react";
import { Check, Copy, RefreshCw, SquareTerminal } from "lucide-react";
import type { PreflightResponse } from "@reposage/shared";
import { Button, Card } from "./ui";

function Command({ cmd, note }: { cmd: string; note: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <li className="space-y-1">
      <p className="text-sm text-zinc-300">{note}</p>
      <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-black px-3 py-2 font-mono text-sm text-emerald-300">
        <span aria-hidden="true">$</span>
        <code className="flex-1 overflow-x-auto whitespace-nowrap">{cmd}</code>
        <button
          type="button"
          className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          aria-label={`Copy command: ${cmd}`}
          onClick={() => {
            void navigator.clipboard.writeText(cmd).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </li>
  );
}

/** Guided setup when `gh` is missing or unauthenticated (FR-AUTH-04). */
export function DiagnosticPanel({ preflight, apiError, onRetry, retrying }: { preflight: PreflightResponse | null; apiError: string | null; onRetry: () => void; retrying: boolean }) {
  const gh = preflight?.gh;
  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <SquareTerminal className="h-5 w-5 text-amber-400" aria-hidden="true" />
          {apiError ? "RepoSage API unreachable" : gh?.installed ? "GitHub CLI is not authenticated" : "GitHub CLI not found"}
        </span>
      }
      className="border-amber-800/60"
    >
      <p className="mb-4 text-sm text-zinc-300">
        RepoSage never asks for a Personal Access Token. It reuses your local <code className="font-mono">gh</code> session, kept in your OS keyring.
      </p>
      <ol className="mb-4 space-y-3">
        {apiError ? (
          <>
            <Command note="Start the API and web app from the repository root:" cmd="npm run dev" />
            <li className="text-sm text-red-300">{apiError}</li>
          </>
        ) : (
          <>
            {!gh?.installed && <Command note="1. Install the GitHub CLI (Windows · macOS · Linux):" cmd="winget install --id GitHub.cli   # or: brew install gh" />}
            <Command note={`${gh?.installed ? "1" : "2"}. Log in with your browser (grants repo + read:org scopes):`} cmd="gh auth login --web --scopes repo,read:org" />
            <Command note={`${gh?.installed ? "2" : "3"}. Confirm the session:`} cmd="gh auth status" />
          </>
        )}
      </ol>
      {gh?.error && <p className="mb-3 text-sm text-amber-300">{gh.error}</p>}
      <Button variant="primary" onClick={onRetry} disabled={retrying}>
        <RefreshCw className={retrying ? "h-4 w-4 animate-spin" : "h-4 w-4"} aria-hidden="true" />
        Retry Connection
      </Button>
    </Card>
  );
}

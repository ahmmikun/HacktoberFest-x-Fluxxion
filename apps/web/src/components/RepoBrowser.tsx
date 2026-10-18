"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Archive, GitFork, Globe, LoaderCircle, Lock, Search, Star } from "lucide-react";
import { REPO_SLUG_REGEX, type RepoSummary } from "@reposage/shared";
import { api } from "@/lib/api";
import { Badge, Button, Card, cx, formatRelative } from "./ui";

type Visibility = "all" | "public" | "private";

/** Browse, search and filter repositories in the gh session scope, or enter any owner/repo (FR-AUTH-03). */
export function RepoBrowser({ onSelect, disabled }: { onSelect: (repo: string) => void; disabled?: boolean }) {
  const [query, setQuery] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("all");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [repos, setRepos] = useState<RepoSummary[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const requestId = useRef(0);

  const load = useCallback(
    async (append: boolean, after: string | null) => {
      const id = ++requestId.current;
      setLoading(true);
      setError(null);
      try {
        const data = await api.listRepos({ q: query.trim() || undefined, visibility, includeArchived, after, first: 30 });
        if (id !== requestId.current) return; // a newer request superseded this one
        setRepos((prev) => (append ? [...prev, ...data.repos] : data.repos));
        setCursor(data.pageInfo.endCursor);
        setHasMore(data.pageInfo.hasNextPage && !query.trim());
        setTotal(data.totalCount);
      } catch (err) {
        if (id === requestId.current) setError((err as Error).message);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [query, visibility, includeArchived],
  );

  useEffect(() => {
    const t = setTimeout(() => void load(false, null), query ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, query]);

  const manualValid = REPO_SLUG_REGEX.test(manual.trim());

  return (
    <Card title="Repositories" actions={<span className="text-xs text-zinc-400">{total ? `${total} accessible via gh` : null}</span>}>
      <form
        className="mb-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (manualValid) onSelect(manual.trim());
        }}
      >
        <label htmlFor="manual-repo" className="sr-only">
          Audit any repository by owner/repo
        </label>
        <input
          id="manual-repo"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="owner/repo — audit any repository your session can read"
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm placeholder:text-zinc-500"
          aria-invalid={manual.length > 0 && !manualValid}
          aria-describedby="manual-repo-hint"
          autoComplete="off"
          spellCheck={false}
        />
        <Button type="submit" variant="primary" disabled={!manualValid || disabled}>
          Audit
        </Button>
      </form>
      <p id="manual-repo-hint" className={cx("-mt-3 mb-3 text-xs", manual && !manualValid ? "text-red-400" : "text-transparent")}>
        Use the format owner/repo (letters, digits, ., _ and - only).
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" aria-hidden="true" />
          <label htmlFor="repo-search" className="sr-only">
            Search your repositories
          </label>
          <input
            id="repo-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your repositories…"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 py-2 pl-8 pr-3 text-sm placeholder:text-zinc-500"
          />
        </div>
        <label htmlFor="repo-visibility" className="sr-only">
          Visibility
        </label>
        <select
          id="repo-visibility"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as Visibility)}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm"
        >
          <option value="all">All</option>
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
        <label className="flex items-center gap-1.5 text-sm text-zinc-300">
          <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} className="accent-sky-500" />
          Archived
        </label>
      </div>

      {error && (
        <p role="alert" className="mb-3 rounded-lg border border-red-800 bg-red-950/60 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <ul className="divide-y divide-zinc-800 overflow-hidden rounded-lg border border-zinc-800" aria-busy={loading}>
        {repos.map((r) => (
          <li key={r.nameWithOwner}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect(r.nameWithOwner)}
              className="flex w-full flex-col gap-1 px-3 py-2.5 text-left hover:bg-zinc-800/70 disabled:opacity-50 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2 font-medium">
                  {r.isPrivate ? <Lock className="h-3.5 w-3.5 text-amber-400" aria-label="private" /> : <Globe className="h-3.5 w-3.5 text-zinc-500" aria-label="public" />}
                  {r.nameWithOwner}
                  {r.isFork && <Badge><GitFork className="h-3 w-3" aria-hidden="true" />fork</Badge>}
                  {r.isArchived && <Badge tone="amber"><Archive className="h-3 w-3" aria-hidden="true" />archived</Badge>}
                </span>
                {r.description && <span className="block truncate text-xs text-zinc-400">{r.description}</span>}
              </span>
              <span className="flex shrink-0 items-center gap-3 text-xs text-zinc-400">
                {r.primaryLanguage && <span>{r.primaryLanguage}</span>}
                <span className="flex items-center gap-0.5"><Star className="h-3 w-3" aria-hidden="true" />{r.stars}</span>
                <span>pushed {formatRelative(r.pushedAt)}</span>
              </span>
            </button>
          </li>
        ))}
        {!loading && repos.length === 0 && !error && <li className="px-3 py-6 text-center text-sm text-zinc-400">No repositories match.</li>}
        {loading && (
          <li className="flex items-center justify-center gap-2 px-3 py-4 text-sm text-zinc-400">
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading repositories…
          </li>
        )}
      </ul>
      {hasMore && !loading && (
        <div className="mt-3 text-center">
          <Button onClick={() => void load(true, cursor)}>Load more</Button>
        </div>
      )}
    </Card>
  );
}

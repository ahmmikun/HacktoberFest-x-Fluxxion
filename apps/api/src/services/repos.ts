import type { RepoListResponse, RepoSummary } from "@reposage/shared";
import { getGitHubClients } from "./github.js";

const LIST_QUERY = /* GraphQL */ `
  query RepoSageViewerRepos($first: Int!, $after: String, $privacy: RepositoryPrivacy) {
    viewer {
      repositories(
        first: $first
        after: $after
        privacy: $privacy
        orderBy: { field: PUSHED_AT, direction: DESC }
        affiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]
        ownerAffiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]
      ) {
        totalCount
        pageInfo { hasNextPage endCursor }
        nodes {
          nameWithOwner description isPrivate isArchived isFork stargazerCount pushedAt url
          primaryLanguage { name }
        }
      }
    }
  }
`;

interface ListResponse {
  viewer: {
    repositories: {
      totalCount: number;
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
      nodes: Array<{
        nameWithOwner: string;
        description: string | null;
        isPrivate: boolean;
        isArchived: boolean;
        isFork: boolean;
        stargazerCount: number;
        pushedAt: string | null;
        url: string;
        primaryLanguage: { name: string } | null;
      }>;
    };
  };
}

export interface ListReposOptions {
  query?: string;
  visibility?: "all" | "public" | "private";
  includeArchived?: boolean;
  after?: string;
  first?: number;
}

const MAX_SEARCH_PAGES = 5;

/** Lists repositories accessible to the gh session (FR-AUTH-03), with server-side filtering. */
export async function listRepositories(opts: ListReposOptions): Promise<RepoListResponse> {
  const { graphql } = await getGitHubClients();
  const first = Math.min(Math.max(opts.first ?? 30, 1), 100);
  const privacy = opts.visibility === "public" ? "PUBLIC" : opts.visibility === "private" ? "PRIVATE" : null;
  const q = opts.query?.trim().toLowerCase() ?? "";

  const repos: RepoSummary[] = [];
  let after: string | null = opts.after ?? null;
  let pageInfo = { hasNextPage: false, endCursor: null as string | null };
  let totalCount = 0;

  // Without a search term one page is returned; with a term we scan several pages for matches.
  for (let page = 0; page < (q ? MAX_SEARCH_PAGES : 1); page++) {
    const data: ListResponse = await graphql<ListResponse>(LIST_QUERY, { first: q ? 100 : first, after, privacy });
    const conn = data.viewer.repositories;
    totalCount = conn.totalCount;
    pageInfo = conn.pageInfo;
    for (const n of conn.nodes) {
      if (!opts.includeArchived && n.isArchived) continue;
      if (q && !`${n.nameWithOwner} ${n.description ?? ""}`.toLowerCase().includes(q)) continue;
      repos.push({
        nameWithOwner: n.nameWithOwner,
        description: n.description,
        isPrivate: n.isPrivate,
        isArchived: n.isArchived,
        isFork: n.isFork,
        stars: n.stargazerCount,
        primaryLanguage: n.primaryLanguage?.name ?? null,
        pushedAt: n.pushedAt,
        url: n.url,
      });
    }
    if (!conn.pageInfo.hasNextPage || (q && repos.length >= first)) break;
    after = conn.pageInfo.endCursor;
  }

  return { repos: repos.slice(0, q ? first : repos.length), pageInfo, totalCount };
}

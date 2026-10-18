import type { CollectedFile, RepoMetadata } from "@reposage/shared";
import { config } from "../config.js";
import { getGitHubClients, type GitHubClients } from "./github.js";

export interface TreeBlob {
  path: string;
  size: number;
}

export interface CollectedEvidence {
  metadata: RepoMetadata;
  /** All blob (file) paths in the HEAD tree. */
  blobs: TreeBlob[];
  /** Files + directories: the citation verifier's ground truth (FR-VER-02). */
  validTreePaths: Set<string>;
  treeAvailable: boolean;
  treeTruncated: boolean;
  /** High-signal file contents keyed by path (FR-COLL-02). */
  files: Map<string, CollectedFile>;
  durationMs: number;
}

const METADATA_QUERY = /* GraphQL */ `
  query RepoSageAuditEvidence($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      nameWithOwner
      description
      url
      isArchived
      isDisabled
      isPrivate
      isFork
      pushedAt
      stargazerCount
      forkCount
      hasIssuesEnabled
      viewerPermission
      securityPolicyUrl
      contributingGuidelines { url }
      licenseInfo { spdxId name }
      languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
        edges { size node { name } }
      }
      openIssues: issues(states: OPEN) { totalCount }
      closedIssues: issues(states: CLOSED) { totalCount }
      openPRs: pullRequests(states: OPEN) { totalCount }
      closedPRs: pullRequests(states: CLOSED) { totalCount }
      mergedPRs: pullRequests(states: MERGED) { totalCount }
      recentOpenIssues: issues(states: OPEN, first: 30, orderBy: { field: CREATED_AT, direction: DESC }) {
        nodes { createdAt labels { totalCount } comments { totalCount } }
      }
      defaultBranchRef {
        name
        branchProtectionRule { requiresApprovingReviews requiresStatusChecks }
        target { ... on Commit { oid committedDate } }
      }
    }
  }
`;

interface MetadataResponse {
  repository: {
    nameWithOwner: string;
    description: string | null;
    url: string;
    isArchived: boolean;
    isDisabled: boolean;
    isPrivate: boolean;
    isFork: boolean;
    pushedAt: string | null;
    stargazerCount: number;
    forkCount: number;
    hasIssuesEnabled: boolean;
    viewerPermission: string | null;
    securityPolicyUrl: string | null;
    contributingGuidelines: { url: string | null } | null;
    licenseInfo: { spdxId: string | null; name: string } | null;
    languages: { edges: Array<{ size: number; node: { name: string } }> };
    openIssues: { totalCount: number };
    closedIssues: { totalCount: number };
    openPRs: { totalCount: number };
    closedPRs: { totalCount: number };
    mergedPRs: { totalCount: number };
    recentOpenIssues: {
      nodes: Array<{ createdAt: string; labels: { totalCount: number }; comments: { totalCount: number } }>;
    };
    defaultBranchRef: {
      name: string;
      branchProtectionRule: { requiresApprovingReviews: boolean; requiresStatusChecks: boolean } | null;
      target: { oid?: string; committedDate?: string } | null;
    } | null;
  } | null;
}

/* -------------------------------------------------------------------------- */
/*                         High-signal file selection                         */
/* -------------------------------------------------------------------------- */

interface FileRule {
  test: (path: string) => boolean;
  priority: number; // lower = fetched first
}

const base = (p: string) => p.slice(p.lastIndexOf("/") + 1);
const dir = (p: string) => (p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "");
const atRoot = (p: string) => !p.includes("/");
const inDocsDirs = (p: string) => ["", ".github", "docs"].includes(dir(p));

const FILE_RULES: FileRule[] = [
  { priority: 0, test: (p) => atRoot(p) && /^readme(\.(md|markdown|rst|txt))?$/i.test(base(p)) },
  { priority: 1, test: (p) => atRoot(p) && ["package.json", "pyproject.toml", "requirements.txt", "Cargo.toml", "go.mod", "Pipfile", "setup.cfg", "setup.py", "pom.xml", "build.gradle", "build.gradle.kts", "Gemfile", "composer.json"].includes(p) },
  { priority: 1, test: (p) => /^\.github\/workflows\/[^/]+\.ya?ml$/i.test(p) },
  { priority: 2, test: (p) => atRoot(p) && [".gitignore", ".env.example", ".env.sample", ".env.template", ".nvmrc", ".node-version", "tsconfig.json"].includes(p) },
  { priority: 2, test: (p) => /^(\.github\/)?dependabot\.ya?ml$/i.test(p) || /^(\.github\/)?(renovate\.json5?|\.renovaterc(\.json)?)$/i.test(p) },
  { priority: 3, test: (p) => inDocsDirs(p) && /^(contributing|security|code_of_conduct)(\.(md|rst|txt))?$/i.test(base(p)) },
  { priority: 3, test: (p) => atRoot(p) && /^(licen[cs]e|copying)(\.(md|txt))?$/i.test(base(p)) },
  { priority: 4, test: (p) => atRoot(p) && /^(dockerfile|docker-compose\.ya?ml|compose\.ya?ml)$/i.test(p) },
  { priority: 4, test: (p) => atRoot(p) && /^(vitest|jest|playwright|cypress|karma)\.config\.[cm]?[jt]s$/i.test(p) },
  { priority: 4, test: (p) => atRoot(p) && ["pytest.ini", "tox.ini", ".mocharc.json", ".mocharc.yml", ".mocharc.js", "jest.config.json"].includes(p) },
  // Lockfiles last: usually only their presence matters; the byte cap keeps them from flooding evidence.
  { priority: 9, test: (p) => atRoot(p) && ["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "poetry.lock", "Pipfile.lock", "uv.lock", "Cargo.lock", "go.sum"].includes(p) },
];

const MAX_WORKFLOWS = 15;
const MAX_FETCHED_FILES = 45;
const BLOB_BATCH_SIZE = 25;

export function selectHighSignalFiles(blobs: TreeBlob[]): TreeBlob[] {
  const scored: Array<{ blob: TreeBlob; priority: number }> = [];
  let workflows = 0;
  for (const blob of blobs) {
    const rule = FILE_RULES.find((r) => r.test(blob.path));
    if (!rule) continue;
    if (blob.path.startsWith(".github/workflows/")) {
      if (workflows >= MAX_WORKFLOWS) continue;
      workflows++;
    }
    scored.push({ blob, priority: rule.priority });
  }
  scored.sort((a, b) => a.priority - b.priority || a.blob.path.localeCompare(b.blob.path));
  return scored.slice(0, MAX_FETCHED_FILES).map((s) => s.blob);
}

/* -------------------------------------------------------------------------- */
/*                                 Collector                                  */
/* -------------------------------------------------------------------------- */

export async function collectEvidence(repoSlug: string, clients?: GitHubClients): Promise<CollectedEvidence> {
  const started = Date.now();
  const [owner, name] = repoSlug.split("/") as [string, string];
  const gh = clients ?? (await getGitHubClients());

  // Round-trips 1+2 in parallel: repository vitals (single batched GraphQL query) and the
  // full recursive tree of HEAD (REST is the only recursive tree API).
  const [data, treeRes] = await Promise.all([
    gh.graphql<MetadataResponse>(METADATA_QUERY, { owner, name }),
    gh.rest.git
      .getTree({ owner, repo: name, tree_sha: "HEAD", recursive: "1" })
      .catch((err: { status?: number }) => {
        // 404/409 = empty repository; any other error is surfaced.
        if (err?.status === 404 || err?.status === 409) return null;
        throw err;
      }),
  ]);
  const repo = data.repository;
  if (!repo) throw Object.assign(new Error("Repository not found."), { status: 404 });

  const headSha = repo.defaultBranchRef?.target?.oid ?? null;
  const viewerIsAdmin = repo.viewerPermission === "ADMIN";

  const metadata: RepoMetadata = {
    nameWithOwner: repo.nameWithOwner,
    description: repo.description,
    url: repo.url,
    isArchived: repo.isArchived,
    isDisabled: repo.isDisabled,
    isPrivate: repo.isPrivate,
    isFork: repo.isFork,
    pushedAt: repo.pushedAt,
    lastCommitAt: repo.defaultBranchRef?.target?.committedDate ?? null,
    defaultBranch: repo.defaultBranchRef?.name ?? null,
    headSha,
    stars: repo.stargazerCount,
    forks: repo.forkCount,
    license: repo.licenseInfo,
    languages: repo.languages.edges.map((e) => ({ name: e.node.name, bytes: e.size })),
    openIssues: repo.openIssues.totalCount,
    closedIssues: repo.closedIssues.totalCount,
    openPullRequests: repo.openPRs.totalCount,
    closedPullRequests: repo.closedPRs.totalCount,
    mergedPullRequests: repo.mergedPRs.totalCount,
    branchProtection: repo.defaultBranchRef?.branchProtectionRule ?? null,
    // Without admin rights a null rule is indistinguishable from "not visible".
    branchProtectionVisible: viewerIsAdmin || repo.defaultBranchRef?.branchProtectionRule != null,
    hasIssuesEnabled: repo.hasIssuesEnabled,
    securityPolicyUrl: repo.securityPolicyUrl ?? null,
    contributingUrl: repo.contributingGuidelines?.url ?? null,
    viewerPermission: repo.viewerPermission,
    openIssueSample: repo.recentOpenIssues.nodes.map((n) => ({
      createdAt: n.createdAt,
      labelCount: n.labels.totalCount,
      commentCount: n.comments.totalCount,
    })),
  };

  const empty: CollectedEvidence = {
    metadata,
    blobs: [],
    validTreePaths: new Set(),
    treeAvailable: false,
    treeTruncated: false,
    files: new Map(),
    durationMs: 0,
  };
  if (!headSha || !treeRes) return { ...empty, durationMs: Date.now() - started };

  const tree = treeRes;
  const blobs: TreeBlob[] = [];
  const validTreePaths = new Set<string>();
  for (const entry of tree.data.tree) {
    if (!entry.path) continue;
    validTreePaths.add(entry.path);
    if (entry.type === "blob") blobs.push({ path: entry.path, size: entry.size ?? 0 });
  }

  // Round-trip 3: targeted blob fetch for high-signal files, batched via GraphQL aliases.
  const files = await fetchFiles(gh, owner, name, headSha, selectHighSignalFiles(blobs));

  return {
    metadata,
    blobs,
    validTreePaths,
    treeAvailable: true,
    treeTruncated: Boolean(tree.data.truncated),
    files,
    durationMs: Date.now() - started,
  };
}

async function fetchFiles(
  gh: GitHubClients,
  owner: string,
  name: string,
  headSha: string,
  selected: TreeBlob[],
): Promise<Map<string, CollectedFile>> {
  const { maxFileBytes, maxEvidenceBytes } = config.limits;
  const files = new Map<string, CollectedFile>();
  const toFetch: TreeBlob[] = [];
  let budget = maxEvidenceBytes;

  for (const blob of selected) {
    // FR-COLL-03: oversized files are recorded (presence + size) but their content is not downloaded.
    if (blob.size > maxFileBytes || blob.size > budget) {
      files.set(blob.path, { path: blob.path, sizeBytes: blob.size, truncated: true, content: "" });
      continue;
    }
    budget -= blob.size;
    toFetch.push(blob);
  }

  const batches: TreeBlob[][] = [];
  for (let i = 0; i < toFetch.length; i += BLOB_BATCH_SIZE) batches.push(toFetch.slice(i, i + BLOB_BATCH_SIZE));

  await Promise.all(
    batches.map(async (batch) => {
      // Expressions are passed as GraphQL variables — never interpolated into the query text.
      const varDefs = batch.map((_, i) => `$e${i}: String!`).join(", ");
      const fields = batch
        .map((_, i) => `f${i}: object(expression: $e${i}) { ... on Blob { byteSize isBinary isTruncated text } }`)
        .join("\n");
      const query = `query RepoSageBlobs($owner: String!, $name: String!, ${varDefs}) {
        repository(owner: $owner, name: $name) { ${fields} }
      }`;
      const variables: Record<string, string> = { owner, name };
      batch.forEach((b, i) => (variables[`e${i}`] = `${headSha}:${b.path}`));

      type BlobNode = { byteSize: number; isBinary: boolean; isTruncated: boolean; text: string | null } | null;
      const res = await gh.graphql<{ repository: Record<string, BlobNode> }>(query, variables);

      batch.forEach((b, i) => {
        const node = res.repository[`f${i}`];
        if (!node || node.isBinary) return;
        const text = node.text ?? "";
        const truncated = node.isTruncated || Buffer.byteLength(text, "utf8") > maxFileBytes;
        files.set(b.path, {
          path: b.path,
          sizeBytes: node.byteSize,
          truncated,
          content: truncated ? text.slice(0, maxFileBytes) : text,
        });
      });
    }),
  );

  return files;
}

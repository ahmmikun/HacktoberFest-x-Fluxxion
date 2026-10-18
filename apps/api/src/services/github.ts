import { graphql } from "@octokit/graphql";
import { Octokit } from "@octokit/rest";
import { GhCliBridge } from "./ghBridge.js";

const USER_AGENT = "RepoSage/1.0 (+local-first repository auditor)";

export type GraphqlClient = typeof graphql;

export interface GitHubClients {
  graphql: GraphqlClient;
  rest: Octokit;
}

/** Builds Octokit clients hydrated with the ephemeral `gh auth token` (never persisted). */
export async function getGitHubClients(): Promise<GitHubClients> {
  const token = await GhCliBridge.getEphemeralToken();
  return {
    graphql: graphql.defaults({
      headers: { authorization: `token ${token}`, "user-agent": USER_AGENT },
    }),
    rest: new Octokit({ auth: token, userAgent: USER_AGENT, log: silentLog }),
  };
}

const noop = () => undefined;
const silentLog = { debug: noop, info: noop, warn: noop, error: noop };

/** Normalizes Octokit/GraphQL errors into safe, user-facing messages. */
export function describeGitHubError(err: unknown): { status: number; message: string } {
  const e = err as { status?: number; message?: string; errors?: Array<{ type?: string; message?: string }> };
  if (e?.status === 401) {
    GhCliBridge.invalidateToken();
    return { status: 401, message: "GitHub rejected the gh session token. Run `gh auth login` again." };
  }
  if (e?.errors?.some((x) => x.type === "NOT_FOUND")) {
    return { status: 404, message: "Repository not found or not accessible with the current gh session." };
  }
  if (e?.status === 404) return { status: 404, message: "Repository not found or not accessible." };
  if (e?.status === 403 || e?.errors?.some((x) => x.type === "RATE_LIMITED")) {
    return { status: 429, message: "GitHub API rate limit or permission error. Try again later." };
  }
  return { status: 502, message: e?.message ? `GitHub API error: ${e.message}` : "GitHub API error." };
}

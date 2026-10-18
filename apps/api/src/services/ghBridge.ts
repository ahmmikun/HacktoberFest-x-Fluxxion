import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { REPO_SLUG_REGEX } from "@reposage/shared";

const execFileAsync = promisify(execFile);

const TOKEN_TTL_MS = 5 * 60 * 1000;
const MAX_TITLE = 120;
const MAX_BODY = 60_000;

export interface GhAuthStatus {
  installed: boolean;
  authenticated: boolean;
  username?: string;
  scopes?: string[];
  error?: string;
}

interface ExecError extends Error {
  code?: string | number;
  stdout?: string;
  stderr?: string;
}

// Ephemeral, module-private token cache. Never exported, logged or serialized (FR-AUTH-02).
let cachedToken: { value: string; expiresAt: number } | null = null;

/**
 * Safe wrapper around the local GitHub CLI.
 * NFR-SEC-01: every invocation uses execFile with a fixed binary and an argument
 * array — no shell, no string interpolation.
 */
export class GhCliBridge {
  /** Verifies that `gh` is installed and holds an active authenticated session. */
  static async verifySession(): Promise<GhAuthStatus> {
    let combined = "";
    try {
      const { stdout, stderr } = await execFileAsync("gh", ["auth", "status", "--hostname", "github.com"], {
        timeout: 5000,
        windowsHide: true,
      });
      combined = `${stdout}\n${stderr}`;
    } catch (err) {
      const e = err as ExecError;
      if (e.code === "ENOENT") {
        return {
          installed: false,
          authenticated: false,
          error: "GitHub CLI (gh) is not installed or not on PATH. Install it from https://cli.github.com.",
        };
      }
      // `gh auth status` exits non-zero when not logged in (or when any account is invalid).
      combined = `${e.stdout ?? ""}\n${e.stderr ?? ""}`;
    }

    const userMatch = combined.match(/Logged in to github\.com (?:account|as) ([^\s(]+)/i);
    if (!userMatch) {
      return {
        installed: true,
        authenticated: false,
        error: "GitHub CLI is installed but not authenticated. Run `gh auth login` in your terminal.",
      };
    }

    const scopesMatch = combined.match(/Token scopes:\s*(.+)/i);
    return {
      installed: true,
      authenticated: true,
      username: userMatch[1]?.trim(),
      scopes: scopesMatch?.[1]
        ?.split(",")
        .map((s) => s.replace(/['"]/g, "").trim())
        .filter(Boolean),
    };
  }

  /**
   * Retrieves the active OAuth token strictly in-memory for Octokit queries.
   * Never log or return this value to the frontend client.
   */
  static async getEphemeralToken(): Promise<string> {
    if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;
    let stdout: string;
    try {
      ({ stdout } = await execFileAsync("gh", ["auth", "token", "--hostname", "github.com"], {
        timeout: 5000,
        windowsHide: true,
      }));
    } catch {
      // Deliberately drop the original error: its output could contain the token.
      throw new Error("Unable to retrieve an active token from `gh auth token`. Run `gh auth login`.");
    }
    const token = stdout.trim();
    if (!token) throw new Error("Unable to retrieve an active token from `gh auth token`.");
    cachedToken = { value: token, expiresAt: Date.now() + TOKEN_TTL_MS };
    return token;
  }

  /** Drops the cached token (e.g. after a 401 or `gh auth logout`). */
  static invalidateToken(): void {
    cachedToken = null;
  }

  /**
   * Creates a remediation GitHub Issue. The body is streamed over stdin
   * (`--body-file -`) so long bodies never hit OS argument-length limits.
   */
  static async createRemediationIssue(repoSlug: string, title: string, body: string): Promise<{ issueUrl: string }> {
    if (!REPO_SLUG_REGEX.test(repoSlug)) throw new Error("Invalid repository slug format.");

    const safeTitle = `[RepoSage Audit] ${title.replace(/[\r\n]+/g, " ").slice(0, MAX_TITLE)}`;
    const safeBody = body.slice(0, MAX_BODY);

    const stdout = await new Promise<string>((resolve, reject) => {
      const child = execFile(
        "gh",
        ["issue", "create", "--repo", repoSlug, "--title", safeTitle, "--body-file", "-"],
        { timeout: 20_000, windowsHide: true, maxBuffer: 1024 * 1024 },
        (error, out, errOut) => {
          if (error) {
            const msg = String(errOut || error.message).trim().split("\n").slice(-3).join(" ");
            reject(new Error(`gh issue create failed: ${msg}`));
          } else {
            resolve(String(out));
          }
        },
      );
      child.stdin?.end(safeBody, "utf8");
    });

    const url = stdout.trim().split(/\s+/).find((s) => s.startsWith("https://"));
    if (!url) throw new Error("gh issue create did not return an issue URL.");
    return { issueUrl: url };
  }
}

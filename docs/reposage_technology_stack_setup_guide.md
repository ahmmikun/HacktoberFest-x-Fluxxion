# RepoSage 🔎 — Technology Stack & Workspace Configuration

## 1. Monorepo Directory Structure

RepoSage uses **npm workspaces** (or `pnpm`) to manage the **Next.js** frontend, **Node.js + Express** backend, and shared **Zod** schema contracts in a single cohesive repository:

```text
reposage/
├── package.json                     # Workspace root scripts & shared devDependencies
├── .env.example                     # Root environment variable template
├── apps/
│   ├── web/                         # Next.js 15 Frontend (App Router, Port 3000)
│   │   ├── src/
│   │   │   ├── app/                 # App Router pages & layouts
│   │   │   ├── components/          # UI components (Scorecards, Diff Arena, SSE Stepper)
│   │   │   ├── hooks/               # `useAuditStream` SSE custom React hook
│   │   │   └── lib/                 # Typed API client
│   │   ├── next.config.ts
│   │   └── package.json
│   │
│   └── api/                         # Node.js + Express Backend (Port 4000)
│       ├── src/
│       │   ├── server.ts            # Express app bootstrap & CORS/Security middleware
│       │   ├── routes/              # `/system`, `/repos`, `/audits`, `/actions`
│       │   ├── services/
│       │   │   ├── ghBridge.ts      # Safe `execFile('gh', ...)` wrapper
│       │   │   ├── collector.ts     # `@octokit/graphql` repository evidence collector
│       │   │   ├── deterministic.ts # 6-dimension static rule engine
│       │   │   ├── compiler.ts      # Evidence Manifest packer & secret redactor
│       │   │   ├── ollamaClient.ts  # Local `Gemma 4 E4B` structured inference client
│       │   │   ├── geminiClient.ts  # Google AI Studio `Gemma 4 26B` client
│       │   │   ├── verifier.ts      # Citation & file-tree hallucination gate
│       │   │   └── exporter.ts      # Markdown report generator
│       │   └── utils/
│       └── package.json
│
└── packages/
    └── shared/                      # Shared TypeScript & Zod Schemas
        ├── src/
        │   ├── schemas.ts           # AuditFinding, EvidenceManifest, Telemetry schemas
        │   └── index.ts
        └── package.json
```

---

## 2. Complete Technology Stack Breakdown

### 2.1 Frontend (`apps/web`)
| Technology | Version | Role & Justification |
| :--- | :--- | :--- |
| **Next.js (App Router)** | `^15.x` | React framework providing fast routing, server/client component ergonomics, and clean local development. |
| **React & TypeScript** | `^19.x` / `^5.7` | Strict end-to-end type safety importing contracts directly from `@reposage/shared`. |
| **Tailwind CSS** | `^4.x` | Utility-first styling for developer-focused dark-mode dashboards and model diff tables. |
| **Lucide React** | `^0.470+` | Crisp iconography for diagnostic states, severity badges, and verification shields. |
| **React Markdown + Remark Gfm** | `^9.x` | Safe, sanitized client-side rendering of exported Markdown reports and remediation guides. |

### 2.2 Backend (`apps/api`)
| Technology | Version | Role & Justification |
| :--- | :--- | :--- |
| **Node.js** | `>=20.11 LTS` | Runtime for executing local `gh` CLI subprocesses, parsing AST/YAML files, and streaming SSE events. |
| **Express** | `^4.21` / `^5.0` | Dedicated API server handling long-lived SSE connections, parallel model orchestration, and `gh` subprocess execution. |
| **`@octokit/graphql` & `@octokit/rest`** | `^8.x` / `^21.x` | Batched GitHub GraphQL queries and raw file fetching hydrated via the local `gh auth token` session. |
| **`yaml` & `semver`** | `^2.7` / `^7.6` | Deterministic parsing of `.github/workflows/*.yml` and `package.json` dependency constraints before AI inference. |
| **Helmet & Express Rate Limit** | `^8.x` / `^7.x` | Hardens local Express endpoints and prevents runaway loops against the Google AI Studio API. |

### 2.3 AI Runtimes & Validation (`packages/shared` & `apps/api`)
| Technology | Model / Package | Role & Justification |
| :--- | :--- | :--- |
| **Ollama Local Runtime** | `gemma4:e4b` | Local open-weight inference (`http://127.0.0.1:11434/api/chat`) using JSON schema enforcement (`format: jsonSchema`). |
| **Google Gen AI SDK** | `@google/genai` (`gemma-4-26b-a4b-it`) | Hosted inference via Google AI Studio for deep cross-file reasoning and side-by-side model benchmarking. |
| **Zod + `zod-to-json-schema`** | `^3.24` | Single source of truth for runtime validation and automatic conversion into Ollama/Google JSON schemas. |

---

## 3. Root & Workspace `package.json` Blueprint

```json
{
  "name": "reposage",
  "private": true,
  "version": "1.0.0",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "concurrently -n \"API,WEB\" -c \"cyan,magenta\" \"npm run dev --workspace=apps/api\" \"npm run dev --workspace=apps/web\"",
    "build": "npm run build --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "preflight": "node scripts/check-env.mjs"
  },
  "devDependencies": {
    "concurrently": "^9.1.2",
    "typescript": "^5.7.3"
  }
}
```

---

## 4. Environment Configuration (`.env.example`)

Create a `.env` file in `apps/api/.env` and `apps/web/.env.local`:

```ini
# ==========================================
# REPOSAGE BACKEND CONFIGURATION (apps/api)
# ==========================================
PORT=4000
CORS_ORIGIN=http://localhost:3000

# Local Ollama Gemma 4 Configuration
OLLAMA_BASE_URL=http://127.0.0.1:11434
LOCAL_GEMMA_MODEL=gemma4:e4b
OLLAMA_TIMEOUT_MS=60000

# Google AI Studio Hosted Gemma 4 Configuration
GOOGLE_AI_API_KEY=your_google_ai_studio_api_key_here
HOSTED_GEMMA_MODEL=gemma-4-26b-a4b-it
HOSTED_TIMEOUT_MS=45000

# Collector & Compiler Limits
MAX_FILE_BYTES=65536
MAX_MANIFEST_TOKENS=2500

# ==========================================
# REPOSAGE FRONTEND CONFIGURATION (apps/web)
# ==========================================
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
```

---

## 5. Implementation Reference: Safe `gh` CLI Bridge (`apps/api/src/services/ghBridge.ts`)

This core module demonstrates how the Express backend interacts with the local GitHub CLI safely without shell interpolation or requiring users to paste tokens:

```typescript
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const REPO_SLUG_REGEX = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;

export interface GhAuthStatus {
  authenticated: boolean;
  username?: string;
  scopes?: string[];
  error?: string;
}

export class GhCliBridge {
  /**
   * Verifies that `gh` is installed and holds an active authenticated session.
   */
  static async verifySession(): Promise<GhAuthStatus> {
    try {
      const { stdout, stderr } = await execFileAsync("gh", ["auth", "status"], {
        timeout: 5000,
      });
      const combined = `${stdout}\n${stderr}`;
      const userMatch = combined.match(/Logged in to github\.com account ([^\s(]+)/i);
      const scopesMatch = combined.match(/Token scopes:\s*(.+)/i);

      return {
        authenticated: true,
        username: userMatch?.[1]?.trim(),
        scopes: scopesMatch?.[1]
          ?.split(",")
          .map((s) => s.replace(/'/g, "").trim())
          .filter(Boolean),
      };
    } catch (err: any) {
      return {
        authenticated: false,
        error: "GitHub CLI is not installed or not authenticated. Run `gh auth login` in your terminal.",
      };
    }
  }

  /**
   * Retrieves the ephemeral OAuth token strictly in-memory for Octokit GraphQL queries.
   * Never log or return this value to the frontend client.
   */
  static async getEphemeralToken(): Promise<string> {
    const { stdout } = await execFileAsync("gh", ["auth", "token"], {
      timeout: 3000,
    });
    const token = stdout.trim();
    if (!token) {
      throw new Error("Unable to retrieve active token from `gh auth token`.");
    }
    return token;
  }

  /**
   * Safely creates a remediation GitHub Issue using strict argument arrays.
   */
  static async createRemediationIssue(
    repoSlug: string,
    title: string,
    body: string
  ): Promise<{ issueUrl: string }> {
    if (!REPO_SLUG_REGEX.test(repoSlug)) {
      throw new Error("Invalid repository slug format.");
    }

    const { stdout } = await execFileAsync(
      "gh",
      [
        "issue",
        "create",
        "--repo",
        repoSlug,
        "--title",
        `[RepoSage Audit] ${title.slice(0, 120)}`,
        "--body",
        body,
      ],
      { timeout: 15000 }
    );

    return { issueUrl: stdout.trim() };
  }
}
```
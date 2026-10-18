# RepoSage 🔎

> **Local-first, evidence-grounded GitHub repository auditing powered by open-weight Gemma 4.**<br>
> Official open-source AI submission for **MLH Hacktoberfest Hack Day Lahore × Fluxxion 2026**, targeting the **Best Open-Source AI Project** challenge.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Gemma 4](https://img.shields.io/badge/Model-Gemma%204%20(Apache%202.0)-4285F4.svg)](https://ai.google.dev/gemma/docs/core/model_card_4)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A520.11-339933.svg)](https://nodejs.org/)
[![Hacktoberfest 2026](https://img.shields.io/badge/Hacktoberfest-2026-orange.svg)](https://events.mlh.com/events/15520-hacktoberfest-hack-day-lahore-x-fluxxion)
[![Challenge](https://img.shields.io/badge/Challenge-Best%20Open--Source%20AI%20Project-0080FF.svg)](https://www.mlh.com/events/hacktoberfest-hack-day-lahore-x-fluxxion/challenges/01a0d987-0c41-12ea-13ac-5b85755dc2f3)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

> [!NOTE]
> **Project status: v1.0.0 implemented.** The full audit pipeline, API, and dashboard are in the repository. `npm ci`, `npm run typecheck`, and `npm run build` pass on Node.js 24.22 with npm 11.19 (Windows). There is no automated test suite or CI workflow yet; see [Known Limitations](#known-limitations).

---

## Table of Contents

- [Overview](#overview)
- [Hackathon Context](#hackathon-context)
- [Problem & Solution](#problem--solution)
- [What Makes RepoSage Different](#what-makes-reposage-different)
- [Open-Weight AI & Supported Models](#open-weight-ai--supported-models)
- [Architecture](#architecture)
- [Audit Pipeline](#audit-pipeline)
- [Health Scoring & Rules](#health-scoring--rules)
- [Execution Modes](#execution-modes)
- [The Dashboard](#the-dashboard)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [npm Scripts](#npm-scripts)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Security Model](#security-model)
- [Known Limitations](#known-limitations)
- [Roadmap](#roadmap)
- [Specification Documents](#specification-documents)
- [Governance & Community](#governance--community)
- [Contributors & Acknowledgments](#contributors--acknowledgments)

---

## Overview

**RepoSage** audits GitHub repositories for CI/CD security, testing, dependency hygiene, documentation, security governance, and maintenance health. It combines:

- a **Next.js 15** dashboard: Mission Control, a live audit workspace, and a Model Comparison Arena,
- a **Node.js + Express** API that runs the audit pipeline and streams progress over Server-Sent Events,
- **GitHub CLI (`gh`)** authentication, so you never paste a Personal Access Token,
- a **deterministic rule engine** (22 rules, 6 dimensions) that computes a 0–100 Health Score before any AI runs,
- dual-runtime **Gemma 4** analysis: `Gemma 4 E4B` locally through Ollama, and `Gemma 4 26B` hosted through Google AI Studio,
- a **Citation Verifier** that checks every AI claim against the repository's real Git tree and quarantines anything it cannot verify.

Verified findings can be exported as a portable Markdown report or filed on the audited repository as GitHub Issues after explicit confirmation.

---

## Hackathon Context

RepoSage is submitted to **Hacktoberfest Hack Day Lahore × Fluxxion**, organized with **Major League Hacking (MLH)**, **DigitalOcean**, and **Fluxxion**.

- **Event page**: [Hacktoberfest Hack Day Lahore × Fluxxion](https://events.mlh.com/events/15520-hacktoberfest-hack-day-lahore-x-fluxxion)
- **Challenge**: [Best Open-Source AI Project](https://www.mlh.com/events/hacktoberfest-hack-day-lahore-x-fluxxion/challenges/01a0d987-0c41-12ea-13ac-5b85755dc2f3) (sponsored by DigitalOcean)
- **Challenge requirements**:
  1. Open-source or open-weight AI must be an important part of the project.
  2. The project must be published in a public GitHub repository under an open-source license.
  3. Any agent skill component must comply with the [Agent Skill Open Standard](https://dev.to/loc_carrre_0d798813c662/agent-skills-explained-what-they-are-what-they-arent-and-how-to-use-them-bf9).
  4. Any model harness entry must include an original implementation or meaningful changes to an existing open-source harness.

**How RepoSage meets them**: both runtimes use Apache 2.0 Gemma 4 open weights; the code is MIT-licensed in a public repository; and the inference harness (evidence compiler, schema-constrained prompting with one repair retry, citation verifier, and consensus matrix in `apps/api/src/services/`) is an original implementation.

---

## Problem & Solution

### The problem
- **AI audit tools hallucinate.** LLM reviewers confidently cite files, workflows, and configs that do not exist.
- **Facts and opinions get mixed.** Scores produced by an LLM are not reproducible and cannot be trusted as metrics.
- **Credential friction and risk.** Most tools ask you to paste a PAT into a web form or `.env` file.
- **Privacy.** Auditing private code usually means shipping it to a third-party cloud API.

### The solution
RepoSage separates **deterministic facts** from **AI interpretation**:

1. Evidence is collected through your existing `gh` session.
2. A static rule engine scores the repository with no model involved.
3. Gemma 4 explains risks and proposes remediation, using only a compact, secret-redacted, SHA-256-hashed Evidence Manifest.
4. Every AI finding must cite a real file path or a real deterministic check. Anything else is quarantined.

---

## What Makes RepoSage Different

| Capability | How the code does it |
| :--- | :--- |
| **Zero-PAT onboarding** | `GhCliBridge` reads the token from `gh auth token` into a module-private, 5-minute in-memory cache. It is never logged, persisted, or returned to the browser. |
| **Deterministic-first scoring** | `runDeterministicEngine` is a pure function over collected evidence. It runs before inference and works with both model runtimes offline. |
| **Hallucination quarantine** | Findings citing a path that is not in the Git tree, an unknown check ID, or a check that actually passed are marked `UNVERIFIED_PATH` / `UNVERIFIED_CHECK`, excluded from the action plan, and cannot be filed as issues. |
| **Provably fair comparison** | The manifest is serialized as canonical JSON (recursively sorted keys) and hashed. Both models receive the same bytes, and the Arena shows whether their `manifestSha256` values match. |
| **Local Privacy Mode** | With `gemma4:e4b` on Ollama, no repository content is sent to a third-party AI service. |
| **Actionable output** | Markdown export and confirmed `gh issue create`, with the issue body built server-side from the stored verified finding. |

---

## Open-Weight AI & Supported Models

| Role | Model | Runtime | Default identifier | License |
| :--- | :--- | :--- | :--- | :--- |
| **Local Privacy Mode** | Gemma 4 E4B | [Ollama](https://ollama.com/library/gemma4) `/api/chat` with a JSON-schema `format` | `gemma4:e4b` | [Apache 2.0](https://opensource.googleblog.com/2026/03/gemma-4-expanding-the-gemmaverse-with-apache-20.html) |
| **Hosted Mode** | Gemma 4 26B (MoE, A4B) | [Google AI Studio / Gemini API](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api) via `@google/genai` with `responseJsonSchema` | `gemma-4-26b-a4b-it` | Apache 2.0 weights; API use subject to Google's terms |

Both runs use `temperature: 0.1`, and Ollama runs with `num_ctx: 8192`. The JSON schema the models must follow is generated from the shared Zod contract (`LlmAuditOutputSchema`) with `zod-to-json-schema`. Override the models with `LOCAL_GEMMA_MODEL` and `HOSTED_GEMMA_MODEL`.

---

## Architecture

RepoSage is an npm-workspaces monorepo with three packages:

| Workspace | Package | Role |
| :--- | :--- | :--- |
| `packages/shared` | `@reposage/shared` | Zod schemas and TypeScript types shared by the API and the web app. Must be built before the others (`npm run build:shared`). |
| `apps/api` | `@reposage/api` | Express API on `127.0.0.1:4000`, under `/api/v1` |
| `apps/web` | `@reposage/web` | Next.js App Router dashboard on port `3000` |

```text
+--------------------------------------------------------------------------+
|                 USER WORKSTATION (LOCAL-FIRST BOUNDARY)                  |
|                                                                          |
|  +-------------------------------+          +-------------------------+  |
|  |  Next.js 15 dashboard (:3000) |          |   GitHub CLI (gh)       |  |
|  |  Mission Control, audit       |          |   OS keyring session    |  |
|  |  workspace, Comparison Arena  |          |   auth / issue create   |  |
|  +---------------+---------------+          +------------+------------+  |
|                  | REST + SSE (/api/v1/*)                ^ execFile()    |
|                  v                                       | (no shell)    |
|  +---------------+---------------------------------------+------------+  |
|  |           Express API (127.0.0.1:4000) · pipeline.ts               |  |
|  |  ghBridge -> collector -> deterministic -> compiler -> orchestrator|  |
|  |  -> verifier -> (consensus) ; auditStore holds sessions in memory  |  |
|  +-----------------+-------------------------------+------------------+  |
|                    v                               v                     |
|      +-------------+------------+     +------------+-------------+       |
|      | Ollama: gemma4:e4b       |     | Google AI Studio:        |       |
|      | 127.0.0.1:11434          |     | gemma-4-26b-a4b-it       |       |
|      +--------------------------+     +--------------------------+       |
+--------------------------------------------------------------------------+
                    GitHub GraphQL + REST APIs (via @octokit)
```

---

## Audit Pipeline

`runAuditPipeline` (`apps/api/src/services/pipeline.ts`) runs these steps and streams a stage event for each:

| Stage | Module | What happens |
| :--- | :--- | :--- |
| `AUTH_CHECK` | `ghBridge.ts` | Runs `gh auth status --hostname github.com` and warms the in-memory token cache in parallel. Fails the audit if `gh` is not authenticated. |
| `COLLECTING` | `collector.ts`, `github.ts` | In parallel: one batched GraphQL query for metadata (license, languages, issue/PR counts, a 30-issue triage sample, branch protection, viewer permission, community-health URLs) and the recursive `HEAD` tree via REST. Then fetches up to 45 high-signal files (max 15 workflows) through aliased GraphQL batches of 25. |
| `DETERMINISTIC_DONE` | `deterministic.ts` | Evaluates all 22 rules and emits the Health Score and grade. A full snapshot is streamed here, so the score appears before any AI runs. |
| `COMPILING` | `compiler.ts`, `utils/redact.ts`, `utils/canonical.ts` | Builds the Evidence Manifest: repo vitals, `FAIL`/`WARN` results, passed check IDs, a tree summary, and redacted excerpts. Shrinks it until it fits `MAX_MANIFEST_TOKENS`, then hashes it. |
| `AI_INFERENCE` | `orchestrator.ts`, `ollamaClient.ts`, `geminiClient.ts`, `prompts.ts` | Runs the selected model(s) in parallel. Invalid output gets at most one repair prompt that includes the Zod errors. Failures degrade gracefully instead of failing the audit. |
| `VERIFIED` | `verifier.ts`, `orchestrator.ts` | Verifies citations, computes telemetry, and in Compare mode builds the consensus matrix. |
| `COMPLETE` / `ERROR` | `auditStore.ts` | Final snapshot. Unexpected errors produce an `ERROR` stage with a safe message; details go only to the API log. |

### Evidence collection limits
- **Per file**: files larger than `MAX_FILE_BYTES` (64 KB) are recorded with their size but no content.
- **Per audit**: total fetched content is capped by `MAX_EVIDENCE_BYTES` (512 KB).
- **Priority order**: README, then manifests and workflows, then `.gitignore`, env templates and Dependabot/Renovate config, then governance files, then Docker and test configs, and lockfiles last.
- **Empty repositories**: tree-dependent checks are skipped instead of failed.

### Evidence Manifest compression
Excerpts start at fixed character budgets (README 1,600, `package.json` 1,000 with only audit-relevant fields kept, workflows 700 each, other configs 300–500). While the token estimate (≈ 4 characters per token) exceeds the budget, the compiler shrinks excerpts by 20% at a time (down to a 160-character floor), then drops the lowest-priority excerpts, then trims the path lists.

### Citation verification rules
A finding is `VERIFIED` only if every `evidenceRefs` entry passes:

| Problem | Result |
| :--- | :--- |
| `filePath` is not in the Git tree (files and directories) | `UNVERIFIED_PATH` |
| `filePath` is `REPO_ROOT` without a `checkId` | `UNVERIFIED_PATH` |
| `checkId` is not one of the 22 rules | `UNVERIFIED_CHECK` |
| `checkId` refers to a check that `PASS`ed | `UNVERIFIED_CHECK` |

Verified findings are sorted by priority, then severity. Each one gets a stable, model-scoped ID (`e4b-…` or `26b-…`), and failed checks are explained in `verificationNotes`.

---

## Health Scoring & Rules

The score is computed **100% deterministically**. Each rule returns `PASS` (full points), `WARN` (partial points, usually 50% or a ratio such as "3 of 5 actions pinned"), `FAIL` (0), or `SKIPPED_INSUFFICIENT_EVIDENCE` (excluded from the calculation).

$$S = \text{round}\left( \frac{\sum_{i \in \text{Active}} \text{earnedPoints}_i}{\sum_{i \in \text{Active}} \text{weight}_i} \times 100 \right)$$

**Grades**: A ≥ 90 · B ≥ 75 · C ≥ 60 · D ≥ 40 · F < 40. A dimension whose checks were all skipped shows `n/a`.

| Dimension | Weight | Rule (`checkId`) | Points |
| :--- | :---: | :--- | :---: |
| **CI/CD & Automation** | 20% | `CI_WORKFLOWS_PRESENT`: GitHub Actions workflows exist (other CI earns partial credit) | 8 |
| | | `CI_IMMUTABLE_SHA_PINNING`: third-party actions pinned to 40-character commit SHAs | 7 |
| | | `CI_EXPLICIT_PERMISSIONS`: workflows declare a `permissions:` block | 5 |
| **Testing & Quality Gates** | 20% | `TEST_RUNNER_DEPENDENCY`: test runner declared (JS, Python, Go, Rust, `node --test`) | 5 |
| | | `TEST_CONFIG_PRESENT`: test runner config file present | 4 |
| | | `TEST_FILES_PRESENT`: at least 3 test files in the tree (1–2 gives `WARN`) | 7 |
| | | `TEST_SCRIPT_DEFINED`: `npm test`, a Makefile `test` target, or a CI test step | 4 |
| **Dependency Hygiene** | 15% | `DEPS_MANIFEST_PRESENT`: dependency manifest at the repository root | 5 |
| | | `DEPS_LOCKFILE_COMMITTED`: lockfile committed (or fully pinned `requirements.txt`) | 5 |
| | | `DEPS_AUTOMATED_UPDATES`: Dependabot or Renovate configured | 5 |
| **Documentation & Onboarding** | 15% | `DOCS_README_PRESENT`: README at the root, at least 300 bytes | 4 |
| | | `DOCS_README_SECTIONS`: README covers installation, usage, and configuration | 5 |
| | | `DOCS_ENV_EXAMPLE`: `.env.example` committed when `.env` is used | 3 |
| | | `DOCS_CONTRIBUTING`: `CONTRIBUTING` in root, `.github/`, `docs/`, or org defaults | 3 |
| **Security & Governance** | 15% | `SEC_LICENSE_VALID`: GitHub detects an SPDX license | 3 |
| | | `SEC_SECURITY_POLICY`: `SECURITY` policy present (or inherited from the org) | 3 |
| | | `SEC_GITIGNORE_SECRETS`: `.gitignore` excludes `.env` files | 2 |
| | | `SEC_NO_TRACKED_SECRETS`: no tracked `.env`, private key, or credential files | 4 |
| | | `SEC_BRANCH_PROTECTION`: default branch requires reviews and status checks (skipped without admin visibility) | 3 |
| **Maintenance & Velocity** | 15% | `MAINT_RECENT_COMMIT`: last commit ≤ 90 days (`WARN` ≤ 365) | 6 |
| | | `MAINT_ISSUE_TRIAGE`: ≥ 70% of recent open issues have a label or comment | 4 |
| | | `MAINT_NOT_ARCHIVED`: repository is not archived or disabled | 5 |

The engine refuses to start if a dimension's rule weights do not add up to its documented weight, so the table above and the code cannot drift apart silently.

---

## Execution Modes

| Mode | Model(s) | Sent to a third-party AI service? | Best for |
| :--- | :--- | :--- | :--- |
| **Local** (`local`) | `gemma4:e4b` via Ollama | No | Private or proprietary repositories |
| **Hosted** (`hosted`) | `gemma-4-26b-a4b-it` via Google AI Studio | The redacted Evidence Manifest only | Deeper reasoning when no local GPU is available |
| **Compare** (`compare`) | Both, in parallel, on identical manifest bytes | The redacted Evidence Manifest, for the hosted run | Benchmarking latency, schema validity, and citation accuracy |

Mission Control picks a default from the preflight result: Compare if both engines are ready, otherwise whichever one is. If a selected engine is unavailable, its run is reported as `FAILED` (unreachable) or `DEGRADED` (invalid JSON after the repair attempt), and the deterministic report is still delivered.

---

## The Dashboard

| Screen / component | What it shows |
| :--- | :--- |
| **Mission Control** (`/`) | `PreflightBanner` status pills for `gh`, Ollama, and AI Studio; `ModeSelector`; `RepoBrowser` with search, visibility filter, archived toggle, pagination, and a manual `owner/repo` field |
| **Diagnostic panel** | Shown when `gh` is missing or logged out, or the API is unreachable. Includes copyable setup commands and a **Retry Connection** button. |
| **Audit workspace** (`/audit/[owner]/[repo]?mode=…&auditId=…`) | `LivePipelineStepper` with per-stage timings and an event log, then `HealthScoreCard` (gauge, radar chart, dimension bars, and a filterable rule table with links to the evidence files at the audited commit) |
| **Findings board** | Per-model tabs, executive summary, architectural risks, quick wins, severity and category filters, and a **Show quarantine** toggle |
| **Finding card** | Severity, priority, category, verification badge, remediation steps, and citation chips that link to the file at the audited commit. **Create gh Issue** opens a confirmation dialog first. |
| **Model Comparison Arena** | Manifest SHA-256 with an "identical bytes" check, a telemetry table (latency, first-try schema validity, findings, verified, unsupported, citation accuracy) with the better value highlighted, and the consensus matrix (`BOTH` / `E4B only` / `26B only`) |
| **Markdown report** | Sanitized live preview with **Download .md** and **Copy** |

The audit URL includes `auditId`, so refreshing the page reconnects to the same audit (while it is still held in API memory) instead of starting a new one.

---

## Technology Stack

All dependency versions are pinned exactly in each workspace's `package.json`.

| Layer | Technologies |
| :--- | :--- |
| **Frontend** (`apps/web`) | Next.js 15.5, React 19.1, TypeScript 5.9, Tailwind CSS 4.3 (`@tailwindcss/postcss`), Lucide React, `react-markdown` 9 + `remark-gfm` + `rehype-sanitize` |
| **Backend** (`apps/api`) | Node.js ≥ 20.11, Express 4.22, `@octokit/graphql` 9, `@octokit/rest` 22, `yaml`, Helmet 8, `express-rate-limit` 8, `cors`, `dotenv`, `tsx` (dev) |
| **AI runtimes** | Ollama HTTP API (`gemma4:e4b`), Google Gen AI SDK `@google/genai` 2.30 (`gemma-4-26b-a4b-it`) |
| **Contracts** (`packages/shared`) | Zod 3.25 + `zod-to-json-schema` 3.25 |
| **Tooling** | npm workspaces, `concurrently`, strict TypeScript (`noUncheckedIndexedAccess`), ESM (`NodeNext`) |

---

## Project Structure

```text
HacktoberFest-x-Fluxxion/
├── package.json                  # Workspace root scripts (dev, build, start, typecheck, preflight)
├── package-lock.json
├── tsconfig.base.json            # Strict shared compiler options
├── scripts/
│   └── check-env.mjs             # `npm run preflight` environment checker
├── packages/shared/
│   └── src/schemas.ts            # Zod contracts: rules, health, manifest, findings, telemetry, API, SSE
├── apps/api/
│   ├── .env.example
│   └── src/
│       ├── server.ts             # Express bootstrap: host/origin allow-lists, Helmet, CORS, rate limit
│       ├── config.ts             # Zod-validated environment config
│       ├── routes/               # system.ts · repos.ts · audits.ts · actions.ts
│       ├── services/
│       │   ├── ghBridge.ts       # Safe execFile wrapper for gh (auth status, token, issue create)
│       │   ├── github.ts         # Octokit clients hydrated with the gh token
│       │   ├── repos.ts          # Repository listing for the browser
│       │   ├── collector.ts      # GraphQL + REST evidence collector
│       │   ├── deterministic.ts  # 22-rule engine and Health Score
│       │   ├── compiler.ts       # Evidence Manifest builder and token budgeting
│       │   ├── prompts.ts        # System prompt, boundary tags, repair prompt, JSON schema
│       │   ├── modelClient.ts    # Shared model client interface
│       │   ├── ollamaClient.ts   # Gemma 4 E4B via Ollama
│       │   ├── geminiClient.ts   # Gemma 4 26B via Google AI Studio
│       │   ├── orchestrator.ts   # Inference, repair retry, telemetry, consensus
│       │   ├── verifier.ts       # JSON extraction and citation verification
│       │   ├── exporter.ts       # Markdown report
│       │   ├── pipeline.ts       # End-to-end audit pipeline
│       │   └── auditStore.ts     # In-memory audit sessions and SSE fan-out
│       └── utils/                # redact.ts · canonical.ts · logger.ts · http.ts
├── apps/web/
│   ├── .env.example
│   ├── next.config.ts            # Security headers, transpiles @reposage/shared
│   └── src/
│       ├── app/                  # layout.tsx · page.tsx (Mission Control) · audit/[owner]/[repo]/page.tsx
│       ├── components/           # PreflightBanner, DiagnosticPanel, ModeSelector, RepoBrowser,
│       │                         # LivePipelineStepper, HealthScoreCard, FindingsBoard, FindingCard,
│       │                         # ModelComparisonArena, MarkdownPreviewModal, Modal, ui
│       ├── hooks/useAuditStream.ts  # EventSource hook with snapshot fallback
│       └── lib/api.ts            # Typed API client
├── docs/                         # Requirements, architecture, and tech stack specs
├── skills/                       # Agent Skill Open Standard definitions (SKILL.md)
├── .github/                      # Issue & PR templates
└── CHANGELOG.md · CODE_OF_CONDUCT.md · CONTRIBUTING.md · CONTRIBUTORS.md · LICENSE · SECURITY.md · SUPPORT.md
```

---

## Getting Started

### Prerequisites

| Tool | Version | Needed for |
| :--- | :--- | :--- |
| Git | ≥ 2.30 | Cloning |
| Node.js + npm | Node ≥ 20.11 (verified on 24.22) | Running the monorepo (enforced by `engines` and the preflight script) |
| [GitHub CLI](https://cli.github.com/) | Recent | Authentication, repository listing, issue creation |
| [Ollama](https://ollama.com/) | Release with Gemma 4 support | Local and Compare modes (optional) |
| Google AI Studio API key | — | Hosted and Compare modes (optional) |

> [!TIP]
> On Windows, if PowerShell blocks `npm` with an execution-policy error, use `npm.cmd` (for example `npm.cmd run dev`), or run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

### 1. Clone and install

```bash
git clone https://github.com/ahmmikun/HacktoberFest-x-Fluxxion.git
cd HacktoberFest-x-Fluxxion
npm install
```

### 2. Authenticate the GitHub CLI

```bash
gh auth login --web --scopes repo,read:org
gh auth status
```

### 3. Create the environment files

```bash
# macOS / Linux
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

```powershell
# Windows PowerShell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env.local
```

Add `GOOGLE_AI_API_KEY` to `apps/api/.env` if you want Hosted or Compare mode. Without the file, the API uses the defaults listed under [Configuration](#configuration).

### 4. (Optional) Pull the local model

```bash
ollama pull gemma4:e4b
ollama serve        # if Ollama is not already running
```

### 5. Check your setup

```bash
npm run preflight
```

This checks Node.js, `gh` installation and login, `apps/api/.env`, Ollama reachability and model availability, and whether the AI Studio key is set. It never prints secret values. Only Node and `gh` problems block startup; missing model engines are reported as warnings.

### 6. Run

```bash
npm run dev
```

This builds `@reposage/shared`, then starts the API (`tsx watch`, http://127.0.0.1:4000/api/v1) and the dashboard (http://localhost:3000) side by side. Open <http://localhost:3000>; if `gh` is authenticated, your repositories are listed straight away.

For a production build: `npm run build` followed by `npm run start`.

---

## npm Scripts

Run these from the repository root.

| Script | What it does |
| :--- | :--- |
| `npm run dev` | Builds the shared package, then runs API and web in watch mode with `concurrently` |
| `npm run dev:api` / `npm run dev:web` | Builds the shared package, then runs one app |
| `npm run build` | Builds shared → API (`tsc` to `apps/api/dist`) → web (`next build`) |
| `npm run build:shared` | Builds `packages/shared` only |
| `npm run start` | Starts the built API (`node dist/server.js`) and web app (`next start`) |
| `npm run typecheck` | Builds shared, then runs `tsc --noEmit` in every workspace |
| `npm run preflight` | Runs `scripts/check-env.mjs` |

There are no `test` or `lint` scripts yet.

---

## Configuration

### API (`apps/api/.env`)

The API validates these with Zod at startup and exits with the names of invalid variables (never their values).

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `PORT` | `4000` | API port |
| `HOST` | `127.0.0.1` | Interface to bind. Keep it on loopback; the API logs a warning otherwise. |
| `CORS_ORIGIN` | `http://localhost:3000,http://127.0.0.1:3000` | Comma-separated browser origins allowed to call the API |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | Ollama endpoint |
| `LOCAL_GEMMA_MODEL` | `gemma4:e4b` | Local model tag |
| `OLLAMA_TIMEOUT_MS` | `60000` | Local inference timeout |
| `GOOGLE_AI_API_KEY` | unset | Google AI Studio key. Leaving the placeholder value counts as unset. |
| `HOSTED_GEMMA_MODEL` | `gemma-4-26b-a4b-it` | Hosted model ID |
| `HOSTED_TIMEOUT_MS` | `45000` | Hosted inference timeout |
| `MAX_FILE_BYTES` | `65536` | Largest single file whose content is fetched |
| `MAX_EVIDENCE_BYTES` | `524288` | Total content budget per audit |
| `MAX_MANIFEST_TOKENS` | `2500` | Evidence Manifest token budget |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, or `error` |

### Web (`apps/web/.env.local`)

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:4000/api/v1` | API base URL used by the browser |

> [!CAUTION]
> Every `NEXT_PUBLIC_*` value is shipped to the browser. Never put `GOOGLE_AI_API_KEY` or any other secret in `apps/web`, and never commit `.env` files.

---

## API Reference

All endpoints are under `http://127.0.0.1:4000/api/v1` and return JSON errors shaped as `{ "error": string, "details"?: … }`.

| Method | Endpoint | Request | Response |
| :--- | :--- | :--- | :--- |
| `GET` | `/system/health` | — | `{ "ok": true }` |
| `GET` | `/system/preflight` | — | `gh` status (installed, authenticated, username, scopes), Ollama status (reachable, model available), AI Studio (`configured`, `model`). The key itself is never returned. |
| `GET` | `/repos` | Query: `q` (≤ 100 chars), `visibility` (`all`·`public`·`private`), `includeArchived` (`true`·`false`), `after` (cursor), `first` (1–100, default 30) | `{ repos[], pageInfo, totalCount }`, sorted by most recent push |
| `POST` | `/audits` | `{ "repo": "owner/repo", "mode": "local" \| "hosted" \| "compare" }` | `202 { "auditId" }`. `429` if 3 audits are already running. |
| `GET` | `/audits/:id` | — | Current `AuditResult` snapshot |
| `GET` | `/audits/:id/stream` | — | SSE stream (see below) |
| `POST` | `/audits/:id/export` | — | `text/markdown` attachment. `409` while the audit is still running. |
| `POST` | `/actions/create-issue` | `{ "auditId", "modelRuntime": "OLLAMA_LOCAL" \| "GOOGLE_AI_STUDIO", "findingId", "confirm": true }` | `201 { "issueUrl" }`. `404` for unverified or unknown findings. Repeat requests return the existing URL. |

### SSE stream

The stream first replays all past events, then sends live ones, with a heartbeat comment every 15 s and `retry: 3000`.

| Event | Payload |
| :--- | :--- |
| `stage` | `{ type, auditId, stage, message, elapsedMs, timestamp, detail? }`, where `stage` is `AUTH_CHECK`, `COLLECTING`, `DETERMINISTIC_DONE`, `COMPILING`, `AI_INFERENCE`, `VERIFIED`, `COMPLETE`, or `ERROR` |
| `snapshot` | Full `AuditResult` (sent after deterministic scoring) |
| `complete` | Final `AuditResult`; the server then closes the stream |

### Rate limits
- 300 requests per minute across `/api/v1`
- 10 new audits per minute
- 10 issue creations per minute
- At most 3 audits running at once

All request and response shapes are defined in [`packages/shared/src/schemas.ts`](packages/shared/src/schemas.ts).

---

## Security Model

The API has **no user authentication** and acts with your `gh` session, so it is locked down to the local machine.

| Area | Protection in the code |
| :--- | :--- |
| **Network exposure** | Binds to `127.0.0.1` by default. A Host-header allow-list (`localhost`, `127.0.0.1`, `[::1]`, `HOST`) blocks DNS rebinding, and an Origin allow-list blocks requests from other browser tabs. |
| **HTTP hardening** | Helmet, CORS limited to `GET`/`POST`, 64 KB JSON body limit, rate limits, and no `x-powered-by`. The web app sends `X-Frame-Options: DENY`, `nosniff`, and `no-referrer`. |
| **Command injection** | `gh` runs only through `execFile` with argument arrays. Repo slugs must match `^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$`. Issue bodies are passed through stdin (`--body-file -`). |
| **Token handling** | The `gh` token is cached in memory for 5 minutes and dropped on a 401. Errors from `gh auth token` are discarded because they could contain the token. |
| **Log hygiene** | Every log line passes through the secret redactor. Preflight and config errors print names, never values. AI Studio SDK errors have `key=` values stripped. |
| **Secret redaction** | Before anything reaches a model, the redactor masks PEM private keys, GitHub tokens (`gh[pousr]_`, `github_pat_`), AWS key IDs, Google API keys, Slack tokens and webhooks, Stripe live keys, OpenAI-style keys, JWTs, credentials in URLs, and high-entropy `secret`/`token`/`password`/`api_key` assignments. Redaction runs on the full text before truncation. |
| **Prompt injection** | Evidence is wrapped in `<untrusted_repo_evidence>` tags, with `<` and `>` JSON-escaped so repository content cannot close the tag. The system prompt tells the model to treat the evidence as data only. |
| **XSS** | React escapes all model text. The Markdown preview uses `rehype-sanitize` with `skipHtml`, and the exporter HTML-escapes untrusted text. |
| **GitHub writes** | Issues are created only for stored `VERIFIED` findings, after a confirmation dialog and `confirm: true`. The issue body is built server-side, so clients cannot inject content. |

See [SECURITY.md](SECURITY.md) for how to report vulnerabilities.

---

## Known Limitations

- **No automated tests or CI yet.** This repository has no test files and no `.github/workflows`, which RepoSage's own `TEST_FILES_PRESENT` and `CI_WORKFLOWS_PRESENT` rules would flag.
- **In-memory audit sessions.** Audits are kept for 1 hour (at most 50) and are lost when the API restarts. Export reports you want to keep.
- **Single user, localhost only.** There is no authentication layer, so do not expose the API on a network.
- **Very large repositories.** If GitHub truncates the recursive tree, `TEST_FILES_PRESENT` and `SEC_NO_TRACKED_SECRETS` report `WARN` instead of a definite result, and the UI shows "tree truncated".
- **Token estimates are approximate.** The manifest budget assumes about 4 characters per token, not a real Gemma tokenizer.
- **github.com only.** `gh` calls target `--hostname github.com`; GitHub Enterprise Server is not supported.

---

## Roadmap

| Status | Item |
| :---: | :--- |
| ✅ | Shared Zod contracts, `gh` bridge, evidence collector, 22-rule engine, evidence compiler and redactor |
| ✅ | Dual-runtime Gemma 4 inference with schema repair, citation verifier, telemetry, and consensus matrix |
| ✅ | SSE streaming, Markdown export, confirmed one-click issues, and the Next.js dashboard |
| ⏳ | Unit tests for the verifier, redactor, compiler, and rule engine, covering the acceptance criteria |
| ⏳ | GitHub Actions workflow with SHA-pinned actions, plus Dependabot |
| ⏳ | DigitalOcean deployment guide for a self-hosted team instance (requires adding authentication first) |
| ⏳ | SARIF export and scheduled re-audits |

---

## Specification Documents

The original design specs live in [`/docs`](docs/). Where the specs and the code differ, the code and this README describe the current behavior.

| Document | Contents |
| :--- | :--- |
| [Requirements Specification](docs/reposage_requirements_specification.md) | Personas, functional (`FR-*`) and non-functional (`NFR-*`) requirements, acceptance matrix |
| [System Architecture & Technical Design](docs/reposage_system_design_architecture.md) | Module design, scoring formula, schemas, API, frontend components |
| [Technology Stack & Setup Guide](docs/reposage_technology_stack_setup_guide.md) | Monorepo layout, dependencies, environment template, `GhCliBridge` reference |

---

## Governance & Community

- **Code of Conduct**: [Contributor Covenant v2.1](CODE_OF_CONDUCT.md)
- **Contributing**: [CONTRIBUTING.md](CONTRIBUTING.md)
- **Security**: [SECURITY.md](SECURITY.md)
- **Support & troubleshooting**: [SUPPORT.md](SUPPORT.md)
- **Changelog**: [CHANGELOG.md](CHANGELOG.md)

---

## Contributors & Acknowledgments

### Project Initiator & Maintainer
- **Salman Ahmad** ([@ahmmikun](https://github.com/ahmmikun))

See [CONTRIBUTORS.md](CONTRIBUTORS.md) for the full team.

### Acknowledgments
- **Major League Hacking (MLH)** and **DigitalOcean** for organizing and sponsoring Hacktoberfest 2026.
- **Fluxxion** ([fluxxion.dev](https://fluxxion.dev/)) and event hosts Hussnain Ahmad, Zohaib Saeed, and Zaid Latif for hosting the Lahore Hack Day.
- **Google DeepMind** for releasing Gemma 4 under Apache 2.0, and the **Ollama** and **GitHub CLI** maintainers.

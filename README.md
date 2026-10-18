# RepoSage 🔎

> **Local-first, evidence-grounded GitHub repository auditing powered by open-weight Gemma 4.**<br>
> Official open-source AI submission for **MLH Hacktoberfest Hack Day Lahore × Fluxxion 2026**, targeting the **Best Open-Source AI Project** challenge.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Gemma 4](https://img.shields.io/badge/Model-Gemma%204%20(Apache%202.0)-4285F4.svg)](https://ai.google.dev/gemma/docs/core/model_card_4)
[![Hacktoberfest 2026](https://img.shields.io/badge/Hacktoberfest-2026-orange.svg)](https://events.mlh.com/events/15520-hacktoberfest-hack-day-lahore-x-fluxxion)
[![Challenge](https://img.shields.io/badge/Challenge-Best%20Open--Source%20AI%20Project-0080FF.svg)](https://www.mlh.com/events/hacktoberfest-hack-day-lahore-x-fluxxion/challenges/01a0d987-0c41-12ea-13ac-5b85755dc2f3)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

> [!IMPORTANT]
> **Project status: specification complete, implementation in progress.**
> The RepoSage monorepo (`apps/web`, `apps/api`, `packages/shared`) is being built against the specs in [`/docs`](docs/). Commands marked 🚧 below become available as those workspaces land.

---

## Table of Contents

- [Overview](#overview)
- [Hackathon Context](#hackathon-context)
- [Problem & Solution](#problem--solution)
- [What Makes RepoSage Different](#what-makes-reposage-different)
- [Open-Weight AI & Supported Models](#open-weight-ai--supported-models)
- [Architecture](#architecture)
- [Audit Pipeline](#audit-pipeline)
- [Health Scoring](#health-scoring)
- [Execution Modes](#execution-modes)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Security Model](#security-model)
- [Acceptance Criteria](#acceptance-criteria)
- [Roadmap & Status](#roadmap--status)
- [Specification Documents](#specification-documents)
- [Governance & Community](#governance--community)
- [Contributors & Acknowledgments](#contributors--acknowledgments)

---

## Overview

**RepoSage** audits GitHub repositories for onboarding readiness, CI/CD security, testing, dependency hygiene, documentation, and maintenance health. It combines:

- a **Next.js 15** frontend (Mission Control dashboard, live audit stream, model comparison arena),
- a **Node.js + Express** backend that runs the audit pipeline,
- native **GitHub CLI (`gh`)** authentication, so you never paste a Personal Access Token,
- a **deterministic rule engine** that computes a 0–100 Health Score before any AI runs,
- dual-runtime **Gemma 4** inference: `Gemma 4 E4B` locally through Ollama, and `Gemma 4 26B` hosted through Google AI Studio,
- a **Citation Verifier** that checks every AI claim against the repository's real file tree.

Verified findings can be exported as a portable Markdown report or pushed to the target repository as GitHub Issues in one click.

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

**How RepoSage meets them**: both inference runtimes use Apache 2.0 Gemma 4 open weights; the code is MIT-licensed in a public repo; and the Gemma orchestrator, evidence compiler, and citation verifier together form an original model harness.

---

## Problem & Solution

### The problem
- **AI audit tools hallucinate.** LLM reviewers confidently cite files, workflows, and configs that do not exist.
- **Facts and opinions get mixed.** Scores produced by an LLM are not reproducible and cannot be trusted as metrics.
- **Credential friction and risk.** Most tools ask you to paste a PAT into a web form or `.env` file.
- **Privacy.** Auditing private code usually means shipping it to a third-party cloud API.

### The solution
RepoSage separates **deterministic facts** from **AI interpretation**:

1. Evidence is collected through your existing `gh` session (no PAT pasting).
2. A static rule engine scores the repository deterministically.
3. Gemma 4 explains risks and proposes remediation, using only a compact, secret-redacted, hashed Evidence Manifest.
4. Every AI finding must cite a real file path or a real deterministic check. Anything else is quarantined as unverified.

---

## What Makes RepoSage Different

| Capability | What it means in practice |
| :--- | :--- |
| **Zero-PAT onboarding** | The backend reads your token in memory from `gh auth token`. It is never logged, persisted, or sent to the browser. |
| **Deterministic-first scoring** | The 0–100 Health Score is computed without any LLM, so it still works when both model runtimes are offline. |
| **Hallucination quarantine** | Findings that cite non-existent files or fabricated checks are stripped from the action plan and counted in model telemetry. |
| **Provably fair model comparison** | Both models receive the same SHA-256-hashed Evidence Manifest, byte for byte. |
| **Local Privacy Mode** | With `Gemma 4 E4B` on Ollama, no repository content leaves your machine for AI analysis. |
| **Actionable output** | One-click `gh issue create` (with explicit confirmation) and a portable `.md` report. |

---

## Open-Weight AI & Supported Models

| Role | Model | Runtime | Identifier | License |
| :--- | :--- | :--- | :--- | :--- |
| **Local Privacy Mode** | Gemma 4 E4B | [Ollama](https://ollama.com/library/gemma4) on `127.0.0.1:11434` | `gemma4:e4b` | [Apache 2.0](https://opensource.googleblog.com/2026/03/gemma-4-expanding-the-gemmaverse-with-apache-20.html) |
| **Hosted Mode** | Gemma 4 26B (MoE, A4B) | [Google AI Studio / Gemini API](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api) | `gemma-4-26b-a4b-it` | Apache 2.0 weights; API use subject to Google's terms |

Both models are configurable through environment variables (`LOCAL_GEMMA_MODEL`, `HOSTED_GEMMA_MODEL`). Model weights are distributed under their creators' licenses; see [LICENSE](LICENSE).

---

## Architecture

RepoSage is an npm-workspaces monorepo. The frontend and backend communicate over REST and **Server-Sent Events (SSE)** and share Zod contracts from `packages/shared`.

```text
+--------------------------------------------------------------------------+
|                 USER WORKSTATION (LOCAL-FIRST BOUNDARY)                  |
|                                                                          |
|  +-------------------------------+          +-------------------------+  |
|  |  Next.js 15 Frontend (:3000)  |          |   GitHub CLI (gh)       |  |
|  |  Repo browser, SSE stepper,   |          |   OS keyring session    |  |
|  |  scorecards, model arena      |          |   auth / issue create   |  |
|  +---------------+---------------+          +------------+------------+  |
|                  | REST + SSE (/api/v1/*)                ^ execFile()    |
|                  v                                       | (no shell)    |
|  +---------------+---------------------------------------+------------+  |
|  |                Node.js + Express Backend (:4000)                   |  |
|  |  1. gh CLI Bridge -> 2. Evidence Collector -> 3. Deterministic     |  |
|  |  Engine -> 4. Evidence Compiler & Redactor -> 5. Gemma             |  |
|  |  Orchestrator -> 6. Citation & Schema Verifier                     |  |
|  +-----------------+-------------------------------+------------------+  |
|                    v                               v                     |
|      +-------------+------------+     +------------+-------------+       |
|      | Ollama: gemma4:e4b       |     | Google AI Studio:        |       |
|      | localhost:11434          |     | gemma-4-26b-a4b-it       |       |
|      +--------------------------+     +--------------------------+       |
+--------------------------------------------------------------------------+
```

Full module design, GraphQL query, schemas, and component hierarchy: [System Architecture & Technical Design](docs/reposage_system_design_architecture.md).

---

## Audit Pipeline

| # | Module | Responsibility |
| :--- | :--- | :--- |
| 1 | **`GhCliBridge`** | Verifies `gh auth status`, hydrates an in-memory token via `gh auth token`, and runs `gh issue create` only on explicit user action. All calls use `execFile` with argument arrays. |
| 2 | **`EvidenceCollector`** | One batched GraphQL query for metadata and the `HEAD` tree, then targeted fetches of high-signal files (docs, manifests, lockfiles, workflows, Docker, hygiene configs). Enforces a 64 KB per-file cap and builds the `validTreePaths` set. |
| 3 | **`DeterministicEngine`** | Evaluates 18 rules across 6 dimensions. Each rule returns `PASS`, `WARN`, `FAIL`, or `SKIPPED` with observed evidence. |
| 4 | **`EvidenceCompiler`** | Redacts secrets (`ghp_`, `AKIA`, private keys, webhooks), compresses evidence to ≤ 2,500 tokens, wraps it in `<untrusted_repo_evidence>` tags, and computes `manifestSha256`. |
| 5 | **`GemmaOrchestrator`** | Runs local, hosted, or both models in parallel with structured JSON output and at most one schema-repair retry. |
| 6 | **`CitationVerifier`** | Validates every `evidenceRefs` entry against the Git tree and the deterministic check IDs, and records hallucination telemetry. |

Progress streams to the UI over SSE in these stages: `AUTH_CHECK` → `COLLECTING` → `DETERMINISTIC_DONE` → `AI_INFERENCE` → `VERIFIED` → `COMPLETE`.

---

## Health Scoring

The Health Score is computed **100% deterministically** before any model inference.

| Dimension | Weight | Examples of checks |
| :--- | :---: | :--- |
| CI/CD & Automation | 20% | Workflows present, actions pinned to commit SHAs instead of mutable tags, explicit `permissions:` blocks |
| Testing & Quality Gates | 20% | Test runner dependency, test config, `*.test.*` / `*.spec.*` files, `test` script |
| Dependency Hygiene | 15% | Manifest present, lockfile committed, Dependabot or Renovate configured |
| Documentation & Onboarding | 15% | README completeness (install, usage, env), `.env.example`, `CONTRIBUTING.md` |
| Security & Governance | 15% | Valid `LICENSE`, `SECURITY.md`, `.gitignore` excludes secrets, no tracked `.env` or private keys |
| Maintenance & Velocity | 15% | Days since last commit, issue triage health, archived/disabled flags |

Checks that cannot be evaluated (for example, branch protection without admin access) are marked skipped and excluded from the denominator, so missing permissions are never scored as defects:

$$S = \text{round}\left( \frac{\sum_{i \in \text{Active}} \text{earnedPoints}_i}{\sum_{i \in \text{Active}} \text{weight}_i} \times 100 \right)$$

---

## Execution Modes

| Mode | Model | Data leaves your machine? | Best for |
| :--- | :--- | :--- | :--- |
| **Local** | `gemma4:e4b` via Ollama | No | Private or proprietary repositories |
| **Hosted** | `gemma-4-26b-a4b-it` via Google AI Studio | Yes, the redacted Evidence Manifest only | Deeper cross-file reasoning |
| **Compare / Consensus** | Both, in parallel | Yes, for the hosted half | Benchmarking latency, schema validity, and citation accuracy |

With no model available, RepoSage still produces the full deterministic report.

---

## Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** (`apps/web`) | Next.js 15 (App Router), React 19, TypeScript 5, Tailwind CSS 4, Lucide React, React Markdown + remark-gfm |
| **Backend** (`apps/api`) | Node.js ≥ 20.11 LTS, Express, `@octokit/graphql`, `yaml`, `semver`, Helmet, express-rate-limit |
| **AI runtimes** | Ollama (`gemma4:e4b`), Google Gen AI SDK `@google/genai` (`gemma-4-26b-a4b-it`) |
| **Contracts** (`packages/shared`) | Zod + `zod-to-json-schema` as the single source of truth for API, SSE, and LLM output schemas |
| **Tooling** | npm workspaces, `concurrently`, GitHub CLI |

Versions and rationale: [Technology Stack & Workspace Configuration](docs/reposage_technology_stack_setup_guide.md).

---

## Project Structure

```text
HacktoberFest-x-Fluxxion/
├── apps/
│   ├── web/                    # 🚧 Next.js 15 frontend (port 3000)
│   └── api/                    # 🚧 Express backend (port 4000)
│       └── src/services/       #    ghBridge, collector, deterministic, compiler,
│                               #    ollamaClient, geminiClient, verifier, exporter
├── packages/
│   └── shared/                 # 🚧 Shared Zod schemas & TypeScript types
├── docs/
│   ├── reposage_requirements_specification.md
│   ├── reposage_system_design_architecture.md
│   └── reposage_technology_stack_setup_guide.md
├── skills/                     # Agent Skill Open Standard definitions (SKILL.md)
├── .github/                    # Issue & PR templates
├── CHANGELOG.md  CODE_OF_CONDUCT.md  CONTRIBUTING.md  CONTRIBUTORS.md
├── LICENSE  SECURITY.md  SUPPORT.md
└── README.md
```

---

## Getting Started

### Prerequisites

| Tool | Version | Needed for |
| :--- | :--- | :--- |
| Git | ≥ 2.30 | Cloning and contributing |
| Node.js + npm | Node ≥ 20.11 LTS | Running the monorepo |
| [GitHub CLI](https://cli.github.com/) | Latest | Authentication, repo discovery, issue creation |
| [Ollama](https://ollama.com/) | Recent release with Gemma 4 support | Local Mode (optional) |
| Google AI Studio API key | — | Hosted and Compare modes (optional) |

### 1. Clone

```bash
git clone https://github.com/ahmmikun/HacktoberFest-x-Fluxxion.git
cd HacktoberFest-x-Fluxxion
```

### 2. Authenticate the GitHub CLI

```bash
gh auth login
gh auth status   # should show your account and the `repo` scope
```

### 3. (Optional) Pull the local model

```bash
ollama pull gemma4:e4b
curl http://127.0.0.1:11434/api/tags
```

### 4. 🚧 Install and run

```bash
npm install
npm run preflight   # checks gh, Ollama, and AI Studio configuration
npm run dev         # starts API on :4000 and web on :3000
```

Open <http://localhost:3000>. If `gh` is authenticated, your repositories appear immediately with no login form.

### Other workspace scripts 🚧

```bash
npm run build       # build all workspaces
npm run typecheck   # type-check all workspaces
```

---

## Configuration

Copy the backend section of [`.env.example`](.env.example) to `apps/api/.env` and the frontend section to `apps/web/.env.local`. GitHub authentication comes from `gh`, so no GitHub token goes in either file.

| Variable | Scope | Default | Purpose |
| :--- | :--- | :--- | :--- |
| `PORT` | api | `4000` | Express port |
| `CORS_ORIGIN` | api | `http://localhost:3000` | Allowed frontend origin |
| `OLLAMA_BASE_URL` | api | `http://127.0.0.1:11434` | Local Ollama endpoint |
| `LOCAL_GEMMA_MODEL` | api | `gemma4:e4b` | Local model tag |
| `OLLAMA_TIMEOUT_MS` | api | `60000` | Local inference timeout |
| `GOOGLE_AI_API_KEY` | api | — | Google AI Studio key (hosted/compare modes only) |
| `HOSTED_GEMMA_MODEL` | api | `gemma-4-26b-a4b-it` | Hosted model ID |
| `HOSTED_TIMEOUT_MS` | api | `45000` | Hosted inference timeout |
| `MAX_FILE_BYTES` | api | `65536` | Per-file evidence cap |
| `MAX_MANIFEST_TOKENS` | api | `2500` | Evidence Manifest token budget |
| `NEXT_PUBLIC_API_BASE_URL` | web | `http://localhost:4000/api/v1` | Backend base URL |

> [!CAUTION]
> `GOOGLE_AI_API_KEY` belongs only in `apps/api/.env`. Never prefix it with `NEXT_PUBLIC_`, and never commit `.env` files.

---

## API Reference

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `GET` | `/api/v1/system/preflight` | `gh` auth status, Ollama health, AI Studio key configured |
| `GET` | `/api/v1/repos` | Repositories accessible to the `gh` session (paginated, searchable) |
| `POST` | `/api/v1/audits` | Start an audit (`repo`, `mode: local \| hosted \| compare`); returns `auditId` |
| `GET` | `/api/v1/audits/:id/stream` | SSE stream of pipeline stages |
| `POST` | `/api/v1/audits/:id/export` | Download the Markdown report |
| `POST` | `/api/v1/actions/create-issue` | Create a GitHub Issue for a verified finding |

> [!NOTE]
> The API is designed to run on `localhost` for a single user and has no authentication layer of its own. It holds your `gh` token's privileges, so do not expose port 4000 to a network.

---

## Security Model

- **No shell interpolation**: every `gh` call uses `child_process.execFile` with argument arrays; repo slugs are validated against `^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$`.
- **Secret isolation**: the `gh` token and `GOOGLE_AI_API_KEY` exist only in the backend process, never in client bundles, browser traffic, or logs.
- **Secret redaction**: credential patterns are replaced with `[REDACTED_SECRET]` before any payload reaches Google AI Studio.
- **Prompt-injection defense**: repository content is wrapped in `<untrusted_repo_evidence>` and treated strictly as data.
- **XSS defense**: model output is sanitized before rendering.
- **Confirmed mutations only**: issues are created only after explicit user confirmation.

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

---

## Acceptance Criteria

| Area | Condition |
| :--- | :--- |
| Zero-PAT onboarding | With an active `gh auth login` session, the app lists repositories without any login form or token prompt. |
| Deterministic independence | With Ollama and AI Studio both disabled, a complete 0–100 Health Score and rule breakdown is still produced. |
| Hallucination quarantine | A synthetic citation to `src/non_existent_auth.ts` is marked unverified and increments the unsupported-claims counter. |
| Fair model comparison | Compare Mode shows both models evaluated the same `manifestSha256`. |

---

## Roadmap & Status

| Component | Spec | Implementation |
| :--- | :---: | :---: |
| Requirements, architecture, and stack docs | ✅ | — |
| `packages/shared` Zod contracts | ✅ | 🚧 |
| `GhCliBridge` and preflight | ✅ | 🚧 |
| Evidence Collector | ✅ | 🚧 |
| Deterministic Engine & Health Score | ✅ | 🚧 |
| Evidence Compiler & secret redactor | ✅ | 🚧 |
| Ollama (`gemma4:e4b`) and AI Studio (`gemma-4-26b-a4b-it`) clients | ✅ | 🚧 |
| Citation Verifier & telemetry | ✅ | 🚧 |
| SSE streaming, Markdown export, 1-click issues | ✅ | 🚧 |
| Next.js dashboard and Model Comparison Arena | ✅ | 🚧 |

**After the hackathon**: DigitalOcean deployment guide for a self-hosted team instance, SARIF export, and scheduled re-audits.

---

## Specification Documents

| Document | Contents |
| :--- | :--- |
| [Requirements Specification](docs/reposage_requirements_specification.md) | Personas, functional requirements (FR-*), non-functional requirements (NFR-*), acceptance matrix |
| [System Architecture & Technical Design](docs/reposage_system_design_architecture.md) | Module design, GraphQL query, scoring formula, Zod schemas, API, frontend components |
| [Technology Stack & Setup Guide](docs/reposage_technology_stack_setup_guide.md) | Monorepo layout, dependency versions, `package.json` blueprint, environment template, `GhCliBridge` reference |

---

## Governance & Community

- **Code of Conduct**: [Contributor Covenant v2.1](CODE_OF_CONDUCT.md)
- **Contributing**: [CONTRIBUTING.md](CONTRIBUTING.md)
- **Security**: [SECURITY.md](SECURITY.md)
- **Support**: [SUPPORT.md](SUPPORT.md)
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

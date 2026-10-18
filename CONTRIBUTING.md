# Contributing to RepoSage

Welcome to **RepoSage**, built in the `HacktoberFest-x-Fluxxion` repository for **MLH Hacktoberfest Hack Day Lahore × Fluxxion 2026**. Contributions from first-time open-source contributors and experienced builders are equally welcome.

Before writing code, skim the three specs in [`/docs`](docs/). They are the source of truth for behavior, module boundaries, schemas, and dependency choices:

- [Requirements Specification](docs/reposage_requirements_specification.md): what the system must do (`FR-*`, `NFR-*`)
- [System Architecture & Technical Design](docs/reposage_system_design_architecture.md): how the modules fit together
- [Technology Stack & Setup Guide](docs/reposage_technology_stack_setup_guide.md): monorepo layout, versions, environment

If a change makes the code diverge from a spec, update the spec in the same pull request.

---

## Code of Conduct

By participating, you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

---

## Prerequisites

| Tool | Version | Notes |
| :--- | :--- | :--- |
| Git | ≥ 2.30 | |
| Node.js + npm | Node ≥ 20.11 LTS | npm workspaces |
| [GitHub CLI](https://cli.github.com/) | Latest | Run `gh auth login`. RepoSage authenticates through `gh` and never asks for a PAT. |
| [Ollama](https://ollama.com/) | Recent release with Gemma 4 | Optional. Run `ollama pull gemma4:e4b` for Local Mode. |
| Google AI Studio API key | — | Optional. Needed only for Hosted and Compare modes. |

> [!TIP]
> On Windows, if PowerShell blocks `npm` with an execution-policy error, run `npm.cmd` instead, or allow local scripts with `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

---

## Contribution Workflow

### 1. Find or propose an issue
- Browse [GitHub Issues](https://github.com/ahmmikun/HacktoberFest-x-Fluxxion/issues) for `good first issue`, `help wanted`, or `hacktoberfest`.
- For new work, open an issue with the [templates](.github/ISSUE_TEMPLATE/) first and reference the relevant requirement ID (for example `FR-VER-02`).

### 2. Fork and branch

```bash
git clone https://github.com/<your-username>/HacktoberFest-x-Fluxxion.git
cd HacktoberFest-x-Fluxxion
git checkout -b feat/deterministic-sha-pinning-rule
```

Branch prefixes: `feat/`, `fix/`, `docs/`, `refactor/`, `test/`, `chore/`.

### 3. Set up the workspace

```bash
npm install
```

Copy the backend section of [`.env.example`](.env.example) to `apps/api/.env` and the frontend section to `apps/web/.env.local`.

```bash
npm run preflight   # verifies gh, Ollama, and AI Studio configuration
npm run dev         # API on :4000, web on :3000
```

> [!WARNING]
> Never commit `.env` files, API keys, or tokens. `GOOGLE_AI_API_KEY` belongs only in `apps/api/.env` and must never use a `NEXT_PUBLIC_` prefix.

---

## Where Things Live

| Area | Path | Notes |
| :--- | :--- | :--- |
| Shared contracts | `packages/shared/src/schemas.ts` | Zod schemas for API, SSE, and LLM output. Change these first, then update consumers. |
| `gh` integration | `apps/api/src/services/ghBridge.ts` | The only module allowed to spawn `gh`. |
| Evidence collection | `apps/api/src/services/collector.ts` | GraphQL query, file fetching, size caps |
| Rule engine | `apps/api/src/services/deterministic.ts` | Deterministic checks and Health Score |
| Manifest & redaction | `apps/api/src/services/compiler.ts` | Token budget, secret masks, SHA-256 hash |
| Model clients | `apps/api/src/services/ollamaClient.ts`, `geminiClient.ts` | Local and hosted Gemma 4 |
| Hallucination gate | `apps/api/src/services/verifier.ts` | Citation and schema verification |
| Report export | `apps/api/src/services/exporter.ts` | Markdown report |
| Routes | `apps/api/src/routes/` | `/system`, `/repos`, `/audits`, `/actions` |
| UI | `apps/web/src/` | App Router pages, components, `useAuditStream` hook |
| Agent skills | `skills/<name>/SKILL.md` | Agent Skill Open Standard |

---

## Engineering Rules

These come from the security and reliability requirements. Pull requests that break them will not be merged.

1. **No shell interpolation (NFR-SEC-01).** Spawn `gh` only with `execFile` and argument arrays. Never use `exec()` or build command strings. Validate repo slugs with `^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$`.
2. **Tokens stay in memory (FR-AUTH-02, NFR-SEC-02).** Never log, persist, or return the `gh` token or `GOOGLE_AI_API_KEY`. Do not put them in error messages.
3. **Deterministic before AI (FR-DET-01).** Health Score logic must never depend on model output.
4. **Skipped is not failed (FR-DET-03).** If evidence is missing because of permissions or API limits, return a skipped state, not `FAIL`.
5. **Redact before sending (FR-COMP-02).** Anything that may reach Google AI Studio must pass through the compiler's secret scrubber.
6. **Repository content is untrusted (FR-COMP-03, NFR-SEC-03).** Keep it inside `<untrusted_repo_evidence>` in prompts, and sanitize model output before rendering.
7. **Every finding cites evidence (FR-VER-01).** New finding types must carry `evidenceRefs` that the verifier can check.
8. **Mutations need confirmation (FR-ACT-03).** Any action that writes to GitHub must require explicit user confirmation in the UI.
9. **Respect budgets (NFR-PERF-01/02).** Keep collection plus scoring under 2.5 s, and the E4B manifest at or under 2,500 tokens.

---

## Coding Conventions

- **TypeScript** in strict mode across all workspaces. Import shared types from `@reposage/shared` instead of redefining them.
- **Formatting** follows [.editorconfig](.editorconfig): 2-space indentation, LF line endings, UTF-8.
- **Commits** follow [Conventional Commits](https://www.conventionalcommits.org/):
  - `feat(api): add CI_IMMUTABLE_SHA_PINNING rule`
  - `fix(verifier): treat REPO_ROOT as a valid citation`
  - `docs: document Compare Mode telemetry fields`
  - `refactor(web): extract FindingCard severity badge`

---

## Responsible Open-Source AI

1. **Open weights first.** Both runtimes use Gemma 4 (Apache 2.0). Do not add closed models as defaults.
2. **Privacy by default.** Local Mode must never make outbound calls with repository content.
3. **Agent Skill Open Standard.** New skills under `skills/` need standard `SKILL.md` frontmatter; see the [standard](https://dev.to/loc_carrre_0d798813c662/agent-skills-explained-what-they-are-what-they-arent-and-how-to-use-them-bf9).
4. **Attribution.** If you adapt upstream harness or prompt code, document the source, its license, and your changes.
5. **Test data.** Use synthetic fixtures. Never commit real secrets, even revoked ones; build fake tokens at runtime in tests.

---

## Testing & Verification

Before opening a pull request:

```bash
npm run typecheck   # all workspaces
npm run build       # all workspaces
npm test --workspaces --if-present
git diff --check    # whitespace errors
```

Changes to the verifier, compiler, or rule engine should include tests that cover the related [acceptance criteria](docs/reposage_requirements_specification.md#5-acceptance-criteria-matrix), for example the `src/non_existent_auth.ts` hallucination case.

---

## Submitting Pull Requests

1. Push your branch: `git push -u origin <branch-name>`.
2. Open a pull request against `main` on `ahmmikun/HacktoberFest-x-Fluxxion`.
3. Fill in the [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md), including requirement IDs and how you tested.
4. Keep each pull request focused on one topic.

## Review Process

- Maintainers review as quickly as they can. Push follow-up commits to address feedback.
- Approved pull requests are squash-merged into `main`.
- Add yourself to [CONTRIBUTORS.md](CONTRIBUTORS.md) if you would like to be credited.

Thank you for helping build RepoSage.

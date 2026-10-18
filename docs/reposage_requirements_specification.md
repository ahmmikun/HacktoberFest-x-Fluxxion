# RepoSage 🔎 — Product & System Requirements Specification

## 1. Executive Summary
**RepoSage** is a local-first, evidence-grounded repository auditing platform that combines a **Next.js** frontend, a **Node.js + Express** backend, native **GitHub CLI (`gh`)** authentication, a deterministic static rule engine, and dual-runtime **Gemma 4** models (`Gemma 4 E4B` via local Ollama and `Gemma 4 26B` via Google AI Studio).

Its primary objective is to audit GitHub repositories with zero credential pasting, separate deterministic facts from AI interpretation, verify every AI-generated claim against actual repository file trees, and allow developers to turn verified findings into actionable GitHub Issues or portable reports.

---

## 2. User Personas & Core Use Cases

| Persona | Primary Goal | Key Workflow |
| :--- | :--- | :--- |
| **Open-Source Maintainer** | Audit repo onboarding readiness, CI security, and documentation hygiene before a public release. | Selects repo $\rightarrow$ runs Consensus Audit $\rightarrow$ creates GitHub Issues in 1 click for missing SHA pins or docs. |
| **Privacy-Conscious Staff Engineer** | Audit proprietary/private repositories without sending source code or metadata to external cloud APIs. | Verifies `gh` auth $\rightarrow$ selects **Local Privacy Mode (`Gemma 4 E4B`)** $\rightarrow$ exports Markdown audit report locally. |
| **AI/DevEx Engineer** | Benchmark open-weight small models (`E4B`) against larger hosted weights (`26B`) on structured code intelligence tasks. | Runs **Dual-Engine Comparison Mode** $\rightarrow$ inspects latency, schema validity, citation accuracy, and hallucination penalty metrics. |

---

## 3. Functional Requirements (FR)

### 3.1 Local-First GitHub CLI (`gh`) Authentication & Discovery
* **FR-AUTH-01:** The Express backend MUST verify the installation and active authentication status of the local `gh` CLI using `gh auth status` without requiring the user to paste a Personal Access Token (PAT) into the UI or `.env`.
* **FR-AUTH-02:** The backend MUST extract the active OAuth/session token strictly in-memory via `execFile('gh', ['auth', 'token'])` to authenticate batched GitHub GraphQL/REST queries, never logging or persisting the token to disk.
* **FR-AUTH-03:** Users MUST be able to browse, search, and filter accessible repositories (public, private, and organization repos within their `gh` scope) or input any valid `owner/repo` identifier accessible to their session.
* **FR-AUTH-04:** If `gh` is missing or unauthenticated, the UI MUST display a guided diagnostic panel with exact terminal commands (`gh auth login`) and a live "Retry Connection" check.

### 3.2 Repository Evidence Collector
* **FR-COLL-01:** The system MUST execute a batched GitHub GraphQL query to retrieve repository metadata (languages, license, default branch, star/fork counts, last push timestamp, open/closed PR and issue counts, branch protection status) and the full recursive Git tree (`HEAD`) in minimal network round-trips.
* **FR-COLL-02:** The collector MUST selectively fetch high-signal configuration and documentation files without cloning the entire Git history:
  * Documentation: `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `LICENSE`
  * Manifests & Lockfiles: `package.json`, `pnpm-lock.yaml`, `package-lock.json`, `requirements.txt`, `pyproject.toml`, `Cargo.toml`, `go.mod`
  * CI/CD & Containers: `.github/workflows/*.yml`, `Dockerfile`, `docker-compose.yml`, `.nvmrc`
  * Hygiene & Config: `.gitignore`, `.env.example`, `tsconfig.json`, test runner configs (`vitest.config.*`, `jest.config.*`, `pytest.ini`)
* **FR-COLL-03:** The collector MUST enforce a per-file size cap (default: $64\text{ KB}$) and total evidence token budget so massive lockfiles or minified assets do not overflow the context window.

### 3.3 Deterministic Rule Engine & Health Scoring
* **FR-DET-01:** Repository Health Scores ($0\text{--}100$) MUST be computed 100% deterministically by the Express backend before any LLM inference runs.
* **FR-DET-02:** The engine MUST evaluate six weighted dimensions:
  1. **CI/CD & Automation ($20\%$):** Workflow existence, immutable commit SHA pinning vs. mutable tags (`@v3`), explicit `permissions:` blocks.
  2. **Testing & Quality Gates ($20\%$):** Test runner dependencies, test configuration files, presence of `*.test.*` or `*.spec.*` files in the Git tree, `test` script in manifest.
  3. **Dependency Hygiene ($15\%$):** Dependency manifest presence, committed lockfile presence, automated dependency update config (`dependabot.yml` or `renovate.json`).
  4. **Documentation & Onboarding ($15\%$):** `README.md` presence and section completeness (installation, usage, env setup), `.env.example` presence when `.env` is referenced, `CONTRIBUTING.md`.
  5. **Security & Governance ($15\%$):** Valid `LICENSE`, `SECURITY.md`, `.gitignore` rules excluding `.env` and secret files, zero tracked `.env` or private key files in the Git tree.
  6. **Maintenance & Velocity ($15\%$):** Days since last commit on default branch, issue triage health, archived/disabled flags.
* **FR-DET-03:** Every deterministic check MUST output one of four states: `PASS`, `WARN`, `FAIL`, or `SKIPPED_INSUFFICIENT_EVIDENCE` (ensuring missing permissions or API limits are never misclassified as repository defects).

### 3.4 Evidence Compiler & Prompt Privacy Filter
* **FR-COMP-01:** Before calling any Gemma model, the backend MUST compile collected metadata, deterministic check results, and truncated file snippets into a canonical, JSON-serialized **Evidence Manifest** hashed with `SHA-256`.
* **FR-COMP-02:** The compiler MUST scan file snippets for accidental high-entropy secrets or credential patterns (`ghp_`, `AKIA`, `BEGIN PRIVATE KEY`) and redact them (`[REDACTED_SECRET]`) before transmitting payloads to Google AI Studio.
* **FR-COMP-03:** All repository text MUST be enclosed in strict XML boundary tags (`<untrusted_repo_evidence>`) to mitigate indirect prompt injection embedded in malicious repository files.

### 3.5 Gemma AI Analysis & Dual-Runtime Execution
* **FR-AI-01:** Users MUST be able to choose between three execution modes:
  * **Local Mode:** `Gemma 4 E4B` via local Ollama runtime.
  * **Hosted Mode:** `Gemma 4 26B` via Google AI Studio API.
  * **Comparison / Consensus Mode:** Parallel execution across both models using the identical `SHA-256` Evidence Manifest.
* **FR-AI-02:** Both models MUST be prompted to return structured JSON adhering to a shared Zod schema containing: executive summary, prioritized findings, architectural risk explanations, and concrete remediation steps.

### 3.6 Citation Verifier (Anti-Hallucination Gate)
* **FR-VER-01:** Every AI-generated finding MUST include an `evidence_refs` array referencing either a valid deterministic `check_id` or a specific `file_path` from the repository.
* **FR-VER-02:** The Citation Verifier MUST validate every `file_path` returned by Gemma against the actual Git tree map retrieved in `FR-COLL-01`.
* **FR-VER-03:** Any AI claim referencing a non-existent file path or fabricating a deterministic check status MUST be flagged as `UNVERIFIED_CLAIM`, stripped from the primary improvement plan, and recorded in the model's hallucination telemetry.

### 3.7 Real-Time Streaming, Reporting & Remediation Actions
* **FR-ACT-01:** The Express backend MUST stream real-time audit progress stages to the Next.js frontend via Server-Sent Events (SSE).
* **FR-ACT-02:** Users MUST be able to export the complete audit (health score breakdown, verified findings, remediation roadmap, and model comparison metrics) as a clean, portable `.md` file.
* **FR-ACT-03:** Users MUST be able to trigger a **1-Click GitHub Issue** action on any verified finding, which executes `gh issue create` via the backend (with explicit user confirmation) to push the remediation task directly to the target repository.

---

## 4. Non-Functional Requirements (NFR)

### 4.1 Security & Sandboxing
* **NFR-SEC-01 (Zero Shell Interpolation):** All `gh` CLI executions MUST use Node's `child_process.execFile` with strict argument arrays and input validation regexes (`/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/`). Raw string concatenation in `exec()` is strictly prohibited.
* **NFR-SEC-02 (Secret Isolation):** `GOOGLE_AI_API_KEY` and in-memory `gh` tokens MUST reside strictly in the Express backend process and never leak into Next.js client bundles, browser network tabs, or server logs.
* **NFR-SEC-03 (Untrusted Input Handling):** Markdown and JSON outputs from Gemma MUST be sanitized on the frontend before rendering to prevent XSS via maliciously crafted repository filenames or snippets.

### 4.2 Performance & Reliability
* **NFR-PERF-01:** Evidence collection and deterministic scoring for a standard repository MUST complete in under $2.5\text{ seconds}$.
* **NFR-PERF-02:** The Evidence Manifest sent to `Gemma 4 E4B` MUST be compressed to $\le 2,500\text{ tokens}$ to maintain fast local time-to-first-token and prevent context degradation on consumer hardware.
* **NFR-PERF-03:** If a model returns malformed JSON, the backend MUST perform at most $1$ automatic schema-repair retry with the Zod validation error attached before gracefully degrading to the deterministic report.

---

## 5. Acceptance Criteria Matrix

| Feature Area | Acceptance Condition |
| :--- | :--- |
| **Zero-PAT Onboarding** | Starting the app on a machine with an active `gh auth login` session immediately lists the user's repositories without any login form or token prompt. |
| **Deterministic Independence** | Disabling both Ollama and Google AI Studio still produces a complete $0\text{--}100$ Health Score and deterministic rule breakdown. |
| **Hallucination Quarantine** | Injecting a synthetic fake file citation (`src/non_existent_auth.ts`) into a mock model response results in the Citation Verifier marking it `UNVERIFIED` and incrementing the Unsupported Claims counter. |
| **Fair Model Comparison** | Running Comparison Mode proves via manifest hash (`manifest_sha256`) that both `Gemma 4 E4B` and `Gemma 4 26B` evaluated the exact same byte-for-byte evidence payload. |
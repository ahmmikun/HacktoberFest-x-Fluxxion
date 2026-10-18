# Security Policy

RepoSage runs with the privileges of your local GitHub CLI session and processes untrusted repository content, so we take security reports seriously. Responsible disclosures from researchers, contributors, and users are welcome.

---

## Supported Versions

| Version | Supported | Status |
| ------- | ------------------ | ------ |
| `main`  | :white_check_mark: | Active development and hackathon release branch |
| < 0.1.0 | :x:                | Scaffolding and historical snapshots |

---

## Reporting a Vulnerability

> [!WARNING]
> **Do not open public GitHub Issues or discussions for suspected vulnerabilities or exposed secrets.**

Report privately through one of these channels:

1. **GitHub Private Vulnerability Reporting (preferred)**: open the repository's **Security** tab, choose **Advisories**, then **Report a vulnerability**.
2. **Direct maintainer contact**:
   - **Salman Ahmad**: `140977479+ahmmikun@users.noreply.github.com`
   - **Backup security contact**: `[MAINTAINER_SECURITY_EMAIL_PLACEHOLDER - Optional secondary email]`

### What to include
- A title and summary of the vulnerability.
- Steps to reproduce, including a minimal proof of concept (for example, a crafted repository file or filename).
- Impact (for example token leakage, command injection, prompt injection, XSS, or an unwanted GitHub mutation).
- A proposed mitigation, if you have one.

### What to expect
- **Acknowledgment** within **48 hours**.
- **Assessment** of impact and reproduction, with an assigned priority.
- **Remediation** in a private advisory fork.
- **Coordinated disclosure** with the reporter before a public notice. We credit reporters unless they ask to stay anonymous.

---

## Threat Model & Built-in Protections

RepoSage is designed as a **single-user, localhost** tool. These are the risks it defends against and the requirements that cover them (see the [Requirements Specification](docs/reposage_requirements_specification.md)).

| Risk | Protection | Requirement |
| :--- | :--- | :--- |
| Command injection through repo names, issue titles, or bodies | `gh` runs only through `child_process.execFile` with argument arrays. Repo slugs must match `^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$`. `exec()` and string-built commands are prohibited. | NFR-SEC-01 |
| GitHub token leakage | The token comes from `gh auth token`, lives only in backend memory, and is never logged, persisted, or sent to the browser. | FR-AUTH-02, NFR-SEC-02 |
| AI Studio key leakage | `GOOGLE_AI_API_KEY` lives only in `apps/api/.env` and the backend process. It must never use a `NEXT_PUBLIC_` prefix. | NFR-SEC-02 |
| Secrets in audited repositories reaching a cloud API | The Evidence Compiler replaces credential patterns (`ghp_`, `AKIA`, `BEGIN PRIVATE KEY`, webhooks, high-entropy strings) with `[REDACTED_SECRET]` before hosted inference. | FR-COMP-02 |
| Indirect prompt injection from repository files | Evidence is wrapped in `<untrusted_repo_evidence>` tags, and the system prompt tells the model to treat it as passive data. | FR-COMP-03 |
| Fabricated findings | The Citation Verifier checks every cited path and check ID and quarantines unsupported claims. | FR-VER-01–03 |
| XSS through crafted filenames or model output | Model Markdown and JSON are sanitized before rendering. | NFR-SEC-03 |
| Unintended writes to GitHub | `gh issue create` runs only after explicit user confirmation. | FR-ACT-03 |
| Runaway hosted API usage | Express rate limiting and per-model timeouts. | Tech stack (Helmet & Express Rate Limit) |

### Deployment warning

The Express API has **no authentication layer of its own**. Anyone who can reach it acts with your `gh` session's permissions. Bind it to `localhost`, keep `CORS_ORIGIN` limited to the local frontend, and do not expose port 4000 on a shared network or the internet. Any future hosted deployment must add authentication first.

### Privacy modes

- **Local Mode** (`gemma4:e4b` on Ollama): repository evidence is not sent to any third-party AI service. RepoSage still calls the GitHub API to collect evidence.
- **Hosted and Compare modes**: the redacted Evidence Manifest is sent to Google AI Studio and is subject to Google's API terms.

---

## Contributor Security Rules

1. **Zero secrets in Git.** Never commit `.env` files, API keys, tokens, SSH keys, or cloud credentials. Any secret found in Git history is treated as compromised and must be rotated.
2. **Synthetic test fixtures.** Redaction tests must build fake tokens at runtime. Never commit real or revoked credentials.
3. **Only `ghBridge.ts` spawns `gh`.** No other module may start subprocesses.
4. **Model weights.** Pull Gemma 4 only from official sources (the Ollama library or Google's official Hugging Face organization). Prefer `.safetensors` or GGUF over pickled `.bin` / `.pkl` files.

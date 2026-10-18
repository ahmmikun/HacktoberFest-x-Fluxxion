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
| Other websites or rebound DNS names calling the local API | The API binds to `127.0.0.1` by default. `server.ts` rejects requests whose `Host` header is not `localhost`, `127.0.0.1`, `[::1]`, or `HOST`, and any request whose `Origin` is not listed in `CORS_ORIGIN`. | — |
| Command injection through repo names, issue titles, or bodies | `ghBridge.ts` runs `gh` only through `execFile` with argument arrays. Repo slugs must match `^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$`, titles are stripped of newlines and capped at 120 characters, and bodies go through stdin (`--body-file -`). | NFR-SEC-01 |
| GitHub token leakage | The token comes from `gh auth token`, sits in a module-private 5-minute cache, and is dropped on a 401. It is never logged, persisted, or returned to the browser. Errors from `gh auth token` are discarded because they could echo the token. | FR-AUTH-02, NFR-SEC-02 |
| AI Studio key leakage | `GOOGLE_AI_API_KEY` is read only by `apps/api/src/config.ts`. Preflight reports only whether it is configured. SDK error messages have `key=` values stripped. | NFR-SEC-02 |
| Secrets in logs | Every log line passes through `redactSecrets` (`utils/logger.ts`). Config validation errors list variable names, never values. | NFR-SEC-02 |
| Secrets in audited repositories reaching a model | `utils/redact.ts` masks PEM private keys, GitHub tokens, AWS key IDs, Google API keys, Slack tokens and webhooks, Stripe live keys, OpenAI-style keys, JWTs, credentials in URLs, and high-entropy secret assignments with `[REDACTED_SECRET]`. Redaction runs on the full text before truncation. | FR-COMP-02 |
| Indirect prompt injection from repository files | Evidence is wrapped in `<untrusted_repo_evidence>` tags, with `<` and `>` JSON-escaped so content cannot close the tag. The system prompt tells the model to treat it as passive data. | FR-COMP-03 |
| Fabricated findings | `verifier.ts` checks every cited path against the Git tree and every check ID against the rule results, and quarantines unsupported claims. | FR-VER-01–03 |
| XSS through crafted filenames or model output | React escapes model text. The Markdown preview uses `rehype-sanitize` with `skipHtml`, and the exporter HTML-escapes untrusted text. The web app sends `X-Frame-Options: DENY`, `nosniff`, and `no-referrer`. | NFR-SEC-03 |
| Unintended writes to GitHub | Issues can be created only for stored `VERIFIED` findings, after a confirmation dialog, with `confirm: true` in the request. The body is built server-side from the stored finding, and repeat requests return the existing issue. | FR-ACT-03 |
| Runaway API usage | Rate limits of 300 requests/min overall and 10/min for audits and issues, at most 3 concurrent audits, a 64 KB JSON body limit, and per-model timeouts. | NFR-PERF-03 |

### Deployment warning

The Express API has **no authentication layer of its own**. Anyone who can reach it acts with your `gh` session's permissions. Keep `HOST=127.0.0.1` (the API logs a warning when bound elsewhere), keep `CORS_ORIGIN` limited to the local dashboard, and do not expose port 4000 on a shared network or the internet. Any future hosted deployment must add authentication first.

Audit results, including collected evidence metadata, are held in API memory for up to 1 hour and are not written to disk.

### Privacy modes

- **Local Mode** (`gemma4:e4b` on Ollama): repository evidence is not sent to any third-party AI service. RepoSage still calls the GitHub API to collect evidence.
- **Hosted and Compare modes**: the redacted Evidence Manifest is sent to Google AI Studio and is subject to Google's API terms.

---

## Contributor Security Rules

1. **Zero secrets in Git.** Never commit `.env` files, API keys, tokens, SSH keys, or cloud credentials. Any secret found in Git history is treated as compromised and must be rotated.
2. **Synthetic test fixtures.** Redaction tests must build fake tokens at runtime. Never commit real or revoked credentials.
3. **Only `ghBridge.ts` spawns `gh`.** No other API module may start subprocesses. (`scripts/check-env.mjs` also calls `gh --version` and `gh auth status` with `execFileSync`, and never reads the token.)
4. **Log through `utils/logger.ts`.** Do not use `console.*` in API code, so every line is redacted.
5. **Model weights.** Pull Gemma 4 only from official sources (the Ollama library or Google's official Hugging Face organization). Prefer `.safetensors` or GGUF over pickled `.bin` / `.pkl` files.

---
name: Bug Report
about: Report a problem with RepoSage
title: '[BUG] '
labels: ['bug', 'triage']
assignees: ''
---

> [!WARNING]
> Do not paste tokens, API keys, or private repository content. Report security issues privately as described in [SECURITY.md](https://github.com/ahmmikun/HacktoberFest-x-Fluxxion/blob/main/SECURITY.md).

## Bug Description
A clear and concise description of the bug.

## Affected Area
- [ ] `apps/web`: Mission Control, repository browser, or mode selector
- [ ] `apps/web`: audit workspace (pipeline stepper, health score, findings, Comparison Arena, report preview)
- [ ] `apps/api`: `gh` session / preflight (`ghBridge.ts`, `routes/system.ts`)
- [ ] `apps/api`: evidence collection (`collector.ts`, `repos.ts`)
- [ ] `apps/api`: deterministic rules / Health Score (`deterministic.ts`), including a wrong PASS/WARN/FAIL result
- [ ] `apps/api`: Evidence Manifest or secret redaction (`compiler.ts`, `redact.ts`)
- [ ] `apps/api`: Gemma inference (`ollamaClient.ts`, `geminiClient.ts`, `orchestrator.ts`)
- [ ] `apps/api`: citation verification (`verifier.ts`)
- [ ] `apps/api`: audit sessions, SSE stream, Markdown export, or issue creation
- [ ] `packages/shared` schemas
- [ ] `npm run preflight` (`scripts/check-env.mjs`) or install / build
- [ ] Documentation

## Steps to Reproduce
1. Audited repository (public `owner/repo`, or describe a private one): `...`
2. Commit audited (shown next to the branch name in the audit header): `...`
3. Execution mode: `local` / `hosted` / `compare`
4. Action taken: `...`
5. Error or unexpected result: `...`

## Expected Behavior
What you expected to happen. For a wrong rule result, name the `checkId` and the status you expected. If relevant, reference the requirement (for example `FR-VER-02`).

## Environment
- **OS**: [e.g. Windows 11, Ubuntu 24.04, macOS 15]
- **Node.js / npm**: [output of `node --version` and `npm --version`]
- **GitHub CLI**: [output of `gh --version`]
- **Ollama**: [version, or "not used"]
- **Local model**: [e.g. `gemma4:e4b`]
- **Hosted model**: [e.g. `gemma-4-26b-a4b-it`, or "not used"]
- **Browser**: [e.g. Chrome 130]

## Preflight Output
Paste the output of `npm run preflight` (it never prints secret values). If the app was running, the response from `GET /api/v1/system/preflight` or a screenshot of the status pills also helps.

```text

```

## Logs & Error Output
Paste relevant lines from the API terminal, the browser console, or the pipeline stepper's **Event log**. The API redacts secrets from its logs, but double-check before posting.

```text

```

## Additional Context
For example `manifestSha256`, the affected `checkId`, or the finding ID.

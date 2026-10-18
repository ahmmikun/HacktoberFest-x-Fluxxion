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
- [ ] `apps/web` (frontend / UI)
- [ ] `apps/api` – `GhCliBridge` / preflight
- [ ] `apps/api` – Evidence Collector
- [ ] `apps/api` – Deterministic Engine / Health Score
- [ ] `apps/api` – Evidence Compiler / secret redaction
- [ ] `apps/api` – Gemma orchestration (Ollama or AI Studio)
- [ ] `apps/api` – Citation Verifier
- [ ] SSE streaming, Markdown export, or issue creation
- [ ] `packages/shared` schemas
- [ ] Documentation

## Steps to Reproduce
1. Audited repository (public `owner/repo`, or describe a private one): `...`
2. Execution mode: `local` / `hosted` / `compare`
3. Action taken: `...`
4. Error or unexpected result: `...`

## Expected Behavior
What you expected to happen. If relevant, reference the requirement (for example `FR-VER-02`).

## Environment
- **OS**: [e.g. Windows 11, Ubuntu 24.04, macOS 15]
- **Node.js / npm**: [output of `node --version` and `npm --version`]
- **GitHub CLI**: [output of `gh --version`]
- **Ollama**: [version, or "not used"]
- **Local model**: [e.g. `gemma4:e4b`]
- **Hosted model**: [e.g. `gemma-4-26b-a4b-it`, or "not used"]
- **Browser**: [e.g. Chrome 130]

## Preflight Output
Paste the response from `GET /api/v1/system/preflight` or a screenshot of the Preflight banner, with any token values removed.

```json

```

## Logs & Error Output
```text
Paste relevant API or browser console output here (with secrets removed)
```

## Additional Context
For example `manifestSha256`, the affected `checkId`, or the finding ID.

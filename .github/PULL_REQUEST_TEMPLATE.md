## Description
What does this pull request change, and why?

Fixes / Closes #(issue number)

**Requirement IDs addressed**: (e.g. `FR-DET-02`, `NFR-SEC-01`)

---

## Type of Change
- [ ] 🐛 Bug fix
- [ ] ✨ New feature
- [ ] 📏 New or changed deterministic rule
- [ ] 🤖 Gemma 4 orchestration / prompts / Agent Skill
- [ ] 📝 Documentation or spec update
- [ ] ⚡ Performance improvement
- [ ] 🧹 Refactoring

## Workspaces Touched
- [ ] `apps/web`
- [ ] `apps/api`
- [ ] `packages/shared`
- [ ] `docs/`
- [ ] `skills/`

---

## RepoSage Engineering Checklist
- [ ] `gh` is spawned only from `apps/api/src/services/ghBridge.ts`, with `execFile` and argument arrays (no `exec()` or string-built commands)
- [ ] No token or API key is logged, persisted, returned to the client, or exposed through `NEXT_PUBLIC_*`
- [ ] API logging goes through `utils/logger.ts` (no `console.*`), so every line is redacted
- [ ] Health Score logic does not depend on model output
- [ ] Missing evidence returns `SKIPPED_INSUFFICIENT_EVIDENCE`, not `FAIL`
- [ ] New or changed rules keep each dimension's weights equal to `DIMENSION_WEIGHTS` (the engine throws at startup otherwise), and the README rule table is updated
- [ ] Repository text that can reach a model passes through `redactSecrets` before truncation
- [ ] Repository content stays inside `<untrusted_repo_evidence>`, and model output is never rendered as raw HTML
- [ ] New findings carry `evidenceRefs` that `verifier.ts` checks
- [ ] Shared schemas changed in `packages/shared` first, with all consumers updated
- [ ] New environment variables are added to `apps/api/src/config.ts` and `apps/api/.env.example` (or `apps/web/.env.example`)
- [ ] Any GitHub write action requires explicit user confirmation

## Open-Source AI Challenge Checklist
- [ ] Uses open-weight Gemma 4 (or another open model); no closed model added as a default
- [ ] Local Mode makes no outbound calls with repository content
- [ ] New Agent Skills follow the Agent Skill Open Standard (`SKILL.md`)
- [ ] Upstream harness or prompt code is attributed with its license
- [ ] No hardcoded secrets or binary model weights (`.bin`, `.safetensors`, `.gguf`)

---

## Testing & Verification
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] `npm run preflight` reports no blocking issues
- [ ] Tested manually with `npm run dev` in mode(s): `local` / `hosted` / `compare` / deterministic-only (Ollama stopped, no AI Studio key)
- [ ] Tests added or updated for affected acceptance criteria (once a test runner exists; there is none yet)
- [ ] `git diff --check` passes

Describe what you tested:

---

## General Checklist
- [ ] Self-reviewed my code
- [ ] Updated README, CONTRIBUTING, SUPPORT, or CHANGELOG (and `/docs` if the design changed) where behavior changed
- [ ] Added my name to [CONTRIBUTORS.md](https://github.com/ahmmikun/HacktoberFest-x-Fluxxion/blob/main/CONTRIBUTORS.md) (optional)

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
- [ ] `gh` is spawned only from `ghBridge.ts`, with `execFile` and argument arrays (no `exec()` or string-built commands)
- [ ] No token or API key is logged, persisted, returned to the client, or exposed through `NEXT_PUBLIC_*`
- [ ] Health Score logic does not depend on model output
- [ ] Missing evidence produces a skipped state, not `FAIL`
- [ ] Content that can reach Google AI Studio passes through the secret redactor
- [ ] Repository content stays inside `<untrusted_repo_evidence>`, and model output is sanitized before rendering
- [ ] New findings carry `evidenceRefs` that the Citation Verifier checks
- [ ] Shared schemas changed in `packages/shared` first, with all consumers updated
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
- [ ] Tests added or updated for affected acceptance criteria
- [ ] Tested manually in mode(s): `local` / `hosted` / `compare` / deterministic-only
- [ ] `git diff --check` passes

Describe what you tested:

---

## General Checklist
- [ ] Self-reviewed my code
- [ ] Updated `/docs`, README, or CHANGELOG where behavior changed
- [ ] Added my name to [CONTRIBUTORS.md](https://github.com/ahmmikun/HacktoberFest-x-Fluxxion/blob/main/CONTRIBUTORS.md) (optional)

---
name: Feature Request
about: Suggest an enhancement or a new deterministic rule for RepoSage
title: '[FEAT] '
labels: ['enhancement']
assignees: ''
---

## Feature Summary
A clear and concise description of the proposed feature.

## Problem or Use Case
Which persona does this help (Open-Source Maintainer, Privacy-Conscious Staff Engineer, AI/DevEx Engineer), and what problem does it solve?

## Proposed Solution
How should it work? Include API, UI, or schema changes if you have them in mind.

## Area
- [ ] New or changed **deterministic rule** (fill in the section below)
- [ ] Evidence collection (new files or metadata)
- [ ] Evidence Compiler / redaction / token budget
- [ ] Gemma 4 orchestration or prompts
- [ ] Citation Verifier / telemetry
- [ ] Frontend dashboard / Model Comparison Arena
- [ ] Reports, export, or GitHub actions
- [ ] Agent Skill (`skills/`, Agent Skill Open Standard)
- [ ] Documentation / specs

## Deterministic Rule Proposal (if applicable)
The current 22 rules are listed in the [README](https://github.com/ahmmikun/HacktoberFest-x-Fluxxion/blob/main/README.md#health-scoring--rules).

- **Proposed `checkId`**: [e.g. `CI_DEPENDENCY_REVIEW`]
- **Dimension**: `CI_CD` · `TESTING` · `DEPS` · `DOCS` · `SECURITY` · `MAINTENANCE`
- **Suggested points, and which existing rules in that dimension give up weight**: [each dimension's total is fixed]
- **Evidence it reads**: [files or GraphQL fields; note if the collector does not fetch them yet]
- **PASS / WARN / FAIL conditions** (and how WARN partial credit is calculated):
- **When it returns `SKIPPED_INSUFFICIENT_EVIDENCE`**: [e.g. evidence unavailable because of permissions]

## Documentation Impact
Which docs would need updating (README, CONTRIBUTING, SUPPORT, or the specs in [`/docs`](https://github.com/ahmmikun/HacktoberFest-x-Fluxxion/tree/main/docs))? List any new or changed requirement IDs or environment variables.

## Alternatives Considered
Other approaches you considered.

## Additional Context
Mockups, example repositories, or references.

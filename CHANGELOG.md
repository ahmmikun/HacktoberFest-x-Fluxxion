# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- **RepoSage product specifications** (`docs/`):
  - `reposage_requirements_specification.md`: personas, functional requirements (`FR-AUTH`, `FR-COLL`, `FR-DET`, `FR-COMP`, `FR-AI`, `FR-VER`, `FR-ACT`), non-functional requirements (`NFR-SEC`, `NFR-PERF`), and the acceptance criteria matrix.
  - `reposage_system_design_architecture.md`: monorepo architecture, the six backend modules (`GhCliBridge`, `EvidenceCollector`, `DeterministicEngine`, `EvidenceCompiler`, `GemmaOrchestrator`, `CitationVerifier`), GraphQL evidence query, scoring formula, shared Zod schemas, REST/SSE API, and the Next.js component hierarchy.
  - `reposage_technology_stack_setup_guide.md`: npm-workspaces layout, dependency versions, root `package.json` blueprint, environment template, and a reference `GhCliBridge` implementation.
- **In progress**: implementation of `apps/web` (Next.js 15), `apps/api` (Express), and `packages/shared` (Zod contracts) against these specs.

### Changed
- **Project direction**: the repository now builds **RepoSage**, a local-first, evidence-grounded GitHub repository auditor using Gemma 4 E4B (Ollama, `gemma4:e4b`) and Gemma 4 26B (Google AI Studio, `gemma-4-26b-a4b-it`).
- **Documentation**: `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `SUPPORT.md`, `CONTRIBUTORS.md`, `CODE_OF_CONDUCT.md`, `LICENSE` notice, and the GitHub issue/PR templates were rewritten for RepoSage's architecture, setup, security model, and engineering rules.

### Removed
- **Python prototype from 0.1.0**: `main.py`, `demo.py`, `requirements.txt`, `src/` (`agent.py`, `harness.py`, `skills_manager.py`), and `tests/`. RepoSage is a Node.js/TypeScript monorepo; these files stay available in Git history.
- Python-specific entries in `.gitignore` and `.editorconfig`, and the Python-era variables in `.env.example`, which is now the RepoSage template from the setup guide.

### Fixed
- `.gitignore`: removed the Python `lib/` pattern, which would also have ignored the planned `apps/web/src/lib/` directory.
- Technology stack guide: corrected the hosted model ID from `gemma-4-26b-it` to `gemma-4-26b-a4b-it`, the ID listed in [Google's Gemma on Gemini API docs](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api).

---

## [0.1.0] - 2026-10-18

### Added
- **Complete Open-Source AI Turnkey Demo (`demo.py`)**: One-command interactive runner for hackathon judges and contributors.
- **Agent Skill Open Standard Engine (`skills/code-explainer/SKILL.md`)**: Fully compliant agent skill parser, loader, and validator (`src/skills_manager.py`).
- **Open-Weight Model Harness (`src/harness.py`)**: Pluggable harness connecting to local Ollama (Gemma 2B / Hermes 3) with a deterministic offline simulation engine.
- **Agent Orchestrator (`src/agent.py`)**: End-to-end skill binding, context synthesis, and execution engine.
- **Interactive Command-Line Interface (`main.py`)**: CLI supporting `demo`, `skills`, `health`, and `run` subcommands.
- **Automated Test Suite (`tests/test_harness.py`)**: Complete test coverage for skill discovery, compliance validation, and model inference.
- Initial project scaffolding for **MLH Hacktoberfest Hack Day Lahore × Fluxxion 2026**.
- Open-source governance and community documents:
  - `README.md`: Project overview, open-source AI architecture, installation, and hackathon challenge context.
  - `LICENSE`: MIT License with third-party model weights and upstream disclaimer.
  - `CONTRIBUTING.md`: Detailed contribution guidelines, code conventions, and responsible AI instructions.
  - `CODE_OF_CONDUCT.md`: Contributor Covenant v2.1.
  - `SECURITY.md`: Vulnerability reporting policies, security disclosures, and secret prevention rules.
  - `CONTRIBUTORS.md`: Verified maintainer attribution and contributor recognition protocol.
  - `SUPPORT.md`: Community support and official hackathon reference links.
- GitHub community templates:
  - `.github/ISSUE_TEMPLATE/bug_report.md`
  - `.github/ISSUE_TEMPLATE/feature_request.md`
  - `.github/ISSUE_TEMPLATE/config.yml`
  - `.github/PULL_REQUEST_TEMPLATE.md`
- Developer tooling configuration:
  - `.editorconfig`: Standardized cross-editor formatting rules.
  - `.gitignore`: Comprehensive ignore rules for Python, Node, AI weights, checkpoints, logs, and OS artifacts.
  - `.env.example`: Secure environment variable template with zero real credentials.

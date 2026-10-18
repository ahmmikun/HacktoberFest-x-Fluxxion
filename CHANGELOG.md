# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Core AI pipeline and model integration modules (in development during hack day).
- Benchmark scripts and reproducible evaluation datasets.
- Interactive demo and client interface.

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

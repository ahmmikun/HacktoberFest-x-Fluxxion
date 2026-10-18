# Contributing to HacktoberFest-x-Fluxxion

Welcome to the **HacktoberFest-x-Fluxxion** open-source repository! We are excited to collaborate with builders, developers, designers, and students joining us for **MLH Hacktoberfest Hack Day Lahore × Fluxxion 2026** and the global open-source community.

Please read through these guidelines to ensure an enjoyable and effective contribution workflow.

---

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please treat all contributors with kindness, empathy, and respect.

---

## Getting Started

### 1. Prerequisites

Depending on the specific component you are working on, ensure you have the following installed on your machine:

- **Git**: [git-scm.com](https://git-scm.com/) (Version 2.30+)
- **GitHub CLI (optional but recommended)**: `gh` CLI for quick issue and PR management
- **Runtime Environment (Project Dependent)**:
  - **Python** (Recommended: Python 3.10+ if contributing to AI harnesses/scripts): Verify with `python --version`
  - **Node.js** (Recommended: Node 18+ LTS if contributing to web frontends or JS agent tooling): Verify with `node --version`
  - **Ollama / Local LLM Runner (for local inference testing)**: [ollama.com](https://ollama.com/) (e.g., `ollama run gemma:2b` or configured open-weight model)

> [!NOTE]
> Project-specific dependency lockfiles (such as `requirements.txt`, `pyproject.toml`, or `package.json`) will be pinned as modules are developed. Check the root directory for relevant manifests.

---

## Contribution Workflow

### 1. Finding or Proposing an Issue

- Check the [GitHub Issues](https://github.com/ahmmikun/HacktoberFest-x-Fluxxion/issues) tab for existing tasks labeled `good first issue`, `help wanted`, or `hacktoberfest`.
- If you have an idea for a feature or have identified a bug, please open an issue first using our [Issue Templates](.github/ISSUE_TEMPLATE/) so we can discuss the approach before you invest time writing code.

### 2. Forking and Branching

1. Fork the repository to your own GitHub account.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/HacktoberFest-x-Fluxxion.git
   cd HacktoberFest-x-Fluxxion
   ```
3. Create a feature branch with a descriptive name:
   ```bash
   # For new features
   git checkout -b feature/agent-skill-metadata

   # For bug fixes
   git checkout -b fix/ollama-endpoint-timeout

   # For documentation updates
   git checkout -b docs/clarify-setup-steps
   ```

### 3. Setting Up Your Local Environment

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Populate the `.env` file with appropriate local values or mock tokens (see [.env.example](.env.example)).
   > [!WARNING]
   > Never commit `.env` or any real API keys or tokens into Git.

3. Install project dependencies:
   - For Python tooling:
     ```bash
     python -m venv .venv
     # Windows PowerShell:
     .venv\Scripts\Activate.ps1
     # macOS/Linux:
     source .venv/bin/activate
     pip install -r requirements.txt  # When present
     ```
   - For Node.js tooling:
     ```bash
     npm install  # When package.json is present
     ```

---

## Coding Conventions & Standards

- **Clean & Readable**: Code should be self-documenting, with meaningful variable and function names.
- **Maintain Documentation**: If you add or modify functionality, update the corresponding documentation and comments.
- **Formatting**:
  - Follow [.editorconfig](.editorconfig) settings for uniform indentation, whitespace, and line endings.
  - Python: Follow PEP 8 style guidelines.
  - JavaScript / TypeScript: Standard formatting with 2 spaces.
- **Git Commit Messages**:
  We recommend the [Conventional Commits](https://www.conventionalcommits.org/) convention:
  - `feat: add local Ollama inference wrapper`
  - `fix: resolve prompt template token truncation`
  - `docs: update quickstart guide with Gemma 4 local setup`
  - `refactor: simplify model harness invocation logic`

---

## Responsible Open-Source AI Guidelines

Because this project targets the **Best Open-Source AI Project** challenge:

1. **Open-Weight / Open-Source Priority**:
   - Focus implementations on open-source and open-weight models (e.g., Gemma, Llama, Hermes, Mistral) rather than locked, closed APIs whenever possible.
2. **Agent Skill Standard Compliance**:
   - If developing agent skills, adhere to the [Agent Skill Open Standard](https://dev.to/loc_carrre_0d798813c662/agent-skills-explained-what-they-are-what-they-arent-and-how-to-use-them-bf9) with standardized `SKILL.md` frontmatter and instruction structures.
3. **Model Harness Originality & Attribution**:
   - If adapting an open-source model harness (such as Hermes Agent or Ollama wrappers), clearly document upstream sources, original licenses, and state your meaningful modifications.
4. **Data Privacy**:
   - Do not include private, copyrighted, or sensitive datasets in test fixtures or commits.

---

## Running Tests & Verification

Before submitting your pull request:

1. Run any available unit tests and linting:
   ```bash
   # When tests are configured:
   pytest                  # Python test suite
   npm test                # JavaScript / Node test suite
   git diff --check        # Check for whitespace / formatting errors
   ```
2. Verify that documentation links remain valid and relative paths resolve properly.
3. Verify that no secrets, caches, or large model weight files (`*.bin`, `*.safetensors`, `*.gguf`) were accidentally staged in Git.

---

## Submitting Pull Requests

1. Push your branch to your GitHub fork:
   ```bash
   git push origin <your-branch-name>
   ```
2. Open a Pull Request against the `main` branch of the upstream repository `ahmmikun/HacktoberFest-x-Fluxxion`.
3. Fill out the [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md) completely, describing:
   - What changes were made and why.
   - Any related issue numbers (e.g., `Closes #12`).
   - How your changes were tested locally.
4. Keep your PR focused on a single topic or fix to make review swift and constructive.

---

## Review Process & Maintainer Feedback

- Maintainers will review your PR as quickly as possible.
- If changes or clarifications are requested, push additional commits to your branch; the PR will update automatically.
- Once approved, maintainers will squash and merge your contribution into `main`.
- You are welcome to add your name to [CONTRIBUTORS.md](CONTRIBUTORS.md)!

Thank you for building open-source AI with us!

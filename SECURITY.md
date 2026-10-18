# Security Policy

The maintainers and community of **HacktoberFest-x-Fluxxion** take software security seriously. We welcome responsible disclosures from researchers, contributors, and users to ensure our tools and workflows remain safe.

---

## Supported Versions

During the active development phase of the project (including during and following the **MLH Hacktoberfest Hack Day Lahore × Fluxxion 2026** hackathon), security updates and fixes will be applied to the primary development branch:

| Version | Supported          | Status |
| ------- | ------------------ | ------ |
| `main`  | :white_check_mark: | Active development & hackathon release branch |
| < 0.1.0 | :x:                | Scaffolding / Historical snapshots |

---

## Reporting a Vulnerability

> [!WARNING]
> **Please DO NOT file public GitHub Issues or create public discussions for suspected security vulnerabilities or exposed secrets.**

If you discover a security vulnerability, private data leak, or unsafe dependency execution path, please report it through one of the following private channels:

1. **GitHub Private Vulnerability Reporting (Preferred)**:
   Navigate to the **Security** tab of the repository on GitHub, click **Advisories**, and select **Report a vulnerability**. This creates a confidential draft advisory that only project maintainers can access.
2. **Direct Maintainer Contact**:
   If private vulnerability reporting is not active or accessible, send an email describing the issue to:
   - **Salman Ahmad**: `140977479+ahmmikun@users.noreply.github.com`
   - **Backup Security Contact**: `[MAINTAINER_SECURITY_EMAIL_PLACEHOLDER - Optional secondary email]`

### What to Include in Your Report

To help us triage and resolve the issue quickly, please provide:
- A descriptive title and summary of the vulnerability.
- Steps to reproduce the issue (including any minimal proof-of-concept scripts or inputs).
- Potential impact (e.g., arbitrary code execution, token leakage, prompt injection / model breakout).
- Any proposed remediation or mitigation strategy, if available.

### What to Expect

- **Initial Response**: We aim to acknowledge receipt of your vulnerability report within **48 hours**.
- **Assessment**: We will evaluate the impact, verify the reproduction steps, and assign an internal priority.
- **Remediation**: Once verified, we will develop a patch or configuration change in a private advisory fork.
- **Disclosure**: We will coordinate with the reporter on a timeline before publishing a release notice and acknowledging the reporter's contribution (unless anonymity is requested).

---

## AI Model & Data Security Guidelines

Because this repository focuses on open-source and open-weight AI implementations:

1. **Zero Secret Policy**:
   - **Never commit `.env` files, API keys, access tokens, SSH keys, or cloud credentials.**
   - All external keys must be loaded via local environment variables (see `.env.example`).
   - Any secret detected in Git history will be treated as compromised immediately.
2. **Model Weight Verification**:
   - Ensure open-weight model artifacts are verified against upstream SHA256 checksums or downloaded directly from verified repositories (e.g., Hugging Face Hub official orgs, Ollama official library).
   - Never run unverified pickled `.bin` or `.pkl` weight files without sandbox isolation; prefer `.safetensors` format.
3. **Prompt Injection & Tool Invocation Guardrails**:
   - When building agent skills or autonomous harnesses, ensure that model tool calls that touch file system operations or network sockets contain strict input validation.

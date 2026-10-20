# RepoSage 🔎 — Project Summary & Architecture Walkthrough
**MLH Hacktoberfest Hack Day Lahore × Fluxxion 2026**  
**Category Target:** Best Open-Source AI Project (Sponsored by DigitalOcean)

---

## ⚡ Executive Summary

> *"Most developers want AI to audit their code, but face two massive dealbreakers: pasting sensitive GitHub tokens into web applications, and AI models hallucinating files that do not exist.*
>
> *We built **RepoSage** — a local-first, evidence-grounded repository auditor powered by **open-weight Gemma 4 models**. It connects natively to your existing **GitHub CLI (`gh`)** with zero token pasting, computes an instant deterministic 0–100 Health Score, cross-verifies every AI claim against your actual Git tree to quarantine hallucinations, and lets you convert verified findings into real GitHub Issues in one click."*

---

## 🎯 The Core Problem & Our Innovation

| The Old Way (Generic LLMs & Web Linters) | The RepoSage Way |
| :--- | :--- |
| **Token Risk:** Requires pasting personal access tokens (PATs) into web UIs. | **Zero-PAT Friction:** Natively bridges to your authenticated `gh` CLI session in-memory. Zero tokens saved or logged. |
| **Hallucinated Audits:** LLMs invent non-existent file paths and phantom vulnerabilities. | **Anti-Hallucination Gate:** Citation Verifier validates every AI claim against the recursive Git tree. Fake claims are quarantined. |
| **Black Box Cloud Only:** Forces proprietary models, sending sensitive private IP to external clouds. | **Dual-Runtime Open-Weight AI:** Runs `Gemma 4 E4B` 100% locally on Ollama (air-gapped privacy) or `Gemma 4 26B` for deep analysis. |
| **Vague Advice:** Outputs long conversational text with no actionable follow-up. | **1-Click GitHub Issues & Turnkey AI Fix Prompts:** Converts verified findings into real GitHub Issues in 1 click, or generates tailored remediation prompts for Claude Code, Cursor, Aider, and LLMs. |

---

## 🛠️ How It Works (Step-by-Step Architecture)

```text
[ User Machine ] ──> [ gh CLI Bridge ] ──> [ Evidence Collector (GraphQL) ]
                                                        │
┌───────────────────────────────────────────────────────┴───────────────────────────────────────────────────────┐
│ 1. Deterministic Rule Engine                                                                                  │
│    Calculates 0-100 Health Score across 6 dimensions (CI/CD, Tests, Security, Hygiene, Docs, Velocity)         │
├───────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 2. Evidence Compiler & Privacy Redactor (SHA-256 Manifest)                                                     │
│    Packages facts & sanitizes sensitive keys before AI inference                                              │
├───────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 3. Gemma 4 Open-Weight AI Inference Engine                                                                    │
│    • Local Mode: Gemma 4 E4B via Ollama (100% private, zero internet needed)                                  │
│    • Cloud Mode: Gemma 4 26B via Google AI Studio (Deep architectural reasoning)                              │
│    • Comparison Mode: Live benchmark comparing edge vs hosted weights on identical evidence                   │
├───────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 4. Anti-Hallucination Citation Verifier                                                                       │
│    Cross-checks every file mentioned by AI against real Git tree. Flagged if file doesn't exist!              │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                        │
                 [ Real-time SSE Stream ] ──> [ Next.js 15 Dashboard & 1-Click Issue Push ]
```

---

## 🖥️ 2-Minute Walkthrough & Demonstration Flow

1. **Zero-Friction Onboarding (15s)**
   - Open RepoSage at `http://localhost:3000`.
   - Point out: *"Notice there is no login form or token prompt. RepoSage detected the local `gh` session instantly. All public and private repos within scope are accessible immediately."*
2. **Select Repo & Run Audit (30s)**
   - Select a repository and click **Run Audit**.
   - Observe the live Server-Sent Events (SSE) feed:
     - Stage 1: Evidence collection (recursive Git tree + high-signal configs).
     - Stage 2: Deterministic 0–100 score computed instantly (e.g. 78/100).
     - Stage 3: Gemma 4 inference streaming in structured JSON.
3. **The Anti-Hallucination Gate (30s)**
   - View the findings panel:
   - *"Notice how every single finding has a verified citation badge linking to an actual repository file. If an LLM hallucinates a file, our Citation Verifier catches it, strips it from the main plan, and flags it under telemetry."*
4. **Dual-Runtime Comparison Mode (30s)**
   - Toggle to **Comparison Mode**:
   - Compare `Gemma 4 E4B` (running locally on Ollama in milliseconds) against `Gemma 4 26B` (running hosted).
   - Inspect latency, token throughput, and schema compliance metrics.
5. **1-Click GitHub Remediation (15s)**
   - Click **"Create GitHub Issue"** on a high-priority finding.
   - Converts the verified finding into a formatted, actionable issue directly on GitHub through the CLI bridge.
6. **Turnkey AI Agent Fix Prompts (15s)**
   - Click **"AI Fix Prompt"** or **"Copy Fix Prompt"** on any finding.
   - Generates a detailed, evidence-grounded remediation prompt ready to paste into **Claude Code, Devin, Roo Code, Cursor Composer (`@file`), Aider CLI (`/add`), or ChatGPT/Gemini** to fix issues automatically and boost the health score to 100/100.

---

## 🏆 Open-Source AI Challenge Alignment

1. **Championing Open-Weight AI (Gemma 4):**
   - We avoid closed proprietary APIs. We demonstrate that **open-weight small models (Gemma 4 E4B)** running locally can perform production-grade code auditing when grounded with structured evidence.
2. **Responsible AI by Design:**
   - Rather than relying on ungrounded generation, RepoSage implements a deterministic truth baseline and strict citation validation to eliminate hallucinations.
3. **Full-Stack Engineering Polish:**
   - Decoupled monorepo with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS v4**, **Node.js/Express**, **Zod** schema enforcement, and **Server-Sent Events**.

---

## 💡 Frequently Asked Technical Questions (FAQ)

- **Q: Why not just paste the repository code into ChatGPT?**
  - *A: Web chatbots have context window limits, lack access to full recursive Git trees, hallucinate files, and transmitting proprietary code violates privacy policies. RepoSage runs locally via Ollama with zero data leaving the host machine.*
- **Q: What happens if the model endpoint is offline?**
  - *A: RepoSage is resilient. The deterministic engine works 100% offline without any AI. For hosted mode, there is automatic Groq fallback, plus a built-in offline simulation mode.*
- **Q: How do you prevent shell injection when running `gh` commands?**
  - *A: We use `child_process.execFile` with strict argument arrays and regex-validated input parameters (`/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/`). Shell string interpolation is strictly avoided.*

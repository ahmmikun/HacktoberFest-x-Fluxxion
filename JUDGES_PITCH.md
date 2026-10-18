# RepoSage 🔎 — Hackathon Judges Pitch & Project Summary
**MLH Hacktoberfest Hack Day Lahore × Fluxxion 2026**  
**Category Target:** Best Open-Source AI Project (Sponsored by DigitalOcean)

---

## ⚡ 30-Second Elevator Pitch

> *"Most developers want AI to audit their code, but face two huge dealbreakers: pasting sensitive GitHub tokens into web apps, and AI hallucinating files that don't exist.*
>
> *We built **RepoSage** — a local-first, evidence-grounded repository auditor powered by **open-weight Gemma 4 models**. It connects natively to your existing **GitHub CLI (`gh`)** with zero token pasting, computes a deterministic 0–100 Health Score, cross-verifies every AI claim against your actual Git tree to quarantine hallucinations, and lets you convert verified findings into real GitHub Issues in one click."*

---

## 🎯 The Core Problem & Our Innovation

| The Old Way (Generic LLMs & Web Linters) | The RepoSage Way |
| :--- | :--- |
| **Token Risk:** Requires pasting personal access tokens (PATs) into web UIs. | **Zero-PAT Friction:** Natively bridges to your authenticated `gh` CLI session in-memory. Zero tokens saved or logged. |
| **Hallucinated Audits:** LLMs invent non-existent file paths and phantom vulnerabilities. | **Anti-Hallucination Gate:** Citation Verifier validates every AI claim against the recursive Git tree. Fake claims are quarantined. |
| **Black Box Cloud Only:** Forces proprietary models, sending sensitive private IP to external clouds. | **Dual-Runtime Open-Weight AI:** Runs `Gemma 4 E4B` 100% locally on Ollama (air-gapped privacy) or `Gemma 4 26B` for deep analysis. |
| **Vague Advice:** Outputs long conversational text with no actionable follow-up. | **1-Click GitHub Remediation:** Converts verified architectural findings directly into GitHub Issues via `gh issue create`. |

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

## 🎤 2-Minute Demo Flow for Judges

1. **Show Zero-Friction Onboarding (15s)**
   - Open RepoSage at `http://localhost:3000`.
   - Point out: *"Notice there is no login form or token prompt. RepoSage detected my local `gh` session instantly. I can browse all my public and private repos."*
2. **Select Repo & Run Audit (30s)**
   - Select a repository and click **Run Audit**.
   - Watch the live Server-Sent Events (SSE) feed:
     - Stage 1: Evidence collection (tree + configs).
     - Stage 2: Deterministic 0–100 score computed instantly (e.g. 78/100).
     - Stage 3: Gemma 4 inference streaming in structured JSON.
3. **Highlight the "Anti-Hallucination Gate" (30s)**
   - Show the findings panel:
   - *"Notice how every single finding has a verified citation badge linking to an actual repository file. If Gemma hallucinates a file, our Citation Verifier catches it, strips it from the main plan, and flags it under telemetry."*
4. **Show Dual-Runtime / Comparison Mode (30s)**
   - Toggle to **Comparison Mode**:
   - Compare `Gemma 4 E4B` (running locally on Ollama in milliseconds) against `Gemma 4 26B` (running hosted).
   - Show latency, token throughput, and schema compliance metrics.
5. **Close with 1-Click Action (15s)**
   - Click **"Create GitHub Issue"** on a high-priority finding.
   - Show that it immediately pushes a formatted, actionable issue directly to GitHub through the CLI bridge.

---

## 🏆 Why RepoSage Wins "Best Open-Source AI Project"

1. **Championing Open-Weight AI (Gemma 4):**
   - We don't just call a proprietary closed-source API. We prove that **open-weight small models (Gemma 4 E4B)** running locally can perform production-grade code auditing when grounded with structured evidence.
2. **Responsible AI by Design:**
   - Instead of blindly trusting AI outputs, RepoSage implements a deterministic truth baseline and strict citation validation to eliminate hallucinations.
3. **Full-Stack Engineering Polish:**
   - Monorepo with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS v4**, **Node.js/Express**, **Zod** schema enforcement, and **Server-Sent Events**.

---

## 💡 Quick Q&A Answers for Judges

- **Q: Why not just paste the repo code into ChatGPT?**
  - *A: ChatGPT has context window limits, lacks access to full recursive Git trees, hallucinate files, and copying proprietary code into web chats violates enterprise privacy. RepoSage runs locally via Ollama with zero data leaving your machine.*
- **Q: What happens if Ollama or Google AI Studio is down?**
  - *A: RepoSage is resilient. The deterministic engine works 100% offline without any AI. For hosted mode, we have automatic Groq fallback, plus a built-in offline simulation mode.*
- **Q: How do you prevent shell injection when running `gh` commands?**
  - *A: We use `child_process.execFile` with strict argument arrays and regex-validated input parameters (`/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/`). We never use shell string concatenation.*

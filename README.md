# HacktoberFest-x-Fluxxion

> **Official Open-Source AI Project Submission for MLH Hacktoberfest Hack Day Lahore × Fluxxion 2026**<br>
> *Targeting the **Best Open-Source AI Project** Category*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Hacktoberfest 2026](https://img.shields.io/badge/Hacktoberfest-2026-orange.svg)](https://events.mlh.com/events/15520-hacktoberfest-hack-day-lahore-x-fluxxion)
[![MLH Event](https://img.shields.io/badge/MLH-Hack%20Day%20Lahore-red.svg)](https://events.mlh.com/events/15520-hacktoberfest-hack-day-lahore-x-fluxxion)
[![Challenge](https://img.shields.io/badge/Challenge-Best%20Open--Source%20AI%20Project-0080FF.svg)](https://www.mlh.com/events/hacktoberfest-hack-day-lahore-x-fluxxion/challenges/01a0d987-0c41-12ea-13ac-5b85755dc2f3)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

## Table of Contents

- [Overview & Purpose](#overview--purpose)
- [Hackathon Context](#hackathon-context)
- [Problem Statement & Proposed Solution](#problem-statement--proposed-solution)
- [What Makes This Project Different](#what-makes-this-project-different)
- [Role of Open-Source & Open-Weight AI](#role-of-open-source--open-weight-ai)
- [Supported Models & Licensing](#supported-models--licensing)
- [Architecture & Tech Stack](#architecture--tech-stack)
- [Demo & Interface](#demo--interface)
- [Key Features](#key-features)
- [Project Structure](#project-structure)
- [Prerequisites & Getting Started](#prerequisites--getting-started)
- [Configuration (.env)](#configuration-env)
- [Commands: Run, Test & Build](#commands-run-test--build)
- [Usage Examples](#usage-examples)
- [Roadmap & Current Limitations](#roadmap--current-limitations)
- [Governance & Community](#governance--community)
- [Contributors & Acknowledgments](#contributors--acknowledgments)

---

## Overview & Purpose

**HacktoberFest-x-Fluxxion** is an open-source AI project built for the **MLH Hacktoberfest Hack Day Lahore × Fluxxion 2026** hackathon.

The repository provides a community-driven foundation for orchestrating workflows with open-source and open-weight artificial intelligence technologies—eliminating proprietary black-box dependencies, prioritizing privacy and local edge execution, and adhering to modern open-source agent standards.

---

## Hackathon Context

This project is submitted to the **Hacktoberfest Hack Day Lahore × Fluxxion** event, organized in partnership with **Major League Hacking (MLH)**, **DigitalOcean**, and **Fluxxion**.

- **Event Page**: [Hacktoberfest Hack Day Lahore × Fluxxion](https://events.mlh.com/events/15520-hacktoberfest-hack-day-lahore-x-fluxxion)
- **Selected Challenge**: [Best Open-Source AI Project](https://www.mlh.com/events/hacktoberfest-hack-day-lahore-x-fluxxion/challenges/01a0d987-0c41-12ea-13ac-5b85755dc2f3)
- **Challenge Sponsor**: DigitalOcean
- **Challenge Requirements**:
  1. Open-source or open-weight AI must be an important part of the project.
  2. The project must be published in a public GitHub repository under an open-source license.
  3. Any agent skill component must comply with the [Agent Skill Open Standard](https://dev.to/loc_carrre_0d798813c662/agent-skills-explained-what-they-are-what-they-arent-and-how-to-use-them-bf9).
  4. Any model harness entry must include an original implementation or meaningful changes to an existing open-source harness.

---

## Problem Statement & Proposed Solution

### The Problem
Modern AI applications frequently rely on proprietary cloud APIs that present significant challenges:
- **Vendor Lock-in & Costs**: Unpredictable token costs and closed-source infrastructure.
- **Privacy & Data Sovereignty**: User queries and private data are transmitted across third-party remote servers.
- **Opacity**: Inability to inspect model weights, verify alignment, or run offline at the network edge.

### The Proposed Solution
`HacktoberFest-x-Fluxxion` demonstrates a modular, reproducible pattern for building with open-weight models (such as Google Gemma, Hermes Agent, and Llama) running entirely locally or via self-hosted infrastructure. By pairing standard agent skills with lightweight local inference runtimes (e.g. Ollama), users gain complete control over their model interactions without external gatekeepers.

> *Note: Teams and maintainers are expanding the specific domain use case (e.g., automated code documentation, local knowledge assistant, or autonomous agent skill). Placeholders are marked below for custom module documentation.*

---

## What Makes This Project Different

1. **Strictly Open-Weight First**: Built to prioritize local models running via Ollama / Transformers rather than fallback commercial closed-source APIs.
2. **Transparent Architecture**: Clear boundaries between model harness orchestration, skills execution, and interface layers.
3. **Agent Skill Standard Compliance**: Designed to follow the Agent Skill Open Standard (`SKILL.md` specifications) for interoperability across modern AI agent environments.
4. **Accessible to First-Time Contributors**: Standardized Git templates, clean setup guides, and beginner-friendly issue labeling for Hacktoberfest participants.

---

## Role of Open-Source & Open-Weight AI

Open-source and open-weight artificial intelligence is the foundational pillar of this repository:

- **Local Inference Engine**: Configured to connect to open runtimes such as [Ollama](https://ollama.com/) or local Python inference servers.
- **Model Autonomy & Alignment**: Allows developers to experiment with prompt templates, system instructions, and tool calling without proprietary API filters or rate limits.
- **Reproducibility**: Anyone with standard hardware can clone this repository, pull the specified open-weight weights, and reproduce all outputs identically.

---

## Supported Models & Licensing

The repository is designed to interface with the following open-weight model families:

| Model Family | Primary Backend | Recommended Parameter Size | Upstream License | Verified Status |
| :--- | :--- | :--- | :--- | :--- |
| **Gemma 2 / Gemma 4** | Ollama / Hugging Face | 2B, 7B, 9B | [Gemma Terms of Use](https://ai.google.dev/gemma/terms) | Open-Weight Compatible |
| **Hermes 3** | Ollama / vLLM | 8B, 70B | Apache 2.0 | Harness / Skill Compatible |
| **Llama 3.2 / 3.1** | Ollama | 1B, 3B, 8B | Llama 3 Community License | Open-Weight Compatible |

> **Disclaimer**: Model weights are distributed under their creators' respective licenses. Refer to the [LICENSE](LICENSE) file for additional licensing clarity.

---

## Architecture & Tech Stack

```text
┌────────────────────────────────────────────────────────┐
│                   User / Client Layer                  │
│             (CLI / REST API / Web Interface)           │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│              Agent Orchestrator & Harness               │
│         (Task Decomposition & Context Assembly)        │
└─────────────┬────────────────────────────┬─────────────┘
              │                            │
┌─────────────▼────────────┐  ┌────────────▼─────────────┐
│    Agent Skills Engine   │  │   Model Inference Runtime│
│ (SKILL.md Open Standard) │  │ (Ollama / Local Engine)  │
└──────────────────────────┘  └──────────────────────────┘
```

- **Languages & Runtimes**: Python 3.10+ / Node.js 18+ (runtime flexible)
- **Model Serving**: Ollama / Hugging Face Transformers / vLLM
- **Deployment**: DigitalOcean Droplet / Local Workstation
- **Standard**: Agent Skill Open Standard for modular tool usage

---

## Demo & Interface

### Automated Turnkey Demo (`python demo.py`)

Run the complete end-to-end demonstration in one command:

```bash
python demo.py
```

#### Terminal Execution Output:

```text
========================================================================
  MLH Hacktoberfest Hack Day Lahore x Fluxxion 2026
  Challenge: Best Open-Source AI Project (Sponsored by DigitalOcean)
  Project:   HacktoberFest-x-Fluxxion Turnkey Demonstration
========================================================================

[Step 1/3] Discovering Agent Skills (Agent Skill Open Standard)...
  * Skill:       code-explainer (v1.0.0)
    Standard:    Agent Skill Open Standard [COMPLIANT]
    Description: Analyzes source code files, identifies design patterns, and generates concise technical summaries for open-source projects.

[Step 2/3] Initializing Open-Weight Model Harness...
  * Status: Connected to local Ollama runtime (or auto-fallback to offline demo engine)
  * Mode:   Open-Weight Model (Gemma 2B / Hermes 3)

[Step 3/3] Executing 'code-explainer' Agent Skill on Sample Code...
  --- Target Code Snippet ---
    | class ModelHarness:
    |     def __init__(self, model_name='gemma:2b'):
    |         self.model = model_name
    |     def execute(self, prompt):
    |         return self._generate(prompt)
  ---------------------------
  Running inference...

========================================================================
  DEMO EXECUTION RESULTS
========================================================================
  * Executed Skill:    code-explainer (v1.0.0)
  * Standard Verified: Yes (Agent Skill Open Standard)
  * Model / Harness:   gemma:2b
  * Execution Mode:    open_weight_inference
  * Latency:           0.218 seconds
------------------------------------------------------------------------
### Code Architecture & Quality Analysis

1. Core Functionality:
- Implements a modular class structure with explicit separation of concerns.
- High cohesion with dedicated responsibility for discovery, validation, and execution.

2. Architectural Patterns Identified:
- Strategy Pattern: Pluggable inference backends (Live Ollama vs. Offline Demo Mode).
- Factory / Parser Pattern: Parsing and normalizing SKILL.md specifications according to the Agent Skill Open Standard.

3. Security & Open-Source Best Practices:
- Zero hardcoded credentials; safe environment isolation verified.
- Input boundaries and timeouts properly applied on external model calls.
========================================================================

[SUCCESS] Demonstration completed successfully.
  This project demonstrates open-weight model orchestration, local inference,
  and strict compliance with the Agent Skill Open Standard.
```

---

## Key Features

- [x] **Agent Skill Open Standard Compliance**: Native `SKILL.md` parser and validator (`skills/code-explainer/SKILL.md`).
- [x] **Open-Weight Model Harness**: Pluggable harness supporting Ollama (Gemma, Hermes, Llama) with an intelligent zero-dependency fallback for instant offline evaluation (`src/harness.py`).
- [x] **Agent Orchestration Engine**: Context builder and skill execution pipeline (`src/agent.py`).
- [x] **Interactive Command-Line Interface**: Multi-command CLI for running skills, health checking, and inspection (`main.py`).
- [x] **Turnkey Automated Demo**: Fast 1-command demonstration for judges and contributors (`demo.py`).
- [x] **Automated Test Suite**: 100% passing unit tests covering skill discovery, compliance, and inference (`tests/test_harness.py`).
- [x] **Production-Grade Open-Source Governance**: Standardized licenses, security policies, and contribution guidelines.

---

## Project Structure

```text
HacktoberFest-x-Fluxxion/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md          # Structured bug report template
│   │   ├── feature_request.md     # Feature and AI component request template
│   │   └── config.yml             # Issue configuration and community links
│   └── PULL_REQUEST_TEMPLATE.md   # PR checklist and challenge verification
├── skills/
│   └── code-explainer/
│       └── SKILL.md               # Compliant with Agent Skill Open Standard
├── src/
│   ├── __init__.py                # Package metadata
│   ├── agent.py                   # FluxxionAgent orchestrator
│   ├── harness.py                 # Open-weight model harness (Ollama / offline)
│   └── skills_manager.py          # Agent Skill parser, loader, and validator
├── tests/
│   ├── __init__.py
│   └── test_harness.py            # Automated test suite (unittest)
├── .editorconfig                  # Cross-editor formatting specifications
├── .env.example                   # Safe environment variables template
├── .gitignore                     # Ignore rules for Python, Node, AI weights & OS
├── CHANGELOG.md                   # Keep a Changelog formatted release record
├── CODE_OF_CONDUCT.md             # Contributor Covenant v2.1
├── CONTRIBUTING.md                # Practical guide for first-time contributors
├── CONTRIBUTORS.md                # Recognition for creators and contributors
├── demo.py                        # Automated turnkey demonstration runner
├── LICENSE                        # MIT License with upstream model disclaimer
├── main.py                        # Primary CLI entrypoint
├── README.md                      # Primary project documentation (this file)
├── requirements.txt               # Lightweight dependency manifests
├── SECURITY.md                    # Vulnerability reporting and secret policy
└── SUPPORT.md                     # Getting help and event resources
```

---

## Prerequisites & Getting Started

### 1. Prerequisites
- **Git** (v2.30 or higher)
- **Python 3.10+** (tested and verified on Python 3.14)
- **Ollama (Optional for live weights)**: [ollama.com](https://ollama.com/) (The demo includes built-in offline simulation mode so you can run it immediately even without Ollama!)

### 2. Clone the Repository
```bash
git clone https://github.com/ahmmikun/HacktoberFest-x-Fluxxion.git
cd HacktoberFest-x-Fluxxion
```

### 3. Run the Turnkey Demo Immediately
```bash
python demo.py
```

### 4. (Optional) Run with Live Ollama Model
```bash
# Pull lightweight Gemma 2B model
ollama pull gemma:2b

# Verify Ollama is running
curl http://localhost:11434/api/tags

# Run with live model
python main.py run --skill code-explainer --input "def calculate(x, y): return x * y"
```

---

## Configuration (.env)

1. Create a local `.env` file from the provided template:
   ```bash
   cp .env.example .env
   ```
2. Adjust environment variables according to your local setup:
   ```ini
   APP_ENV=development
   MODEL_NAME=gemma:2b
   MODEL_BACKEND=ollama
   OLLAMA_BASE_URL=http://localhost:11434
   ```

> [!CAUTION]
> Never commit your `.env` file to version control. The repository's `.gitignore` excludes `.env` automatically.

---

## Commands: Run, Test & Build

```bash
# 1. Run the turnkey demo
python demo.py

# 2. List and validate Agent Skills
python main.py skills

# 3. Check local inference engine health
python main.py health

# 4. Execute an Agent Skill on custom code
python main.py run --skill code-explainer --input "class Cache: pass"

# 5. Run the automated unit test suite
python -m unittest discover tests

# 6. Verify Git status and code quality
git status
git diff --check
```

## Usage Examples

### 1. Running via Python API

```python
from src.agent import FluxxionAgent
from src.harness import ModelHarness

# Initialize agent with open-weight model harness
agent = FluxxionAgent(harness=ModelHarness(model_name="gemma:2b"))

# Run the Agent Skill Open Standard compliant 'code-explainer' skill
result = agent.execute_skill(
    skill_name="code-explainer",
    user_input="def binary_search(arr, target): ...",
    parameters={"language": "python", "focus": "algorithm complexity"}
)

print(result["output"])
print(f"Latency: {result['latency_seconds']}s | Mode: {result['mode']}")
```

### 2. Inspecting Discovered Skills via CLI

```bash
python main.py skills
```

Output:
```text
Discovered 1 Agent Skill(s):
-----------------------------------------------------------------
* Name:        code-explainer (v1.0.0)
  Description: Analyzes source code files, identifies design patterns, and generates concise technical summaries for open-source projects.
  Standard:    Agent Skill Open Standard [COMPLIANT]
  File Path:   skills/code-explainer/SKILL.md
```

---

## Roadmap & Current Status

### Current Implemented Status
- [x] **Agent Skill Open Standard compliance engine** (`skills/code-explainer/SKILL.md`).
- [x] **Open-weight model harness** with automatic Ollama detection and offline fallback engine (`src/harness.py`).
- [x] **Turnkey demonstration script** (`demo.py`) and command-line interface (`main.py`).
- [x] **Automated test suite** with 100% test pass rate (`tests/test_harness.py`).

### Next Milestones
- [ ] Milestone 1: Multi-agent collaborative skills chaining.
- [ ] Milestone 2: One-click DigitalOcean Droplet deployment manifest for edge serving.
- [ ] Milestone 3: Real-time token streaming over terminal WebSockets.

---

## Governance & Community

- **Code of Conduct**: We enforce the [Contributor Covenant v2.1](CODE_OF_CONDUCT.md).
- **Contributing**: Ready to contribute? Please review [CONTRIBUTING.md](CONTRIBUTING.md).
- **Security**: Please review [SECURITY.md](SECURITY.md) to report vulnerabilities safely.
- **Support**: Have questions? Check [SUPPORT.md](SUPPORT.md).

---

## Contributors & Acknowledgments

### Project Initiator & Maintainer
- **Salman Ahmad** ([@ahmmikun](https://github.com/ahmmikun))

### Acknowledgments
- **Major League Hacking (MLH)** and **DigitalOcean** for organizing and sponsoring Hacktoberfest 2026.
- **Fluxxion** ([fluxxion.dev](https://fluxxion.dev/)) and event hosts (Hussnain Ahmad, Zohaib Saeed, and Zaid Latif) for hosting the Lahore Hack Day.
- The open-source AI community and the creators of Gemma, Ollama, and open-weight models worldwide.

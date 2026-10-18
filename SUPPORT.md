# Support

Thanks for trying **RepoSage**. This page covers where to find answers and how to fix the most common setup problems.

---

## Getting Help

### 1. Documentation first
- [README.md](README.md): overview, setup, configuration, and API reference
- [CONTRIBUTING.md](CONTRIBUTING.md): workspace setup, engineering rules, and testing
- [`/docs`](docs/): the full requirements, architecture, and technology stack specs
- [SECURITY.md](SECURITY.md): reporting vulnerabilities (do not use public issues for these)

### 2. GitHub Issues
Search [existing issues](https://github.com/ahmmikun/HacktoberFest-x-Fluxxion/issues) first. If nothing matches, use a template:
- [Bug Report](.github/ISSUE_TEMPLATE/bug_report.md)
- [Feature Request](.github/ISSUE_TEMPLATE/feature_request.md)

### 3. Hackathon support
For participants of **MLH Hacktoberfest Hack Day Lahore × Fluxxion 2026**:
- **Event page**: [events.mlh.com/events/15520-hacktoberfest-hack-day-lahore-x-fluxxion](https://events.mlh.com/events/15520-hacktoberfest-hack-day-lahore-x-fluxxion)
- **Challenge page**: [Best Open-Source AI Project](https://www.mlh.com/events/hacktoberfest-hack-day-lahore-x-fluxxion/challenges/01a0d987-0c41-12ea-13ac-5b85755dc2f3)
- **Organizer**: Fluxxion ([fluxxion.dev](https://fluxxion.dev/)) with Major League Hacking (MLH) and DigitalOcean
- On-site mentors and organizers are available at COLABS Cantt - NASTP during event hours.

---

## Troubleshooting

Start with `npm run preflight` in the repository root. It checks Node.js, `gh`, `apps/api/.env`, Ollama, and the AI Studio key without printing secrets. Once the app is running, the status pills on Mission Control (and `GET /api/v1/system/preflight`) show the same information.

| Symptom | Likely cause | Fix |
| :--- | :--- | :--- |
| "RepoSage API unreachable" / "Cannot reach the RepoSage API" | API not running, or `NEXT_PUBLIC_API_BASE_URL` points elsewhere | Run `npm run dev` from the repository root, and check `apps/web/.env.local`. |
| API returns "Host not allowed." | The API was reached through a hostname other than `localhost`, `127.0.0.1`, `[::1]`, or `HOST` | Point `NEXT_PUBLIC_API_BASE_URL` at `http://localhost:4000/api/v1`. |
| API returns "Origin not allowed." | The dashboard's origin is not listed in `CORS_ORIGIN` | Use <http://localhost:3000>, or add your origin to `CORS_ORIGIN` in `apps/api/.env` (comma-separated). |
| API exits with "Invalid RepoSage API configuration" | A malformed value in `apps/api/.env` | Fix the variables named in the message (for example a non-numeric timeout or an invalid `OLLAMA_BASE_URL`). |
| "GitHub CLI (gh) is not installed or not on PATH" | `gh` missing | Install from [cli.github.com](https://cli.github.com/), restart your terminal, then click **Retry Connection**. |
| "GitHub CLI is installed but not authenticated" | Logged out | Run `gh auth login --web --scopes repo,read:org`, then click **Retry Connection**. |
| "GitHub rejected the gh session token" | Expired or revoked session | Run `gh auth login` again. |
| Private or organization repositories are missing | Token lacks scopes, or the org restricts OAuth apps | Run `gh auth refresh -s repo,read:org`, and check the org's third-party access settings. |
| "Repository not found or not accessible" | Typo, or your `gh` account cannot read the repository | Check the `owner/repo` spelling and your access on GitHub. |
| "Too many audits running" | 3 audits already in progress | Wait for one to finish. |
| "Audit not found or expired" | Audits are kept in memory for 1 hour and lost when the API restarts | Re-run the audit. Export reports you want to keep. |
| Ollama pill is red | Ollama not running, or a different port | Run `ollama serve` and check `curl http://127.0.0.1:11434/api/tags`. Make sure `OLLAMA_BASE_URL` matches. |
| "Model gemma4:e4b not pulled" / "not found in Ollama" | Gemma 4 E4B not downloaded | Run `ollama pull gemma4:e4b`. Update Ollama if the tag is unknown. |
| "Ollama timed out after 60000 ms" | Not enough RAM or VRAM for E4B | Raise `OLLAMA_TIMEOUT_MS`, close heavy apps, or use Hosted mode. The deterministic report is unaffected. |
| AI Studio pill says "no API key" | `GOOGLE_AI_API_KEY` missing or still the placeholder | Add a real key to `apps/api/.env` (not `apps/web`) and restart the API. |
| "Google AI Studio rejected the API key" / "rate limit / quota exceeded" | Invalid key or quota | Check the key and quota in Google AI Studio. |
| "Model … is not available on Google AI Studio" | Wrong model ID | Set `HOSTED_GEMMA_MODEL=gemma-4-26b-a4b-it`. |
| A model run shows "returned invalid output" | Output failed schema validation, even after the one repair retry | Re-run the audit, or use the other model. The deterministic report is still complete. |
| Many checks show as **Skipped** | Evidence not visible (for example branch protection without admin access, or an empty repository) | Expected behavior: skipped checks are excluded from the score instead of counting as failures. |
| Findings appear only under **Show quarantine** | The model cited files or checks that do not exist, or claimed a passing check failed | Expected behavior: the Citation Verifier quarantines them, and they cannot be filed as issues. |
| `npm` is blocked in PowerShell | Windows execution policy | Use `npm.cmd`, or run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`. |
| `npm install` warns "packages have install scripts not yet covered by allowScripts" (`esbuild`, `protobufjs`, `@google/genai`) | npm 11 skips unapproved install scripts | Typecheck and build still pass with this warning. If `npm run dev` then fails with an esbuild binary error, run `npm install-scripts approve esbuild` and reinstall. |

When filing a bug, include the `npm run preflight` output and the relevant lines from the API terminal. The API redacts secrets from its logs, but double-check before posting.

---

## Maintainer Response Expectations

- **During Hack Day (October 18, 2026)**: we monitor pull requests and urgent issues during event hours.
- **Afterwards**: maintainers aim to respond within 3–5 business days. This is a community project, so thanks for your patience.

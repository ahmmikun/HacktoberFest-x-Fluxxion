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

The Preflight banner at the top of the dashboard (and `GET /api/v1/system/preflight`) shows the status of `gh`, Ollama, and AI Studio. Start there.

| Symptom | Likely cause | Fix |
| :--- | :--- | :--- |
| "GitHub CLI is not installed or not authenticated" | `gh` missing or logged out | Install from [cli.github.com](https://cli.github.com/), then run `gh auth login` and click **Retry Connection**. |
| Private or organization repositories are missing | Token lacks scopes, or the org restricts OAuth apps | Run `gh auth refresh -s repo,read:org`, and check the org's third-party access settings. |
| Ollama shows as offline | Ollama not running, or a different port | Start Ollama and check `curl http://127.0.0.1:11434/api/tags`. Make sure `OLLAMA_BASE_URL` matches. |
| "model not found" in Local Mode | Gemma 4 E4B not pulled | Run `ollama pull gemma4:e4b`. Update Ollama if the tag is unknown. |
| Local Mode is very slow | Not enough RAM or VRAM for E4B | Close other heavy apps, or use Hosted Mode. The deterministic report works without any model. |
| AI Studio shows as not configured | `GOOGLE_AI_API_KEY` missing | Add it to `apps/api/.env` (not `apps/web`) and restart the API. |
| Hosted Mode returns a model error | Wrong model ID | Set `HOSTED_GEMMA_MODEL=gemma-4-26b-a4b-it`. |
| Many checks show as skipped | API permissions or rate limits | Expected behavior: skipped checks are excluded from the score instead of counting as failures. |
| Findings are listed as unverified | The model cited files or checks that do not exist | Expected behavior: the Citation Verifier quarantines them. Use the Quarantine toggle to inspect them. |
| `npm` is blocked in PowerShell | Windows execution policy | Use `npm.cmd`, or run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`. |

When filing a bug, include the preflight output with any token values removed.

---

## Maintainer Response Expectations

- **During Hack Day (October 18, 2026)**: we monitor pull requests and urgent issues during event hours.
- **Afterwards**: maintainers aim to respond within 3–5 business days. This is a community project, so thanks for your patience.

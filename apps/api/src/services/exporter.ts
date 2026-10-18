import type { AuditFinding, AuditResult, ModelRunResult } from "@reposage/shared";

/** Neutralizes raw HTML in untrusted text so the report is safe in any Markdown renderer. */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const cell = (s: string) => esc(s).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
const code = (s: string) => "`" + s.replace(/`/g, "'") + "`";

const STATUS_ICON: Record<string, string> = {
  PASS: "✅ PASS",
  WARN: "⚠️ WARN",
  FAIL: "❌ FAIL",
  SKIPPED_INSUFFICIENT_EVIDENCE: "⏭️ SKIPPED",
};

function finding(f: AuditFinding, n: number): string {
  const refs = f.evidenceRefs
    .map((r) => `${code(r.filePath)}${r.checkId ? ` · check ${code(r.checkId)}` : ""}${r.snippetQuote ? ` — “${esc(r.snippetQuote)}”` : ""}`)
    .join("; ");
  return [
    `#### ${n}. ${esc(f.title)}`,
    "",
    `**Severity:** ${f.severity} · **Priority:** P${f.suggestedPriority} · **Category:** ${f.category} · **Confidence:** ${f.confidence}`,
    "",
    `**Impact:** ${esc(f.impact)}`,
    "",
    "**Remediation:**",
    ...f.remediationSteps.map((s, i) => `${i + 1}. ${esc(s)}`),
    "",
    `**Evidence:** ${refs}`,
    "",
  ].join("\n");
}

function modelSection(run: ModelRunResult): string {
  const out: string[] = [`### ${esc(run.modelId)} (${run.runtime === "OLLAMA_LOCAL" ? "Local · Ollama" : "Hosted · Google AI Studio"})`, ""];
  if (run.status !== "SUCCESS") {
    out.push(`> **${run.status}:** ${esc(run.error ?? "No output")}`, "");
    return out.join("\n");
  }
  if (run.executiveSummary) out.push("**Executive summary**", "", esc(run.executiveSummary), "");
  if (run.architecturalRisks.length) out.push("**Architectural risks**", "", ...run.architecturalRisks.map((r) => `- ${esc(r)}`), "");
  if (run.quickWins.length) out.push("**Quick wins**", "", ...run.quickWins.map((r) => `- ${esc(r)}`), "");
  out.push(`**Verified findings (${run.verifiedFindings.length})**`, "");
  run.verifiedFindings.forEach((f, i) => out.push(finding(f, i + 1)));
  if (run.quarantinedFindings.length) {
    out.push(`<details><summary>Quarantined unverified claims (${run.quarantinedFindings.length})</summary>`, "");
    for (const f of run.quarantinedFindings) {
      out.push(`- **${esc(f.title)}** — ${f.verificationStatus}: ${esc((f.verificationNotes ?? []).join(" "))}`);
    }
    out.push("", "</details>", "");
  }
  return out.join("\n");
}

/** Builds the portable Markdown audit report (FR-ACT-02). */
export function renderMarkdownReport(audit: AuditResult): string {
  const m = audit.metadata;
  const h = audit.health;
  const lines: string[] = [
    `# RepoSage Audit — ${esc(audit.repo)}`,
    "",
    `- **Audit ID:** ${code(audit.auditId)}`,
    `- **Generated:** ${audit.completedAt ?? audit.createdAt}`,
    `- **Mode:** ${audit.mode}`,
    `- **Commit:** ${m?.headSha ? code(m.headSha) : "n/a"} on ${m?.defaultBranch ? code(m.defaultBranch) : "n/a"}`,
    `- **Evidence manifest SHA-256:** ${audit.manifestSha256 ? code(audit.manifestSha256) : "n/a"} (~${audit.manifestTokenEstimate ?? 0} tokens)`,
    "",
  ];

  if (audit.error) lines.push(`> **Audit error:** ${esc(audit.error)}`, "");

  if (h) {
    lines.push(`## Health Score: ${h.overallScore}/100 (Grade ${h.grade})`, "", "Computed 100% deterministically before any AI inference.", "");
    lines.push("| Dimension | Weight | Score |", "| :--- | ---: | ---: |");
    for (const d of h.dimensions) lines.push(`| ${d.label} | ${d.weightPct}% | ${d.score === null ? "n/a" : `${d.score}/100`} |`);
    lines.push("", "### Deterministic checks", "", "| Status | Check | Evidence |", "| :--- | :--- | :--- |");
    for (const c of h.checks) lines.push(`| ${STATUS_ICON[c.status]} | ${code(c.checkId)} ${cell(c.title)} | ${cell(c.observedEvidence)} |`);
    lines.push("");
  }

  if (audit.models.length) {
    lines.push("## AI Analysis (citation-verified)", "");
    for (const run of audit.models) lines.push(modelSection(run));

    const withTelemetry = audit.models.filter((r) => r.telemetry);
    if (withTelemetry.length) {
      lines.push("## Model Comparison Metrics", "", "| Model | Runtime | Latency | Schema valid 1st try | Findings | Verified | Unsupported | Citation accuracy | Manifest SHA-256 |", "| :--- | :--- | ---: | :---: | ---: | ---: | ---: | ---: | :--- |");
      for (const r of withTelemetry) {
        const t = r.telemetry!;
        lines.push(`| ${cell(t.modelId)} | ${t.runtime} | ${t.latencyMs} ms | ${t.schemaValidFirstTry ? "yes" : "no"} | ${t.totalFindings} | ${t.verifiedFindingsCount} | ${t.unsupportedClaimsCount} | ${t.citationAccuracyPct}% | ${code(t.manifestSha256.slice(0, 16))}… |`);
      }
      lines.push("");
    }
    if (audit.consensus.length) {
      lines.push("### Consensus matrix", "", "| Finding | Category | Agreement | E4B | 26B |", "| :--- | :--- | :--- | :--- | :--- |");
      for (const c of audit.consensus) lines.push(`| ${cell(c.title)} | ${c.category} | ${c.agreement} | ${c.localSeverity ?? "—"} | ${c.hostedSeverity ?? "—"} |`);
      lines.push("");
    }
  }

  lines.push("---", "", "_Generated by RepoSage — deterministic facts first, AI interpretation verified against the Git tree._", "");
  return lines.join("\n");
}

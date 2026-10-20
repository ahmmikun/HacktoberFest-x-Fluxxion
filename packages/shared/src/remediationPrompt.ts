import { z } from "zod";
import type {
  AuditFinding,
  AuditResult,
  FindingCategory,
  ModelRunResult,
  RuleEvaluation,
} from "./schemas.js";

/* -------------------------------------------------------------------------- */
/*                        Fix Prompt Types & Options                          */
/* -------------------------------------------------------------------------- */

export const FixPromptPresetSchema = z.enum(["agent", "cursor", "aider", "generic"]);
export type FixPromptPreset = z.infer<typeof FixPromptPresetSchema>;

export const FixPromptScopeSchema = z.enum(["all", "critical_high", "single"]);
export type FixPromptScope = z.infer<typeof FixPromptScopeSchema>;

export const FixPromptOptionsSchema = z.object({
  preset: FixPromptPresetSchema.default("agent"),
  scope: FixPromptScopeSchema.default("all"),
  selectedFindingId: z.string().optional(),
  category: z.string().optional(),
  includeDeterministicChecks: z.boolean().default(true),
  includeEvidenceSnippets: z.boolean().default(true),
  preferredRuntime: z.enum(["OLLAMA_LOCAL", "GOOGLE_AI_STUDIO", "GROQ"]).optional(),
});
export type FixPromptOptions = z.infer<typeof FixPromptOptionsSchema>;

export interface FixPromptMetadata {
  tokenEstimate: number;
  charCount: number;
  findingCount: number;
  failingChecksCount: number;
  preset: FixPromptPreset;
  scope: FixPromptScope;
}

export interface GeneratedFixPrompt {
  prompt: string;
  metadata: FixPromptMetadata;
}

/** Simple rough token estimator (~4 chars per token for English markdown/code). */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/* -------------------------------------------------------------------------- */
/*                         Prompt Generation Utilities                        */
/* -------------------------------------------------------------------------- */

function formatPresetInstructions(preset: FixPromptPreset, repo: string): string[] {
  switch (preset) {
    case "cursor":
      return [
        "## 💻 CURSOR & IDE ASSISTANT INSTRUCTIONS",
        `- Repository context: Current workspace is \`${repo}\`.`,
        "- Whenever referencing files below, utilize the `@filename` syntax to pull file contents into Cursor Composer.",
        "- Apply edits incrementally using the Composer interface. Keep changes surgical and adhere to existing code conventions.",
        "- Run project verification commands in terminal after applying changes.",
      ];
    case "aider":
      return [
        "## 💻 AIDER & TERMINAL AGENT INSTRUCTIONS",
        `- Working directory is the root of \`${repo}\`.`,
        "- Before editing, add the relevant files to your chat context using `/add <filePath>` as listed in each finding.",
        "- Output minimal, clean unified diffs or edit blocks.",
        "- Create atomic git commits after resolving each finding.",
      ];
    case "agent":
      return [
        "## 🤖 AUTONOMOUS AGENT PROTOCOL & EXECUTION RULES",
        "You are acting as an autonomous Principal Software Engineer & DevSecOps specialist.",
        "Execute this remediation plan using the following strict protocol:",
        "1. **Inspection First:** Read existing configurations, manifests (e.g. `package.json`, workflow configs), and source files before modifying anything.",
        "2. **Priority-Driven:** Remediate findings in strict order of priority: P1 (Urgent/Critical) → P2 (High) → P3 (Medium) → P4/P5.",
        "3. **Zero Regressions & No Breaking Changes:** Do not rename existing public APIs or remove existing capabilities unless explicitly instructed.",
        "4. **No Phantom Packages:** Avoid adding third-party dependencies unless necessary; verify compatibility and pin action versions.",
        "5. **Local Verification:** Run test, lint, and typecheck commands after each fix to ensure the repository remains in a buildable, working state.",
        "6. **Atomic Commits:** Make clean, descriptive git commits following Conventional Commits (e.g. `fix(ci): ...`, `test: ...`, `docs: ...`).",
      ];
    case "generic":
    default:
      return [
        "## 🎯 INSTRUCTIONS FOR AI / LLM",
        "You are an expert software engineer reviewing automated audit results.",
        "Provide complete, production-ready code fixes, configurations, and documentation improvements for the findings listed below.",
        "Provide full file contents or precise replacement instructions so the user can easily paste and apply your solutions.",
      ];
  }
}

function formatEvidenceRefs(
  refs: AuditFinding["evidenceRefs"],
  preset: FixPromptPreset,
  includeSnippets: boolean,
): string[] {
  return refs.map((ref) => {
    const isRoot = ref.filePath === "REPO_ROOT";
    const fileTag = preset === "cursor" && !isRoot ? `@${ref.filePath}` : `\`${ref.filePath}\``;
    const pathDesc = isRoot
      ? `\`${ref.filePath}\` *(Repository root — create new file here if applicable)*`
      : fileTag;
    const checkDesc = ref.checkId ? ` [Check: \`${ref.checkId}\`]` : "";
    const snippetDesc =
      includeSnippets && ref.snippetQuote ? `\n    > Evidence quote: "${ref.snippetQuote.replace(/[\r\n]+/g, " ")}"` : "";
    return `  - ${pathDesc}${checkDesc}${snippetDesc}`;
  });
}

function formatSingleFindingDetails(
  finding: AuditFinding,
  index: number | null,
  preset: FixPromptPreset,
  includeSnippets: boolean,
): string[] {
  const numPrefix = index !== null ? `### Finding #${index}: ` : "### ";
  const lines: string[] = [
    `${numPrefix}${finding.title}`,
    `- **Severity:** \`${finding.severity}\` | **Priority:** \`P${finding.suggestedPriority}\` | **Category:** \`${finding.category}\` | **Confidence:** \`${finding.confidence}\``,
    `- **Impact:** ${finding.impact}`,
    "",
    "**Target Files & Citations:**",
    ...formatEvidenceRefs(finding.evidenceRefs, preset, includeSnippets),
    "",
    "**Actionable Remediation Steps:**",
    ...finding.remediationSteps.map((step, sIdx) => `${sIdx + 1}. ${step}`),
  ];

  if (preset === "aider") {
    const filesToAdd = finding.evidenceRefs
      .map((r) => r.filePath)
      .filter((p) => p !== "REPO_ROOT");
    if (filesToAdd.length > 0) {
      lines.push("", `> **Aider context command:** \`/add ${filesToAdd.join(" ")}\``);
    }
  }

  return lines;
}

function formatFailingChecks(checks: RuleEvaluation[]): string[] {
  const failing = checks.filter((c) => c.status === "FAIL" || c.status === "WARN");
  if (failing.length === 0) return [];

  const lines: string[] = [
    "## ⚠️ DETERMINISTIC HEALTH CHECK DEFICITS",
    "The following deterministic checks failed or warned during static evidence analysis. Resolving these directly improves the repository health score:",
    "",
  ];

  for (const c of failing) {
    const statusIcon = c.status === "FAIL" ? "❌ FAIL" : "⚠️ WARN";
    lines.push(
      `- **[${statusIcon}] \`${c.checkId}\` — ${c.title}** (Dimension: \`${c.dimension}\`, Weight: ${c.weight} pts)`,
    );
    lines.push(`  - **Observed:** ${c.observedEvidence}`);
    if (c.filePath) lines.push(`  - **File:** \`${c.filePath}\``);
    if (c.recommendation) lines.push(`  - **Fix Suggestion:** ${c.recommendation}`);
  }

  return lines;
}

/* -------------------------------------------------------------------------- */
/*                       Main Prompt Generator Functions                      */
/* -------------------------------------------------------------------------- */

/**
 * Generates a targeted, self-contained fix prompt for a single finding.
 * Ideal for 1-click "Copy Fix Prompt" on finding cards.
 */
export function generateFindingFixPrompt(
  audit: AuditResult,
  finding: AuditFinding,
  options?: Partial<FixPromptOptions>,
): GeneratedFixPrompt {
  const preset = options?.preset ?? "agent";
  const includeSnippets = options?.includeEvidenceSnippets ?? true;
  const m = audit.metadata;

  const lines: string[] = [
    `# 🛠️ AI TASK: Fix Finding in ${audit.repo}`,
    "",
    `> **Repository:** \`${audit.repo}\`${m?.defaultBranch ? ` (Branch: \`${m.defaultBranch}\` @ \`${m.headSha?.slice(0, 7) ?? "head"}\`)` : ""}`,
    `> **Audit ID:** \`${audit.auditId}\``,
    `> **Task:** Resolve finding **"${finding.title}"**`,
    "",
    "---",
    "",
    ...formatPresetInstructions(preset, audit.repo),
    "",
    "---",
    "",
    "## 🎯 PROBLEM STATEMENT & SPECIFICATION",
    ...formatSingleFindingDetails(finding, null, preset, includeSnippets),
    "",
    "---",
    "",
    "## ✅ ACCEPTANCE CRITERIA & VERIFICATION",
    "- Implement the remediation steps exactly as specified above.",
    "- Ensure all modified and new files conform to existing project formatting, linting, and typing rules.",
    "- Verify that existing tests still pass and add test coverage for this fix if appropriate.",
    `- Create a clear git commit: \`fix(${finding.category.toLowerCase().replace(/_/g, "-")}): ${finding.title.toLowerCase().replace(/[^\w\s-]/g, "")}\``,
    "",
    "Start by analyzing the target files and presenting your proposed solution before applying modifications.",
  ];

  const prompt = lines.join("\n");
  return {
    prompt,
    metadata: {
      tokenEstimate: estimateTokenCount(prompt),
      charCount: prompt.length,
      findingCount: 1,
      failingChecksCount: 0,
      preset,
      scope: "single",
    },
  };
}

/**
 * Generates a comprehensive, repository-wide remediation prompt for AI coding agents
 * (Claude Code, Cursor, Aider, Devin, Roo Code, ChatGPT, Gemini, etc.) to bring the
 * entire repository to 100/100 health.
 */
export function generateRemediationPrompt(
  audit: AuditResult,
  options?: Partial<FixPromptOptions>,
): GeneratedFixPrompt {
  const preset = options?.preset ?? "agent";
  const scope = options?.scope ?? "all";
  const includeChecks = options?.includeDeterministicChecks ?? true;
  const includeSnippets = options?.includeEvidenceSnippets ?? true;
  const preferredRuntime = options?.preferredRuntime;
  const categoryFilter = options?.category;

  // Select the model run to draw findings from
  const run: ModelRunResult | undefined = preferredRuntime
    ? audit.models.find((m) => m.runtime === preferredRuntime)
    : audit.models.find((m) => m.status === "SUCCESS") ?? audit.models[0];

  let rawFindings = run?.verifiedFindings ?? [];

  // Filter by category if requested
  if (categoryFilter && categoryFilter !== "ALL") {
    rawFindings = rawFindings.filter((f) => f.category === categoryFilter);
  }

  // Filter by scope
  let findings = rawFindings;
  if (scope === "critical_high") {
    findings = findings.filter((f) => f.severity === "CRITICAL" || f.severity === "HIGH");
  } else if (scope === "single" && options?.selectedFindingId) {
    findings = findings.filter((f) => f.id === options.selectedFindingId);
  }

  // Sort findings by suggestedPriority (1 = do first) then severity
  const severityWeight: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  findings.sort((a, b) => {
    if (a.suggestedPriority !== b.suggestedPriority) {
      return a.suggestedPriority - b.suggestedPriority;
    }
    return (severityWeight[b.severity] ?? 0) - (severityWeight[a.severity] ?? 0);
  });

  const m = audit.metadata;
  const h = audit.health;
  const failingChecks = h?.checks ? h.checks.filter((c) => c.status === "FAIL" || c.status === "WARN") : [];

  const lines: string[] = [
    `# 🛠️ REPOSITORY REMEDIATION PROMPT & ACTION PLAN`,
    `# Target: ${audit.repo}`,
    "",
    "> **Audit Metadata:**",
    `> - **Repository:** \`${audit.repo}\``,
    `> - **Default Branch:** \`${m?.defaultBranch ?? "main"}\`${m?.headSha ? ` (Commit: \`${m.headSha.slice(0, 7)}\`)` : ""}`,
    `> - **Deterministic Health Score:** **${h ? `${h.overallScore}/100 (Grade ${h.grade})` : "Pending"}**`,
    `> - **Languages:** ${m?.languages && m.languages.length > 0 ? m.languages.map((l) => l.name).join(", ") : "Detected from repo"}`,
    `> - **Audit ID:** \`${audit.auditId}\``,
    `> - **Target AI Tool:** \`${preset.toUpperCase()}\``,
    "",
    "---",
    "",
    ...formatPresetInstructions(preset, audit.repo),
    "",
    "---",
  ];

  // Executive summary & high-level risks
  if (run?.executiveSummary) {
    lines.push(
      "## 📊 AUDIT EXECUTIVE SUMMARY",
      run.executiveSummary,
      "",
    );
  }

  if (run?.architecturalRisks && run.architecturalRisks.length > 0) {
    lines.push(
      "### ⚠️ Architectural Risks Flagged:",
      ...run.architecturalRisks.map((r) => `- ${r}`),
      "",
    );
  }

  if (run?.quickWins && run.quickWins.length > 0) {
    lines.push(
      "### ⚡ Quick Wins (Low-Effort, High-Impact):",
      ...run.quickWins.map((w) => `- ${w}`),
      "",
    );
  }

  // Dimension deficit breakdown
  if (h && h.dimensions.length > 0) {
    const laggingDims = h.dimensions.filter((d) => d.score !== null && d.score < 80);
    if (laggingDims.length > 0) {
      lines.push(
        "### 📉 Health Score Deficits by Dimension:",
        ...laggingDims.map(
          (d) => `- **${d.label}:** ${d.score}/100 (${d.earnedPoints}/${d.possiblePoints} pts, weight: ${d.weightPct}%)`,
        ),
        "",
      );
    }
  }

  // Deterministic checks
  if (includeChecks && h?.checks) {
    const checksSection = formatFailingChecks(h.checks);
    if (checksSection.length > 0) {
      lines.push(...checksSection, "", "---", "");
    }
  }

  // Verified findings section
  lines.push(
    `## 📋 VERIFIED FINDINGS TO RESOLVE (${findings.length} findings, ordered by priority)`,
    "Each finding below has been verified against the actual repository Git tree. Proceed through them systematically:",
    "",
  );

  if (findings.length === 0) {
    lines.push(
      "_No findings match the current filter. If deterministic checks are listed above, focus on remediating those!_",
      "",
    );
  } else {
    findings.forEach((finding, idx) => {
      lines.push(...formatSingleFindingDetails(finding, idx + 1, preset, includeSnippets), "", "---", "");
    });
  }

  // Final summary checklist
  lines.push(
    "## 🏁 COMPLETION & VERIFICATION CHECKLIST",
    "Before considering the remediation complete, verify:",
    "- [ ] All P1 and P2 findings have been addressed with tested code or configurations.",
    "- [ ] Missing governance / CI files (e.g. `.github/workflows/*.yml`, `SECURITY.md`, `LICENSE`, dependabot) have been created in the correct directories.",
    "- [ ] Project build command completes with zero errors.",
    "- [ ] Test suites and linters pass cleanly.",
    "- [ ] Commit history is clean with descriptive, conventional commit messages.",
    "",
    "Please confirm understanding of these requirements and begin by summarizing your execution order.",
  );

  const prompt = lines.join("\n");
  return {
    prompt,
    metadata: {
      tokenEstimate: estimateTokenCount(prompt),
      charCount: prompt.length,
      findingCount: findings.length,
      failingChecksCount: includeChecks ? failingChecks.length : 0,
      preset,
      scope,
    },
  };
}

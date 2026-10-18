import {
  LlmAuditOutputSchema,
  type AuditFinding,
  type HealthReport,
  type LlmAuditOutput,
} from "@reposage/shared";

/* -------------------------------------------------------------------------- */
/*                  Step 1 — JSON extraction & schema validation              */
/* -------------------------------------------------------------------------- */

export type ParseResult = { ok: true; data: LlmAuditOutput } | { ok: false; error: string };

/** Pulls the outermost JSON object out of a model response (tolerates fences / prose). */
export function extractJson(raw: string): unknown {
  const text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
    throw new Error("Response contains no JSON object.");
  }
}

const ENUM_FIELDS = ["category", "severity", "confidence"] as const;

/** Lossless normalization of trivially-wrong enum casing / numeric strings. */
function normalize(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const obj = value as Record<string, unknown>;
  if (Array.isArray(obj.findings)) {
    obj.findings = obj.findings.map((f) => {
      if (!f || typeof f !== "object") return f;
      const finding = { ...(f as Record<string, unknown>) };
      for (const k of ENUM_FIELDS) {
        if (typeof finding[k] === "string") finding[k] = (finding[k] as string).trim().toUpperCase().replace(/[\s/-]+/g, "_");
      }
      if (finding.category === "CI_CD" || finding.category === "CICD") finding.category = "CI_CD";
      if (typeof finding.suggestedPriority === "string" && /^\d+$/.test(finding.suggestedPriority)) {
        finding.suggestedPriority = Number(finding.suggestedPriority);
      }
      return finding;
    });
  }
  return obj;
}

export function parseModelOutput(raw: string): ParseResult {
  let json: unknown;
  try {
    json = extractJson(raw);
  } catch (err) {
    return { ok: false, error: `Invalid JSON: ${(err as Error).message}` };
  }
  const parsed = LlmAuditOutputSchema.safeParse(normalize(json));
  if (parsed.success) return { ok: true, data: parsed.data };
  const issues = parsed.error.issues
    .slice(0, 15)
    .map((i) => `- ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
  return { ok: false, error: issues };
}

/* -------------------------------------------------------------------------- */
/*                Step 2 — Citation & check-ID verification                   */
/* -------------------------------------------------------------------------- */

export interface VerificationOutcome {
  verified: AuditFinding[];
  quarantined: AuditFinding[];
}

export function normalizePath(p: string): string {
  return p.trim().replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "").replace(/\/+$/, "");
}

/**
 * Citation Verifier (FR-VER-01..03). A finding is VERIFIED only if every evidenceRef points at
 * a real path in the Git tree (or REPO_ROOT backed by a real check) and every checkId exists
 * and is not cited against a passing check. Anything else is quarantined.
 */
export function verifyFindings(
  findings: LlmAuditOutput["findings"],
  validTreePaths: Set<string>,
  health: HealthReport,
  idPrefix: string,
): VerificationOutcome {
  const checks = new Map(health.checks.map((c) => [c.checkId, c]));
  const verified: AuditFinding[] = [];
  const quarantined: AuditFinding[] = [];
  const seenIds = new Set<string>();

  findings.forEach((finding, index) => {
    const notes: string[] = [];
    let pathProblem = false;
    let checkProblem = false;

    const refs = finding.evidenceRefs.map((ref) => {
      const filePath = normalizePath(ref.filePath) || "REPO_ROOT";
      const checkId = ref.checkId?.trim() || undefined;
      const isRoot = filePath.toUpperCase() === "REPO_ROOT";

      if (!isRoot && !validTreePaths.has(filePath)) {
        pathProblem = true;
        notes.push(`File path "${filePath}" does not exist in the repository tree.`);
      }
      if (checkId) {
        const check = checks.get(checkId);
        if (!check) {
          checkProblem = true;
          notes.push(`Check ID "${checkId}" is not a deterministic rule.`);
        } else if (check.status === "PASS") {
          checkProblem = true;
          notes.push(`Check "${checkId}" actually PASSED; the finding misrepresents its status.`);
        }
      } else if (isRoot) {
        pathProblem = true;
        notes.push("REPO_ROOT citation without a supporting checkId has no verifiable anchor.");
      }
      return { ...ref, filePath: isRoot ? "REPO_ROOT" : filePath, ...(checkId ? { checkId } : {}) };
    });

    // Guarantee stable, unique, model-scoped IDs for issue creation & consensus.
    const slug = (finding.id || finding.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "finding";
    let id = `${idPrefix}-${slug}`;
    if (seenIds.has(id)) id = `${id}-${index + 1}`;
    seenIds.add(id);

    const status = pathProblem ? "UNVERIFIED_PATH" : checkProblem ? "UNVERIFIED_CHECK" : "VERIFIED";
    const result: AuditFinding = {
      ...finding,
      id,
      evidenceRefs: refs,
      verificationStatus: status,
      ...(notes.length ? { verificationNotes: notes } : {}),
    };
    (status === "VERIFIED" ? verified : quarantined).push(result);
  });

  // Primary plan ordered by priority then severity.
  const sev = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;
  verified.sort((a, b) => a.suggestedPriority - b.suggestedPriority || sev[a.severity] - sev[b.severity]);
  return { verified, quarantined };
}

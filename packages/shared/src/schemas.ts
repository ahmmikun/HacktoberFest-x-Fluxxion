import { z } from "zod";

/* -------------------------------------------------------------------------- */
/*                                 Primitives                                 */
/* -------------------------------------------------------------------------- */

/** NFR-SEC-01: strict owner/repo validation shared by frontend and backend. */
export const REPO_SLUG_REGEX = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;

export const RepoSlugSchema = z
  .string()
  .trim()
  .max(200)
  .regex(REPO_SLUG_REGEX, "Expected repository in 'owner/repo' format");

export const AuditModeSchema = z.enum(["local", "hosted", "compare"]);
export type AuditMode = z.infer<typeof AuditModeSchema>;

/** Deterministic scoring dimensions (FR-DET-02). */
export const ScoreDimensionSchema = z.enum(["CI_CD", "TESTING", "DEPS", "DOCS", "SECURITY", "MAINTENANCE"]);
export type ScoreDimension = z.infer<typeof ScoreDimensionSchema>;

/** Dimension weights as percentages of the overall score (sum = 100). */
export const DIMENSION_WEIGHTS: Record<ScoreDimension, number> = {
  CI_CD: 20,
  TESTING: 20,
  DEPS: 15,
  DOCS: 15,
  SECURITY: 15,
  MAINTENANCE: 15,
};

export const DIMENSION_LABELS: Record<ScoreDimension, string> = {
  CI_CD: "CI/CD & Automation",
  TESTING: "Testing & Quality Gates",
  DEPS: "Dependency Hygiene",
  DOCS: "Documentation & Onboarding",
  SECURITY: "Security & Governance",
  MAINTENANCE: "Maintenance & Velocity",
};

/** FR-DET-03: four possible outcomes for every deterministic check. */
export const CheckStatusSchema = z.enum(["PASS", "WARN", "FAIL", "SKIPPED_INSUFFICIENT_EVIDENCE"]);
export type CheckStatus = z.infer<typeof CheckStatusSchema>;

/* -------------------------------------------------------------------------- */
/*                         Deterministic rule engine                          */
/* -------------------------------------------------------------------------- */

export const RuleEvaluationSchema = z.object({
  checkId: z.string(),
  title: z.string(),
  dimension: ScoreDimensionSchema,
  status: CheckStatusSchema,
  /** Points possible within the dimension. */
  weight: z.number().nonnegative(),
  earnedPoints: z.number().nonnegative(),
  /** Verifiable fact, e.g. ".github/workflows/ci.yml uses actions/checkout@v4". */
  observedEvidence: z.string(),
  filePath: z.string().optional(),
  recommendation: z.string().optional(),
});
export type RuleEvaluation = z.infer<typeof RuleEvaluationSchema>;

export const DimensionScoreSchema = z.object({
  dimension: ScoreDimensionSchema,
  label: z.string(),
  weightPct: z.number(),
  /** 0-100 normalized score for this dimension, null when every check was skipped. */
  score: z.number().nullable(),
  earnedPoints: z.number(),
  possiblePoints: z.number(),
  checks: z.array(z.string()),
});
export type DimensionScore = z.infer<typeof DimensionScoreSchema>;

export const HealthReportSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  grade: z.enum(["A", "B", "C", "D", "F"]),
  dimensions: z.array(DimensionScoreSchema),
  checks: z.array(RuleEvaluationSchema),
  counts: z.object({
    pass: z.number(),
    warn: z.number(),
    fail: z.number(),
    skipped: z.number(),
  }),
  durationMs: z.number(),
});
export type HealthReport = z.infer<typeof HealthReportSchema>;

/* -------------------------------------------------------------------------- */
/*                         Repository evidence model                          */
/* -------------------------------------------------------------------------- */

export const RepoMetadataSchema = z.object({
  nameWithOwner: z.string(),
  description: z.string().nullable(),
  url: z.string(),
  isArchived: z.boolean(),
  isDisabled: z.boolean(),
  isPrivate: z.boolean(),
  isFork: z.boolean(),
  pushedAt: z.string().nullable(),
  lastCommitAt: z.string().nullable(),
  defaultBranch: z.string().nullable(),
  headSha: z.string().nullable(),
  stars: z.number(),
  forks: z.number(),
  license: z.object({ spdxId: z.string().nullable(), name: z.string() }).nullable(),
  languages: z.array(z.object({ name: z.string(), bytes: z.number() })),
  openIssues: z.number(),
  closedIssues: z.number(),
  openPullRequests: z.number(),
  closedPullRequests: z.number(),
  mergedPullRequests: z.number(),
  /** null = not visible to the current session (insufficient evidence). */
  branchProtection: z
    .object({
      requiresApprovingReviews: z.boolean(),
      requiresStatusChecks: z.boolean(),
    })
    .nullable(),
  branchProtectionVisible: z.boolean(),
  hasIssuesEnabled: z.boolean(),
  /** Community health files, including org-level defaults inherited from `<org>/.github`. */
  securityPolicyUrl: z.string().nullable(),
  contributingUrl: z.string().nullable(),
  viewerPermission: z.string().nullable(),
  /** Sample of recent open issues used for triage-health scoring. */
  openIssueSample: z.array(
    z.object({ createdAt: z.string(), labelCount: z.number(), commentCount: z.number() }),
  ),
});
export type RepoMetadata = z.infer<typeof RepoMetadataSchema>;

export const CollectedFileSchema = z.object({
  path: z.string(),
  sizeBytes: z.number(),
  truncated: z.boolean(),
  content: z.string(),
});
export type CollectedFile = z.infer<typeof CollectedFileSchema>;

/* -------------------------------------------------------------------------- */
/*                              Evidence manifest                             */
/* -------------------------------------------------------------------------- */

export const EvidenceManifestSchema = z.object({
  schemaVersion: z.literal(1),
  repo: z.object({
    nameWithOwner: z.string(),
    description: z.string().nullable(),
    defaultBranch: z.string().nullable(),
    headSha: z.string().nullable(),
    isPrivate: z.boolean(),
    isArchived: z.boolean(),
    license: z.string().nullable(),
    languages: z.array(z.string()),
    stars: z.number(),
    openIssues: z.number(),
    openPullRequests: z.number(),
    pushedAt: z.string().nullable(),
  }),
  healthScore: z.number(),
  deterministicResults: z.array(
    z.object({
      checkId: z.string(),
      status: CheckStatusSchema,
      evidence: z.string(),
      filePath: z.string().optional(),
    }),
  ),
  passedCheckIds: z.array(z.string()),
  treeSummary: z.object({
    totalFiles: z.number(),
    topLevel: z.array(z.string()),
    notablePaths: z.array(z.string()),
  }),
  excerpts: z.array(z.object({ path: z.string(), text: z.string() })),
  redactions: z.number(),
});
export type EvidenceManifest = z.infer<typeof EvidenceManifestSchema>;

/* -------------------------------------------------------------------------- */
/*                         Model structured output                            */
/* -------------------------------------------------------------------------- */

export const FindingCategorySchema = z.enum([
  "CI_CD",
  "TESTING",
  "DEPENDENCIES",
  "DOCUMENTATION",
  "SECURITY",
  "MAINTENANCE",
]);
export type FindingCategory = z.infer<typeof FindingCategorySchema>;

export const SeveritySchema = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const VerificationStatusSchema = z.enum(["VERIFIED", "UNVERIFIED_PATH", "UNVERIFIED_CHECK"]);
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

export const EvidenceRefSchema = z.object({
  filePath: z.string().describe("Exact relative path in repository tree, or 'REPO_ROOT'"),
  checkId: z.string().optional().describe("ID of the deterministic check supporting this finding"),
  snippetQuote: z.string().max(240).optional().describe("Short verbatim fact from the evidence"),
});
export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;

export const AuditFindingSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: FindingCategorySchema,
  severity: SeveritySchema,
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
  impact: z.string(),
  remediationSteps: z.array(z.string()).min(1),
  suggestedPriority: z.number().int().min(1).max(5),
  evidenceRefs: z.array(EvidenceRefSchema).min(1),
  verificationStatus: VerificationStatusSchema.optional(),
  verificationNotes: z.array(z.string()).optional(),
});
export type AuditFinding = z.infer<typeof AuditFindingSchema>;

export const ModelAuditOutputSchema = z.object({
  executiveSummary: z.string(),
  architecturalRisks: z.array(z.string()),
  findings: z.array(AuditFindingSchema),
  quickWins: z.array(z.string()),
});
export type ModelAuditOutput = z.infer<typeof ModelAuditOutputSchema>;

/** Schema the model is asked to produce (verification fields are backend-owned). */
export const LlmFindingSchema = AuditFindingSchema.omit({ verificationStatus: true, verificationNotes: true });
export const LlmAuditOutputSchema = z.object({
  executiveSummary: z.string(),
  architecturalRisks: z.array(z.string()),
  findings: z.array(LlmFindingSchema),
  quickWins: z.array(z.string()),
});
export type LlmAuditOutput = z.infer<typeof LlmAuditOutputSchema>;

export const ModelRuntimeSchema = z.enum(["OLLAMA_LOCAL", "GOOGLE_AI_STUDIO"]);
export type ModelRuntime = z.infer<typeof ModelRuntimeSchema>;

export const ModelTelemetrySchema = z.object({
  modelId: z.string(),
  runtime: ModelRuntimeSchema,
  latencyMs: z.number(),
  schemaValidFirstTry: z.boolean(),
  repairAttempted: z.boolean(),
  totalFindings: z.number(),
  verifiedFindingsCount: z.number(),
  unsupportedClaimsCount: z.number(),
  citationAccuracyPct: z.number(),
  manifestSha256: z.string(),
});
export type ModelTelemetry = z.infer<typeof ModelTelemetrySchema>;

export const ModelRunResultSchema = z.object({
  runtime: ModelRuntimeSchema,
  modelId: z.string(),
  status: z.enum(["SUCCESS", "DEGRADED", "FAILED"]),
  error: z.string().optional(),
  telemetry: ModelTelemetrySchema.nullable(),
  executiveSummary: z.string().nullable(),
  architecturalRisks: z.array(z.string()),
  quickWins: z.array(z.string()),
  verifiedFindings: z.array(AuditFindingSchema),
  quarantinedFindings: z.array(AuditFindingSchema),
});
export type ModelRunResult = z.infer<typeof ModelRunResultSchema>;

export const ConsensusEntrySchema = z.object({
  key: z.string(),
  title: z.string(),
  category: FindingCategorySchema,
  agreement: z.enum(["BOTH", "LOCAL_ONLY", "HOSTED_ONLY"]),
  localFindingId: z.string().optional(),
  hostedFindingId: z.string().optional(),
  localSeverity: SeveritySchema.optional(),
  hostedSeverity: SeveritySchema.optional(),
});
export type ConsensusEntry = z.infer<typeof ConsensusEntrySchema>;

/* -------------------------------------------------------------------------- */
/*                         Audit session & streaming                          */
/* -------------------------------------------------------------------------- */

export const AuditStageSchema = z.enum([
  "QUEUED",
  "AUTH_CHECK",
  "COLLECTING",
  "DETERMINISTIC_DONE",
  "COMPILING",
  "AI_INFERENCE",
  "VERIFIED",
  "COMPLETE",
  "ERROR",
]);
export type AuditStage = z.infer<typeof AuditStageSchema>;

export const AuditResultSchema = z.object({
  auditId: z.string(),
  repo: z.string(),
  mode: AuditModeSchema,
  createdAt: z.string(),
  completedAt: z.string().nullable(),
  metadata: RepoMetadataSchema.nullable(),
  health: HealthReportSchema.nullable(),
  manifestSha256: z.string().nullable(),
  manifestTokenEstimate: z.number().nullable(),
  models: z.array(ModelRunResultSchema),
  consensus: z.array(ConsensusEntrySchema),
  treeFileCount: z.number().nullable(),
  treeTruncated: z.boolean(),
  error: z.string().optional(),
});
export type AuditResult = z.infer<typeof AuditResultSchema>;

export const AuditStageEventSchema = z.object({
  type: z.literal("stage"),
  auditId: z.string(),
  stage: AuditStageSchema,
  message: z.string(),
  elapsedMs: z.number(),
  timestamp: z.string(),
  detail: z.record(z.unknown()).optional(),
});
export type AuditStageEvent = z.infer<typeof AuditStageEventSchema>;

export const CreateAuditRequestSchema = z.object({
  repo: RepoSlugSchema,
  mode: AuditModeSchema,
});
export type CreateAuditRequest = z.infer<typeof CreateAuditRequestSchema>;

export const CreateAuditResponseSchema = z.object({ auditId: z.string() });
export type CreateAuditResponse = z.infer<typeof CreateAuditResponseSchema>;

/* -------------------------------------------------------------------------- */
/*                            System & repositories                           */
/* -------------------------------------------------------------------------- */

export const PreflightResponseSchema = z.object({
  gh: z.object({
    installed: z.boolean(),
    authenticated: z.boolean(),
    username: z.string().optional(),
    scopes: z.array(z.string()).optional(),
    error: z.string().optional(),
  }),
  ollama: z.object({
    reachable: z.boolean(),
    baseUrl: z.string(),
    model: z.string(),
    modelAvailable: z.boolean(),
    error: z.string().optional(),
  }),
  googleAiStudio: z.object({
    configured: z.boolean(),
    model: z.string(),
  }),
  checkedAt: z.string(),
});
export type PreflightResponse = z.infer<typeof PreflightResponseSchema>;

export const RepoSummarySchema = z.object({
  nameWithOwner: z.string(),
  description: z.string().nullable(),
  isPrivate: z.boolean(),
  isArchived: z.boolean(),
  isFork: z.boolean(),
  stars: z.number(),
  primaryLanguage: z.string().nullable(),
  pushedAt: z.string().nullable(),
  url: z.string(),
});
export type RepoSummary = z.infer<typeof RepoSummarySchema>;

export const RepoListResponseSchema = z.object({
  repos: z.array(RepoSummarySchema),
  pageInfo: z.object({ hasNextPage: z.boolean(), endCursor: z.string().nullable() }),
  totalCount: z.number(),
});
export type RepoListResponse = z.infer<typeof RepoListResponseSchema>;

export const CreateIssueRequestSchema = z.object({
  auditId: z.string().min(1).max(100),
  modelRuntime: ModelRuntimeSchema,
  findingId: z.string().min(1).max(200),
  /** Explicit user confirmation (FR-ACT-03). */
  confirm: z.literal(true),
});
export type CreateIssueRequest = z.infer<typeof CreateIssueRequestSchema>;

export const CreateIssueResponseSchema = z.object({ issueUrl: z.string() });
export type CreateIssueResponse = z.infer<typeof CreateIssueResponseSchema>;

export const ApiErrorSchema = z.object({
  error: z.string(),
  details: z.unknown().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

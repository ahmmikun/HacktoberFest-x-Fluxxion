import YAML from "yaml";
import {
  DIMENSION_LABELS,
  DIMENSION_WEIGHTS,
  ScoreDimensionSchema,
  type CheckStatus,
  type CollectedFile,
  type DimensionScore,
  type HealthReport,
  type RepoMetadata,
  type RuleEvaluation,
  type ScoreDimension,
} from "@reposage/shared";
import type { TreeBlob } from "./collector.js";

/** Pure input for the rule engine — no network access happens here (FR-DET-01). */
export interface DeterministicInput {
  metadata: RepoMetadata;
  blobs: TreeBlob[];
  files: Map<string, CollectedFile>;
  treeAvailable: boolean;
  treeTruncated: boolean;
  now?: Date;
}

type Draft = Omit<RuleEvaluation, "earnedPoints" | "weight" | "dimension" | "checkId" | "title"> & {
  /** 0..1 share of the weight earned for WARN results (default 0.5). */
  partial?: number;
};

interface RuleDef {
  checkId: string;
  title: string;
  dimension: ScoreDimension;
  weight: number;
  evaluate: (ctx: RuleContext) => Draft;
}

const SKIP = "SKIPPED_INSUFFICIENT_EVIDENCE" as const;

/* -------------------------------------------------------------------------- */
/*                                Rule context                                */
/* -------------------------------------------------------------------------- */

interface WorkflowInfo {
  path: string;
  parsed: boolean;
  hasTopLevelPermissions: boolean;
  jobCount: number;
  jobsWithPermissions: number;
  uses: string[];
}

class RuleContext {
  readonly paths: string[];
  readonly pathSet: Set<string>;
  readonly lowerRootFiles: Map<string, string>;
  readonly workflows: WorkflowInfo[];
  readonly packageJson: Record<string, unknown> | null;

  constructor(readonly input: DeterministicInput) {
    this.paths = input.blobs.map((b) => b.path);
    this.pathSet = new Set(this.paths);
    this.lowerRootFiles = new Map(this.paths.filter((p) => !p.includes("/")).map((p) => [p.toLowerCase(), p]));
    this.packageJson = this.parsePackageJson();
    this.workflows = this.paths
      .filter((p) => /^\.github\/workflows\/[^/]+\.ya?ml$/i.test(p))
      .map((p) => this.parseWorkflow(p));
  }

  get meta() {
    return this.input.metadata;
  }

  content(path: string): string | null {
    const f = this.input.files.get(path);
    return f && f.content ? f.content : null;
  }

  /** Case-insensitive lookup of a root-level file. */
  root(...names: string[]): string | null {
    for (const n of names) {
      const hit = this.lowerRootFiles.get(n.toLowerCase());
      if (hit) return hit;
    }
    return null;
  }

  find(pred: (p: string) => boolean): string | undefined {
    return this.paths.find(pred);
  }

  findInDocsDirs(pattern: RegExp): string | undefined {
    return this.paths.find((p) => {
      const parts = p.split("/");
      const name = parts.pop()!;
      const d = parts.join("/");
      return ["", ".github", "docs"].includes(d) && pattern.test(name);
    });
  }

  private parsePackageJson(): Record<string, unknown> | null {
    const raw = this.content("package.json");
    if (!raw) return null;
    try {
      const v = JSON.parse(raw);
      return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }

  private parseWorkflow(path: string): WorkflowInfo {
    const info: WorkflowInfo = {
      path,
      parsed: false,
      hasTopLevelPermissions: false,
      jobCount: 0,
      jobsWithPermissions: 0,
      uses: [],
    };
    const raw = this.content(path);
    if (!raw) return info;
    try {
      const doc = YAML.parse(raw) as Record<string, unknown> | null;
      if (!doc || typeof doc !== "object") return info;
      info.parsed = true;
      info.hasTopLevelPermissions = "permissions" in doc;
      const jobs = (doc.jobs ?? {}) as Record<string, Record<string, unknown>>;
      for (const job of Object.values(jobs)) {
        if (!job || typeof job !== "object") continue;
        info.jobCount++;
        if ("permissions" in job) info.jobsWithPermissions++;
        if (typeof job.uses === "string") info.uses.push(job.uses);
        const steps = Array.isArray(job.steps) ? job.steps : [];
        for (const step of steps) {
          if (step && typeof step === "object" && typeof (step as { uses?: unknown }).uses === "string") {
            info.uses.push((step as { uses: string }).uses);
          }
        }
      }
    } catch {
      info.parsed = false;
    }
    return info;
  }

  dependencyNames(): Set<string> {
    const pj = this.packageJson;
    const names = new Set<string>();
    if (!pj) return names;
    for (const key of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
      const deps = pj[key];
      if (deps && typeof deps === "object") Object.keys(deps as object).forEach((d) => names.add(d));
    }
    return names;
  }
}

/* -------------------------------------------------------------------------- */
/*                                   Rules                                    */
/* -------------------------------------------------------------------------- */

const SHA_PIN = /@[0-9a-f]{40}$/i;
const JS_TEST_RUNNERS = ["jest", "vitest", "mocha", "ava", "jasmine", "tap", "uvu", "@playwright/test", "cypress", "karma", "@testing-library/react", "node:test"];
const LOCKFILES = ["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lockb", "bun.lock", "npm-shrinkwrap.json", "poetry.lock", "Pipfile.lock", "uv.lock", "pdm.lock", "Cargo.lock", "go.sum", "Gemfile.lock", "composer.lock"];
const MANIFESTS = ["package.json", "requirements.txt", "pyproject.toml", "Pipfile", "setup.py", "setup.cfg", "Cargo.toml", "go.mod", "pom.xml", "build.gradle", "build.gradle.kts", "Gemfile", "composer.json"];
const TEST_FILE = /(^|\/)([^/]+\.(test|spec)\.[a-z0-9]+|test_[^/]+\.py|[^/]+_test\.(py|go)|[^/]+Test\.(java|kt)|[^/]+_spec\.rb)$/i;
const TEST_DIR = /(^|\/)(tests?|__tests__|spec)\//i;
const SECRET_FILE = /(^|\/)(\.env(\.[a-z0-9_-]+)?|id_(rsa|dsa|ecdsa|ed25519)|[^/]+\.(pem|p12|pfx|key|keystore|jks)|credentials\.json|service[-_]account[^/]*\.json|\.pypirc)$/i;
const SECRET_FILE_ALLOW = /\.(example|sample|template|dist|defaults?)$|(^|\/)\.env\.(example|sample|template)$|\.pub$/i;

const daysSince = (iso: string | null, now: Date) =>
  iso ? Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000) : null;

const list = (items: string[], max = 3) =>
  items.length <= max ? items.join(", ") : `${items.slice(0, max).join(", ")} (+${items.length - max} more)`;

export const RULES: RuleDef[] = [
  /* ------------------------------ CI/CD (20) ------------------------------ */
  {
    checkId: "CI_WORKFLOWS_PRESENT",
    title: "CI workflows exist",
    dimension: "CI_CD",
    weight: 8,
    evaluate: (c) => {
      if (!c.input.treeAvailable) return { status: SKIP, observedEvidence: "Git tree unavailable (empty repository?)." };
      if (c.workflows.length > 0) {
        return {
          status: "PASS",
          observedEvidence: `${c.workflows.length} GitHub Actions workflow(s): ${list(c.workflows.map((w) => w.path))}.`,
          filePath: c.workflows[0]!.path,
        };
      }
      const other = c.find((p) => /^(\.gitlab-ci\.yml|\.circleci\/config\.ya?ml|azure-pipelines\.ya?ml|\.travis\.yml|Jenkinsfile)$/i.test(p));
      if (other) return { status: "WARN", partial: 0.75, observedEvidence: `No GitHub Actions workflows; external CI config found at ${other}.`, filePath: other };
      return { status: "FAIL", observedEvidence: "No .github/workflows/*.yml files or other CI configuration found.", recommendation: "Add a CI workflow that installs, builds and tests on every pull request." };
    },
  },
  {
    checkId: "CI_IMMUTABLE_SHA_PINNING",
    title: "Third-party actions pinned to commit SHAs",
    dimension: "CI_CD",
    weight: 7,
    evaluate: (c) => {
      const parsed = c.workflows.filter((w) => w.parsed);
      if (parsed.length === 0) return { status: SKIP, observedEvidence: "No parseable workflow files to inspect." };
      const external = parsed.flatMap((w) =>
        w.uses.filter((u) => !u.startsWith("./") && !u.startsWith("docker://")).map((u) => ({ u, path: w.path })),
      );
      if (external.length === 0) return { status: SKIP, observedEvidence: "Workflows reference no external actions." };
      const unpinned = external.filter((x) => !SHA_PIN.test(x.u));
      if (unpinned.length === 0) {
        return { status: "PASS", observedEvidence: `All ${external.length} external action references are pinned to 40-char commit SHAs.` };
      }
      const pinnedRatio = (external.length - unpinned.length) / external.length;
      const sample = unpinned[0]!;
      return {
        status: pinnedRatio > 0 ? "WARN" : "FAIL",
        partial: pinnedRatio,
        observedEvidence: `${unpinned.length}/${external.length} action references use mutable tags, e.g. ${sample.path} uses ${sample.u}.`,
        filePath: sample.path,
        recommendation: "Pin every third-party action to a full commit SHA (keep the tag as a trailing comment) and let Dependabot bump them.",
      };
    },
  },
  {
    checkId: "CI_EXPLICIT_PERMISSIONS",
    title: "Workflows declare explicit token permissions",
    dimension: "CI_CD",
    weight: 5,
    evaluate: (c) => {
      const parsed = c.workflows.filter((w) => w.parsed);
      if (parsed.length === 0) return { status: SKIP, observedEvidence: "No parseable workflow files to inspect." };
      const scoped = parsed.filter((w) => w.hasTopLevelPermissions || (w.jobCount > 0 && w.jobsWithPermissions === w.jobCount));
      const missing = parsed.filter((w) => !scoped.includes(w));
      if (missing.length === 0) return { status: "PASS", observedEvidence: `All ${parsed.length} workflow(s) declare a permissions: block.` };
      return {
        status: scoped.length > 0 ? "WARN" : "FAIL",
        partial: scoped.length / parsed.length,
        observedEvidence: `${missing.length}/${parsed.length} workflow(s) lack a permissions: block: ${list(missing.map((w) => w.path))}.`,
        filePath: missing[0]!.path,
        recommendation: "Add `permissions: contents: read` at the top of each workflow and grant write scopes per job only where needed.",
      };
    },
  },

  /* ----------------------------- TESTING (20) ----------------------------- */
  {
    checkId: "TEST_RUNNER_DEPENDENCY",
    title: "Test runner declared",
    dimension: "TESTING",
    weight: 5,
    evaluate: (c) => {
      const deps = c.dependencyNames();
      const js = JS_TEST_RUNNERS.filter((r) => deps.has(r));
      if (js.length) return { status: "PASS", observedEvidence: `package.json declares test runner(s): ${js.join(", ")}.`, filePath: "package.json" };
      const pyFiles = ["requirements.txt", "requirements-dev.txt", "pyproject.toml", "setup.cfg", "Pipfile", "tox.ini"]
        .map((f) => ({ f, text: c.content(f) }))
        .filter((x) => x.text && /\b(pytest|nose2?|unittest2?|hypothesis)\b/i.test(x.text));
      if (pyFiles.length) return { status: "PASS", observedEvidence: `Python test runner referenced in ${pyFiles[0]!.f}.`, filePath: pyFiles[0]!.f };
      if (c.root("go.mod")) return { status: "PASS", observedEvidence: "Go module uses the built-in `go test` runner.", filePath: "go.mod" };
      if (c.root("Cargo.toml")) return { status: "PASS", observedEvidence: "Rust crate uses the built-in `cargo test` runner.", filePath: "Cargo.toml" };
      const pjScript = (c.packageJson?.scripts as Record<string, string> | undefined)?.test ?? "";
      if (/node\s+--test/.test(pjScript)) return { status: "PASS", observedEvidence: "package.json test script uses the built-in node --test runner.", filePath: "package.json" };
      const manifest = MANIFESTS.find((m) => c.root(m));
      if (!manifest) return { status: SKIP, observedEvidence: "No recognised dependency manifest to inspect for a test runner." };
      return { status: "FAIL", observedEvidence: `No test runner dependency found in ${manifest}.`, filePath: manifest, recommendation: "Add a test framework (e.g. Vitest, Jest or pytest) as a development dependency." };
    },
  },
  {
    checkId: "TEST_CONFIG_PRESENT",
    title: "Test configuration present",
    dimension: "TESTING",
    weight: 4,
    evaluate: (c) => {
      if (!c.input.treeAvailable) return { status: SKIP, observedEvidence: "Git tree unavailable." };
      const cfg = c.find((p) =>
        /(^|\/)((vitest|jest|playwright|cypress|karma)\.config\.[cm]?[jt]s|jest\.config\.json|pytest\.ini|tox\.ini|conftest\.py|\.mocharc\.(json|ya?ml|[cm]?js)|phpunit\.xml(\.dist)?)$/i.test(p),
      );
      if (cfg) return { status: "PASS", observedEvidence: `Test configuration found at ${cfg}.`, filePath: cfg };
      const pyproject = c.content("pyproject.toml");
      if (pyproject && /\[tool\.pytest/.test(pyproject)) return { status: "PASS", observedEvidence: "pyproject.toml contains a [tool.pytest] section.", filePath: "pyproject.toml" };
      if (c.packageJson && ("jest" in c.packageJson || "vitest" in c.packageJson)) return { status: "PASS", observedEvidence: "package.json embeds test runner configuration.", filePath: "package.json" };
      if (c.root("go.mod") || c.root("Cargo.toml")) return { status: "PASS", observedEvidence: "Language toolchain test runner needs no separate config." };
      return { status: "FAIL", observedEvidence: "No test runner configuration file found.", recommendation: "Commit a test runner configuration (e.g. vitest.config.ts or pytest.ini)." };
    },
  },
  {
    checkId: "TEST_FILES_PRESENT",
    title: "Test files exist in the tree",
    dimension: "TESTING",
    weight: 7,
    evaluate: (c) => {
      if (!c.input.treeAvailable) return { status: SKIP, observedEvidence: "Git tree unavailable." };
      const tests = c.paths.filter((p) => TEST_FILE.test(p) || (TEST_DIR.test(p) && /\.(js|ts|tsx|jsx|py|go|rs|rb|java|kt|php|cs)$/i.test(p)));
      if (tests.length >= 3) return { status: "PASS", observedEvidence: `${tests.length} test file(s) found, e.g. ${list(tests, 2)}.`, filePath: tests[0] };
      if (tests.length > 0) return { status: "WARN", observedEvidence: `Only ${tests.length} test file(s) found: ${list(tests)}.`, filePath: tests[0], recommendation: "Expand automated test coverage for core modules." };
      const note = c.input.treeTruncated ? " (tree listing was truncated)" : "";
      return { status: c.input.treeTruncated ? "WARN" : "FAIL", observedEvidence: `No *.test.*, *.spec.*, test_*.py or tests/ files found${note}.`, recommendation: "Add unit tests alongside the source code." };
    },
  },
  {
    checkId: "TEST_SCRIPT_DEFINED",
    title: "Test command defined",
    dimension: "TESTING",
    weight: 4,
    evaluate: (c) => {
      const pj = c.packageJson;
      if (pj) {
        const script = (pj.scripts as Record<string, string> | undefined)?.test;
        if (script && !/no test specified/i.test(script)) return { status: "PASS", observedEvidence: `package.json scripts.test = "${script.slice(0, 80)}".`, filePath: "package.json" };
        return { status: "FAIL", observedEvidence: script ? "package.json test script is the npm placeholder that exits 1." : "package.json has no scripts.test entry.", filePath: "package.json", recommendation: "Define `npm test` so contributors and CI share one test entrypoint." };
      }
      const make = c.root("Makefile");
      if (make && /^test:/m.test(c.content(make) ?? "")) return { status: "PASS", observedEvidence: "Makefile defines a `test` target.", filePath: make };
      if (c.workflows.some((w) => /\b(pytest|go test|cargo test|npm test|pnpm test|yarn test|mvn test|gradle test)\b/.test(c.content(w.path) ?? ""))) {
        const wf = c.workflows.find((w) => /\b(pytest|go test|cargo test|npm test|pnpm test|yarn test|mvn test|gradle test)\b/.test(c.content(w.path) ?? ""))!;
        return { status: "PASS", observedEvidence: `CI workflow ${wf.path} runs the test suite.`, filePath: wf.path };
      }
      if (c.root("go.mod") || c.root("Cargo.toml")) return { status: "PASS", observedEvidence: "Toolchain provides a standard test command." };
      return { status: SKIP, observedEvidence: "No package.json, Makefile test target or CI test step to inspect." };
    },
  },

  /* ------------------------------- DEPS (15) ------------------------------ */
  {
    checkId: "DEPS_MANIFEST_PRESENT",
    title: "Dependency manifest present",
    dimension: "DEPS",
    weight: 5,
    evaluate: (c) => {
      if (!c.input.treeAvailable) return { status: SKIP, observedEvidence: "Git tree unavailable." };
      const found = MANIFESTS.map((m) => c.root(m)).filter((x): x is string => Boolean(x));
      if (found.length) return { status: "PASS", observedEvidence: `Dependency manifest(s): ${found.join(", ")}.`, filePath: found[0] };
      const nested = c.find((p) => MANIFESTS.includes(p.split("/").pop()!));
      if (nested) return { status: "WARN", partial: 0.6, observedEvidence: `No root manifest; nested manifest at ${nested}.`, filePath: nested };
      return { status: "FAIL", observedEvidence: "No dependency manifest found.", recommendation: "Declare dependencies in a manifest (package.json, pyproject.toml, go.mod, ...)." };
    },
  },
  {
    checkId: "DEPS_LOCKFILE_COMMITTED",
    title: "Lockfile committed / versions pinned",
    dimension: "DEPS",
    weight: 5,
    evaluate: (c) => {
      const manifests = MANIFESTS.filter((m) => c.root(m));
      if (manifests.length === 0) return { status: SKIP, observedEvidence: "No dependency manifest, so no lockfile is expected." };
      const lock = LOCKFILES.map((l) => c.root(l)).find(Boolean);
      if (lock) return { status: "PASS", observedEvidence: `Lockfile committed: ${lock}.`, filePath: lock };
      const req = c.content("requirements.txt");
      if (req && manifests.length === 1) {
        const lines = req.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#") && !l.startsWith("-"));
        const pinned = lines.filter((l) => /==/.test(l));
        if (lines.length && pinned.length === lines.length) return { status: "PASS", observedEvidence: `requirements.txt pins all ${lines.length} dependencies with ==.`, filePath: "requirements.txt" };
        return { status: "WARN", partial: lines.length ? pinned.length / lines.length : 0, observedEvidence: `requirements.txt pins ${pinned.length}/${lines.length} dependencies exactly and no lockfile is committed.`, filePath: "requirements.txt", recommendation: "Pin exact versions or adopt a lockfile tool (pip-tools, uv, Poetry)." };
      }
      return { status: "FAIL", observedEvidence: `${manifests.join(", ")} present but no lockfile is committed.`, filePath: manifests[0], recommendation: "Commit the package manager lockfile for reproducible installs." };
    },
  },
  {
    checkId: "DEPS_AUTOMATED_UPDATES",
    title: "Automated dependency updates configured",
    dimension: "DEPS",
    weight: 5,
    evaluate: (c) => {
      if (!c.input.treeAvailable) return { status: SKIP, observedEvidence: "Git tree unavailable." };
      const cfg = c.find((p) => /^(\.github\/)?(dependabot\.ya?ml|renovate\.json5?|\.renovaterc(\.json)?)$/i.test(p) || p === ".gitlab/renovate.json");
      if (cfg) return { status: "PASS", observedEvidence: `Dependency update automation configured at ${cfg}.`, filePath: cfg };
      return { status: "FAIL", observedEvidence: "No dependabot.yml or renovate.json found.", recommendation: "Add .github/dependabot.yml covering your package ecosystem and github-actions." };
    },
  },

  /* ------------------------------- DOCS (15) ------------------------------ */
  {
    checkId: "DOCS_README_PRESENT",
    title: "README present",
    dimension: "DOCS",
    weight: 4,
    evaluate: (c) => {
      if (!c.input.treeAvailable) return { status: SKIP, observedEvidence: "Git tree unavailable." };
      const readme = c.root("README.md", "README.markdown", "README.rst", "README.txt", "README");
      if (!readme) return { status: "FAIL", observedEvidence: "No README at the repository root.", recommendation: "Add a README.md describing purpose, setup and usage." };
      const size = c.input.blobs.find((b) => b.path === readme)?.size ?? 0;
      if (size < 300) return { status: "WARN", observedEvidence: `${readme} is only ${size} bytes.`, filePath: readme, recommendation: "Expand the README beyond a stub." };
      return { status: "PASS", observedEvidence: `${readme} present (${size} bytes).`, filePath: readme };
    },
  },
  {
    checkId: "DOCS_README_SECTIONS",
    title: "README covers install, usage and configuration",
    dimension: "DOCS",
    weight: 5,
    evaluate: (c) => {
      const readme = c.root("README.md", "README.markdown", "README.rst", "README.txt", "README");
      const text = readme ? c.content(readme) : null;
      if (!readme || !text) return { status: SKIP, observedEvidence: "README content unavailable." };
      const sections = {
        installation: /(^|\n)\s*(#+|=+|\*\*)?\s*.*\b(install(ation|ing)?|getting started|setup|quick ?start)\b/i,
        usage: /(^|\n)\s*(#+|=+|\*\*)?\s*.*\b(usage|how to use|examples?|running|run locally)\b/i,
        configuration: /\b(environment variables?|\.env|configuration|config(ure)?|settings)\b/i,
      };
      const present = Object.entries(sections).filter(([, re]) => re.test(text)).map(([k]) => k);
      const missing = Object.keys(sections).filter((k) => !present.includes(k));
      if (missing.length === 0) return { status: "PASS", observedEvidence: `${readme} covers installation, usage and configuration.`, filePath: readme };
      return {
        status: present.length > 0 ? "WARN" : "FAIL",
        partial: present.length / 3,
        observedEvidence: `${readme} is missing: ${missing.join(", ")}.`,
        filePath: readme,
        recommendation: `Add README sections for ${missing.join(", ")}.`,
      };
    },
  },
  {
    checkId: "DOCS_ENV_EXAMPLE",
    title: ".env template provided when .env is used",
    dimension: "DOCS",
    weight: 3,
    evaluate: (c) => {
      if (!c.input.treeAvailable) return { status: SKIP, observedEvidence: "Git tree unavailable." };
      const template = c.find((p) => /(^|\/)\.env\.(example|sample|template|dist)$/i.test(p));
      const readme = c.root("README.md") ? c.content(c.root("README.md")!) : null;
      const referenced =
        c.dependencyNames().has("dotenv") ||
        /(^|\n)\s*\.env\b/m.test(c.content(".gitignore") ?? "") ||
        /\.env\b/.test(readme ?? "") ||
        /python-dotenv|django-environ|pydantic-settings/i.test(`${c.content("requirements.txt") ?? ""}${c.content("pyproject.toml") ?? ""}`);
      if (template) return { status: "PASS", observedEvidence: `Environment template present at ${template}.`, filePath: template };
      if (!referenced) return { status: SKIP, observedEvidence: "No .env usage detected; check not applicable." };
      return { status: "FAIL", observedEvidence: ".env is referenced (dotenv dependency, README or .gitignore) but no .env.example is committed.", recommendation: "Commit a .env.example listing every required variable with placeholder values." };
    },
  },
  {
    checkId: "DOCS_CONTRIBUTING",
    title: "Contribution guide present",
    dimension: "DOCS",
    weight: 3,
    evaluate: (c) => {
      if (!c.input.treeAvailable) return { status: SKIP, observedEvidence: "Git tree unavailable." };
      const f = c.findInDocsDirs(/^contributing(\.(md|rst|txt))?$/i);
      if (f) return { status: "PASS", observedEvidence: `Contribution guide at ${f}.`, filePath: f };
      if (c.meta.contributingUrl) return { status: "PASS", observedEvidence: `Contribution guide inherited from organization defaults (${c.meta.contributingUrl}).` };
      return { status: "FAIL", observedEvidence: "No CONTRIBUTING.md in root, .github/ or docs/.", recommendation: "Add CONTRIBUTING.md covering dev setup, branching and PR expectations." };
    },
  },

  /* ----------------------------- SECURITY (15) ---------------------------- */
  {
    checkId: "SEC_LICENSE_VALID",
    title: "Recognised open-source license",
    dimension: "SECURITY",
    weight: 3,
    evaluate: (c) => {
      const lic = c.meta.license;
      const file = c.root("LICENSE", "LICENSE.md", "LICENSE.txt", "LICENCE", "LICENCE.md", "COPYING");
      if (lic?.spdxId && lic.spdxId !== "NOASSERTION") return { status: "PASS", observedEvidence: `GitHub detects license ${lic.spdxId} (${lic.name}).`, filePath: file ?? undefined };
      if (file) return { status: "WARN", observedEvidence: `${file} exists but GitHub could not identify a standard SPDX license.`, filePath: file, recommendation: "Use an unmodified SPDX license text so tooling can detect it." };
      if (c.meta.isPrivate) return { status: SKIP, observedEvidence: "Private repository without a LICENSE file; licensing may be intentionally proprietary." };
      return { status: "FAIL", observedEvidence: "No LICENSE file and no detected license.", recommendation: "Add a LICENSE file so others know how the code may be used." };
    },
  },
  {
    checkId: "SEC_SECURITY_POLICY",
    title: "Security policy present",
    dimension: "SECURITY",
    weight: 3,
    evaluate: (c) => {
      if (!c.input.treeAvailable) return { status: SKIP, observedEvidence: "Git tree unavailable." };
      const f = c.findInDocsDirs(/^security(\.(md|rst|txt))?$/i);
      if (f) return { status: "PASS", observedEvidence: `Security policy at ${f}.`, filePath: f };
      if (c.meta.securityPolicyUrl) return { status: "PASS", observedEvidence: `Security policy inherited from organization defaults (${c.meta.securityPolicyUrl}).` };
      return { status: "FAIL", observedEvidence: "No SECURITY.md in root, .github/ or docs/.", recommendation: "Add SECURITY.md describing supported versions and private vulnerability reporting." };
    },
  },
  {
    checkId: "SEC_GITIGNORE_SECRETS",
    title: ".gitignore excludes secrets",
    dimension: "SECURITY",
    weight: 2,
    evaluate: (c) => {
      if (!c.input.treeAvailable) return { status: SKIP, observedEvidence: "Git tree unavailable." };
      if (!c.root(".gitignore")) return { status: "FAIL", observedEvidence: "No root .gitignore file.", recommendation: "Add a .gitignore that excludes .env files, keys and build output." };
      const text = c.content(".gitignore");
      if (text === null) return { status: SKIP, observedEvidence: ".gitignore content could not be fetched." };
      const lines = text.split(/\r?\n/).map((l) => l.trim());
      const env = lines.some((l) => /^\/?(\*\*\/)?(\.env(\*|\..*|\.\*)?|\*\.env|\.env\*?)$/.test(l));
      const keys = lines.some((l) => /\*\.(pem|key|p12|pfx)$|id_rsa|secrets?/i.test(l));
      if (env && keys) return { status: "PASS", observedEvidence: ".gitignore excludes .env files and key material.", filePath: ".gitignore" };
      if (env) return { status: "PASS", observedEvidence: ".gitignore excludes .env files.", filePath: ".gitignore" };
      return { status: "WARN", partial: keys ? 0.5 : 0.25, observedEvidence: ".gitignore does not exclude .env files.", filePath: ".gitignore", recommendation: "Add `.env` and `.env.*` (with `!.env.example`) to .gitignore." };
    },
  },
  {
    checkId: "SEC_NO_TRACKED_SECRETS",
    title: "No tracked .env or private key files",
    dimension: "SECURITY",
    weight: 4,
    evaluate: (c) => {
      if (!c.input.treeAvailable) return { status: SKIP, observedEvidence: "Git tree unavailable." };
      const hits = c.paths.filter((p) => SECRET_FILE.test(p) && !SECRET_FILE_ALLOW.test(p));
      if (hits.length) {
        return {
          status: "FAIL",
          observedEvidence: `Potential secret files tracked in Git: ${list(hits)}.`,
          filePath: hits[0],
          recommendation: "Remove these files from history (git filter-repo), rotate any exposed credentials and ignore them.",
        };
      }
      const note = c.input.treeTruncated ? " (tree listing truncated; partial scan)" : "";
      return { status: c.input.treeTruncated ? "WARN" : "PASS", partial: 0.75, observedEvidence: `No .env, private key or credential files tracked in ${c.paths.length} files${note}.` };
    },
  },
  {
    checkId: "SEC_BRANCH_PROTECTION",
    title: "Default branch protected",
    dimension: "SECURITY",
    weight: 3,
    evaluate: (c) => {
      if (!c.meta.defaultBranch) return { status: SKIP, observedEvidence: "Repository has no default branch." };
      const bp = c.meta.branchProtection;
      if (!c.meta.branchProtectionVisible) return { status: SKIP, observedEvidence: `Branch protection is not visible with ${c.meta.viewerPermission ?? "current"} permission; requires admin access.` };
      if (!bp) return { status: "FAIL", observedEvidence: `No branch protection rule on ${c.meta.defaultBranch}.`, recommendation: "Protect the default branch: require PR reviews and passing status checks." };
      if (bp.requiresApprovingReviews && bp.requiresStatusChecks) return { status: "PASS", observedEvidence: `${c.meta.defaultBranch} requires approving reviews and status checks.` };
      return { status: "WARN", observedEvidence: `${c.meta.defaultBranch} protection: reviews=${bp.requiresApprovingReviews}, status checks=${bp.requiresStatusChecks}.`, recommendation: "Require both approving reviews and passing status checks." };
    },
  },

  /* --------------------------- MAINTENANCE (15) --------------------------- */
  {
    checkId: "MAINT_RECENT_COMMIT",
    title: "Recent commit activity",
    dimension: "MAINTENANCE",
    weight: 6,
    evaluate: (c) => {
      const days = daysSince(c.meta.lastCommitAt ?? c.meta.pushedAt, c.input.now ?? new Date());
      if (days === null) return { status: SKIP, observedEvidence: "Last commit date unavailable." };
      if (days <= 90) return { status: "PASS", observedEvidence: `Last commit on ${c.meta.defaultBranch ?? "default branch"} was ${days} day(s) ago.` };
      if (days <= 365) return { status: "WARN", partial: 0.5, observedEvidence: `Last commit was ${days} days ago.`, recommendation: "Signal maintenance status: release, update dependencies or document project status." };
      return { status: "FAIL", observedEvidence: `Last commit was ${days} days ago (over a year).`, recommendation: "Mark the project as unmaintained or schedule a maintenance pass." };
    },
  },
  {
    checkId: "MAINT_ISSUE_TRIAGE",
    title: "Open issues are triaged",
    dimension: "MAINTENANCE",
    weight: 4,
    evaluate: (c) => {
      if (!c.meta.hasIssuesEnabled) return { status: SKIP, observedEvidence: "Issues are disabled for this repository." };
      const sample = c.meta.openIssueSample;
      if (c.meta.openIssues === 0 || sample.length === 0) return { status: "PASS", observedEvidence: "No open issues awaiting triage." };
      const triaged = sample.filter((i) => i.labelCount > 0 || i.commentCount > 0).length;
      const ratio = triaged / sample.length;
      const pct = Math.round(ratio * 100);
      const ev = `${triaged}/${sample.length} most recent open issues (${pct}%) have a label or comment; ${c.meta.openIssues} open total.`;
      if (ratio >= 0.7) return { status: "PASS", observedEvidence: ev };
      return { status: ratio >= 0.4 ? "WARN" : "FAIL", partial: ratio, observedEvidence: ev, recommendation: "Label and respond to new issues; consider issue templates and a triage rotation." };
    },
  },
  {
    checkId: "MAINT_NOT_ARCHIVED",
    title: "Repository active (not archived/disabled)",
    dimension: "MAINTENANCE",
    weight: 5,
    evaluate: (c) => {
      if (c.meta.isDisabled) return { status: "FAIL", observedEvidence: "Repository is disabled by GitHub." };
      if (c.meta.isArchived) return { status: "FAIL", observedEvidence: "Repository is archived (read-only).", recommendation: "Unarchive if the project is still maintained, or point users to a successor." };
      return { status: "PASS", observedEvidence: "Repository is active (not archived or disabled)." };
    },
  },
];

/* -------------------------------------------------------------------------- */
/*                                  Scoring                                   */
/* -------------------------------------------------------------------------- */

function points(status: CheckStatus, weight: number, partial?: number): number {
  if (status === "PASS") return weight;
  if (status === "WARN") return Math.round(weight * Math.min(1, Math.max(0, partial ?? 0.5)) * 100) / 100;
  return 0;
}

function grade(score: number): HealthReport["grade"] {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

/** Runs every rule and computes the normalized 0-100 health score (design §2.3). */
export function runDeterministicEngine(input: DeterministicInput): HealthReport {
  const started = performance.now();
  const ctx = new RuleContext(input);

  const checks: RuleEvaluation[] = RULES.map((rule) => {
    let draft: Draft;
    try {
      draft = rule.evaluate(ctx);
    } catch (err) {
      draft = { status: SKIP, observedEvidence: `Rule could not be evaluated: ${(err as Error).message}` };
    }
    const { partial, ...rest } = draft;
    return {
      checkId: rule.checkId,
      title: rule.title,
      dimension: rule.dimension,
      weight: rule.weight,
      earnedPoints: points(draft.status, rule.weight, partial),
      ...rest,
    };
  });

  const active = checks.filter((c) => c.status !== SKIP);
  const possible = active.reduce((s, c) => s + c.weight, 0);
  const earned = active.reduce((s, c) => s + c.earnedPoints, 0);
  const overallScore = possible > 0 ? Math.round((earned / possible) * 100) : 0;

  const dimensions: DimensionScore[] = ScoreDimensionSchema.options.map((dimension) => {
    const dimChecks = checks.filter((c) => c.dimension === dimension);
    const dimActive = dimChecks.filter((c) => c.status !== SKIP);
    const p = dimActive.reduce((s, c) => s + c.weight, 0);
    const e = dimActive.reduce((s, c) => s + c.earnedPoints, 0);
    return {
      dimension,
      label: DIMENSION_LABELS[dimension],
      weightPct: DIMENSION_WEIGHTS[dimension],
      score: p > 0 ? Math.round((e / p) * 100) : null,
      earnedPoints: Math.round(e * 100) / 100,
      possiblePoints: p,
      checks: dimChecks.map((c) => c.checkId),
    };
  });

  return {
    overallScore,
    grade: grade(overallScore),
    dimensions,
    checks,
    counts: {
      pass: checks.filter((c) => c.status === "PASS").length,
      warn: checks.filter((c) => c.status === "WARN").length,
      fail: checks.filter((c) => c.status === "FAIL").length,
      skipped: checks.filter((c) => c.status === SKIP).length,
    },
    durationMs: Math.round((performance.now() - started) * 100) / 100,
  };
}

// Sanity guard: rule weights per dimension must equal the documented dimension weights.
for (const dim of ScoreDimensionSchema.options) {
  const sum = RULES.filter((r) => r.dimension === dim).reduce((s, r) => s + r.weight, 0);
  if (sum !== DIMENSION_WEIGHTS[dim]) throw new Error(`Rule weights for ${dim} sum to ${sum}, expected ${DIMENSION_WEIGHTS[dim]}`);
}

import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

const here = path.dirname(fileURLToPath(import.meta.url));
// Works from both src/ (tsx) and dist/ (compiled): apps/api/.env
dotenv.config({ path: path.resolve(here, "../.env"), quiet: true });

const intFromEnv = (fallback: number) =>
  z.coerce.number().int().positive().default(fallback);

const EnvSchema = z.object({
  PORT: intFromEnv(4000),
  HOST: z.string().default("127.0.0.1"),
  CORS_ORIGIN: z.string().default("http://localhost:3000,http://127.0.0.1:3000"),

  OLLAMA_BASE_URL: z.string().url().default("http://127.0.0.1:11434"),
  LOCAL_GEMMA_MODEL: z.string().default("gemma4:e4b"),
  OLLAMA_TIMEOUT_MS: intFromEnv(60_000),

  GOOGLE_AI_API_KEY: z.string().optional(),
  HOSTED_GEMMA_MODEL: z.string().default("gemma-4-26b-a4b-it"),
  HOSTED_TIMEOUT_MS: intFromEnv(120_000),

  // Groq fallback for the hosted slot (OpenAI-compatible API)
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default("openai/gpt-oss-120b"),
  GROQ_BASE_URL: z.string().url().default("https://api.groq.com/openai/v1"),
  GROQ_TIMEOUT_MS: intFromEnv(60_000),

  MAX_FILE_BYTES: intFromEnv(65_536),
  MAX_EVIDENCE_BYTES: intFromEnv(524_288),
  MAX_MANIFEST_TOKENS: intFromEnv(2_500),

  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  // Only variable names / messages are printed, never values.
  console.error("Invalid RepoSage API configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env = parsed.data;

/** Treats empty values and the `.env.example` placeholders ("your_..._here") as "not configured". */
const realKey = (key?: string): string | undefined => {
  const k = key?.trim();
  return !k || /^your_.*_here$/i.test(k) ? undefined : k;
};

export const config = {
  port: env.PORT,
  host: env.HOST,
  corsOrigins: env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean),
  ollama: {
    baseUrl: env.OLLAMA_BASE_URL.replace(/\/+$/, ""),
    model: env.LOCAL_GEMMA_MODEL,
    timeoutMs: env.OLLAMA_TIMEOUT_MS,
  },
  hosted: {
    // NFR-SEC-02: the key lives only in this process; never serialize `config` to clients.
    apiKey: realKey(env.GOOGLE_AI_API_KEY),
    model: env.HOSTED_GEMMA_MODEL,
    timeoutMs: env.HOSTED_TIMEOUT_MS,
  },
  groq: {
    apiKey: realKey(env.GROQ_API_KEY),
    model: env.GROQ_MODEL,
    baseUrl: env.GROQ_BASE_URL.replace(/\/+$/, ""),
    timeoutMs: env.GROQ_TIMEOUT_MS,
  },
  limits: {
    maxFileBytes: env.MAX_FILE_BYTES,
    maxEvidenceBytes: env.MAX_EVIDENCE_BYTES,
    maxManifestTokens: env.MAX_MANIFEST_TOKENS,
  },
  logLevel: env.LOG_LEVEL,
} as const;

export type AppConfig = typeof config;

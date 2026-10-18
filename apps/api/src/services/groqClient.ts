import { config } from "../config.js";
import { logger } from "../utils/logger.js";
import { AUDIT_OUTPUT_JSON_SCHEMA } from "./prompts.js";
import { ModelUnavailableError, type ChatTurn, type ModelClient } from "./modelClient.js";

const MAX_ATTEMPTS = 2;
const SCHEMA_TEXT = JSON.stringify(AUDIT_OUTPUT_JSON_SCHEMA);

interface GroqChatResponse {
  choices?: Array<{ message?: { content?: string | null }; finish_reason?: string }>;
  error?: { message?: string; type?: string; code?: string; failed_generation?: string };
}

class GroqHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Hosted fallback via Groq's OpenAI-compatible Chat Completions API (default `openai/gpt-oss-120b`).
 * Used only when Google AI Studio fails or is not configured — never in Local Privacy Mode.
 *
 * JSON mode (`json_object`) is used instead of strict `json_schema`: strict mode requires every
 * property to be required, which conflicts with the optional `checkId`/`snippetQuote` fields.
 * The schema is supplied in the system prompt and enforced by the Zod validator + repair retry.
 */
export class GroqClient implements ModelClient {
  readonly runtime = "GROQ" as const;
  readonly modelId = config.groq.model;

  static isConfigured(): boolean {
    return Boolean(config.groq.apiKey);
  }

  async generate(systemPrompt: string, turns: ChatTurn[]): Promise<string> {
    if (!config.groq.apiKey) throw new ModelUnavailableError("GROQ_API_KEY is not configured in apps/api/.env.");

    // One shared deadline across attempts so retries never exceed GROQ_TIMEOUT_MS.
    const signal = AbortSignal.timeout(config.groq.timeoutMs);
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.callOnce(systemPrompt, turns, signal);
      } catch (err) {
        const status = err instanceof GroqHttpError ? err.status : 0;
        if (attempt < MAX_ATTEMPTS && (status >= 500 || status === 429) && !signal.aborted) {
          logger.warn(`[GROQ] transient HTTP ${status}, retrying (${attempt}/${MAX_ATTEMPTS - 1})`);
          await new Promise((r) => setTimeout(r, 1500 * attempt));
          continue;
        }
        throw this.describe(err);
      }
    }
  }

  private async callOnce(systemPrompt: string, turns: ChatTurn[], signal: AbortSignal): Promise<string> {
    const res = await fetch(`${config.groq.baseUrl}/chat/completions`, {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        // NFR-SEC-02: the key only ever travels in this server-side request header.
        authorization: `Bearer ${config.groq.apiKey}`,
      },
      body: JSON.stringify({
        model: this.modelId,
        messages: [
          { role: "system", content: `${systemPrompt}\n\nThe JSON object MUST conform to this JSON Schema:\n${SCHEMA_TEXT}` },
          ...turns,
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_completion_tokens: 8192,
        reasoning_effort: "medium",
        include_reasoning: false,
        stream: false,
      }),
    });

    const body = (await res.json().catch(() => ({}))) as GroqChatResponse;

    if (!res.ok) {
      // Groq rejects JSON-mode output that is not valid JSON but returns the attempt; hand it to
      // the orchestrator so its single schema-repair retry can fix it.
      if (res.status === 400 && body.error?.code === "json_validate_failed" && body.error.failed_generation) {
        return body.error.failed_generation;
      }
      throw new GroqHttpError(res.status, body.error?.message ?? `HTTP ${res.status}`);
    }

    const choice = body.choices?.[0];
    if (choice?.finish_reason === "length") {
      throw new ModelUnavailableError("Groq response hit the output token limit before completing.");
    }
    return choice?.message?.content ?? "";
  }

  private describe(err: unknown): ModelUnavailableError {
    if (err instanceof ModelUnavailableError) return err;
    const e = err as { name?: string; status?: number; message?: string };
    if (e.name === "TimeoutError" || e.name === "AbortError") {
      return new ModelUnavailableError(`Groq timed out after ${config.groq.timeoutMs} ms.`);
    }
    if (e.status === 401 || e.status === 403) return new ModelUnavailableError("Groq rejected the API key.");
    if (e.status === 404) return new ModelUnavailableError(`Model ${this.modelId} is not available on Groq.`);
    if (e.status === 429) return new ModelUnavailableError("Groq rate limit / quota exceeded.");
    if (!e.status) return new ModelUnavailableError(`Groq is not reachable at ${config.groq.baseUrl}.`);
    return new ModelUnavailableError(`Groq error (HTTP ${e.status}): ${(e.message ?? "unknown error").slice(0, 300)}`);
  }
}

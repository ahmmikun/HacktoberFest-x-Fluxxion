import { GoogleGenAI } from "@google/genai";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";
import { AUDIT_OUTPUT_JSON_SCHEMA } from "./prompts.js";
import { ModelUnavailableError, type ChatTurn, type ModelClient } from "./modelClient.js";

let client: GoogleGenAI | null = null;

const MAX_ATTEMPTS = 2;

const SCHEMA_TEXT = JSON.stringify(AUDIT_OUTPUT_JSON_SCHEMA);

function getClient(): GoogleGenAI {
  if (!config.hosted.apiKey) {
    throw new ModelUnavailableError("GOOGLE_AI_API_KEY is not configured in apps/api/.env.");
  }
  client ??= new GoogleGenAI({ apiKey: config.hosted.apiKey });
  return client;
}

/**
 * Hosted `Gemma 4 26B` inference via Google AI Studio (Gemini API).
 *
 * NOTE: `responseJsonSchema` is deliberately NOT sent. With schema-constrained decoding,
 * gemma-4-26b-a4b-it disables its reasoning and degenerates into a repetition loop until the
 * request times out. JSON mode alone yields valid JSON; the Zod validator plus the one-shot
 * schema-repair retry in the orchestrator enforce the contract instead.
 */
export class GeminiClient implements ModelClient {
  readonly runtime = "GOOGLE_AI_STUDIO" as const;
  readonly modelId = config.hosted.model;

  async generate(systemPrompt: string, turns: ChatTurn[]): Promise<string> {
    // One shared deadline across attempts so retries never exceed HOSTED_TIMEOUT_MS.
    const signal = AbortSignal.timeout(config.hosted.timeoutMs);
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.callOnce(systemPrompt, turns, signal);
      } catch (err) {
        const status = (err as { status?: number }).status ?? 0;
        // AI Studio intermittently returns 500/503 for Gemma; one quick retry usually succeeds.
        if (attempt < MAX_ATTEMPTS && (status >= 500 || status === 429) && !signal.aborted) {
          logger.warn(`[GOOGLE_AI_STUDIO] transient HTTP ${status}, retrying (${attempt}/${MAX_ATTEMPTS - 1})`);
          await new Promise((r) => setTimeout(r, 1500 * attempt));
          continue;
        }
        throw this.describe(err);
      }
    }
  }

  private async callOnce(systemPrompt: string, turns: ChatTurn[], signal: AbortSignal): Promise<string> {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: this.modelId,
      contents: turns.map((t) => ({ role: t.role === "assistant" ? "model" : "user", parts: [{ text: t.content }] })),
      config: {
        systemInstruction: `${systemPrompt}\n\nThe JSON object MUST conform to this JSON Schema:\n${SCHEMA_TEXT}`,
        temperature: 0.2,
        responseMimeType: "application/json",
        // Hard ceiling so a degenerate generation can never run until the timeout.
        maxOutputTokens: 8192,
        abortSignal: signal,
      },
    });
    if (response.candidates?.[0]?.finishReason === "MAX_TOKENS") {
      throw new ModelUnavailableError("Google AI Studio response hit the output token limit before completing.");
    }
    // `response.text` concatenates only non-thought parts.
    return response.text ?? "";
  }

  private describe(err: unknown): ModelUnavailableError {
    if (err instanceof ModelUnavailableError) return err;
    const e = err as { name?: string; status?: number; message?: string };
    if (e.name === "TimeoutError" || e.name === "AbortError") {
      return new ModelUnavailableError(`Google AI Studio timed out after ${config.hosted.timeoutMs} ms (raise HOSTED_TIMEOUT_MS if this persists).`);
    }
    if (e.status === 401 || e.status === 403) return new ModelUnavailableError("Google AI Studio rejected the API key.");
    if (e.status === 404) return new ModelUnavailableError(`Model ${this.modelId} is not available on Google AI Studio.`);
    if (e.status === 429) return new ModelUnavailableError("Google AI Studio rate limit / quota exceeded.");
    // Strip anything key-like from the SDK message before surfacing it.
    const msg = (e.message ?? "unknown error").replace(/key=[^&\s]+/gi, "key=[REDACTED]").slice(0, 300);
    return new ModelUnavailableError(`Google AI Studio error: ${msg}`);
  }
}

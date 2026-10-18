import { GoogleGenAI } from "@google/genai";
import { config } from "../config.js";
import { AUDIT_OUTPUT_JSON_SCHEMA } from "./prompts.js";
import { ModelUnavailableError, type ChatTurn, type ModelClient } from "./modelClient.js";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!config.hosted.apiKey) {
    throw new ModelUnavailableError("GOOGLE_AI_API_KEY is not configured in apps/api/.env.");
  }
  client ??= new GoogleGenAI({ apiKey: config.hosted.apiKey });
  return client;
}

/** Hosted `Gemma 4 26B` inference via Google AI Studio (Gemini API). */
export class GeminiClient implements ModelClient {
  readonly runtime = "GOOGLE_AI_STUDIO" as const;
  readonly modelId = config.hosted.model;

  async generate(systemPrompt: string, turns: ChatTurn[]): Promise<string> {
    const ai = getClient();
    try {
      const response = await ai.models.generateContent({
        model: this.modelId,
        contents: turns.map((t) => ({ role: t.role === "assistant" ? "model" : "user", parts: [{ text: t.content }] })),
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.1,
          responseMimeType: "application/json",
          responseJsonSchema: AUDIT_OUTPUT_JSON_SCHEMA,
          abortSignal: AbortSignal.timeout(config.hosted.timeoutMs),
        },
      });
      return response.text ?? "";
    } catch (err) {
      const e = err as { name?: string; status?: number; message?: string };
      if (e.name === "TimeoutError" || e.name === "AbortError") {
        throw new ModelUnavailableError(`Google AI Studio timed out after ${config.hosted.timeoutMs} ms.`);
      }
      if (e.status === 401 || e.status === 403) throw new ModelUnavailableError("Google AI Studio rejected the API key.");
      if (e.status === 404) throw new ModelUnavailableError(`Model ${this.modelId} is not available on Google AI Studio.`);
      if (e.status === 429) throw new ModelUnavailableError("Google AI Studio rate limit / quota exceeded.");
      // Strip anything key-like from the SDK message before surfacing it.
      const msg = (e.message ?? "unknown error").replace(/key=[^&\s]+/gi, "key=[REDACTED]").slice(0, 300);
      throw new ModelUnavailableError(`Google AI Studio error: ${msg}`);
    }
  }
}

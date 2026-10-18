import { config } from "../config.js";
import { AUDIT_OUTPUT_JSON_SCHEMA } from "./prompts.js";
import { ModelUnavailableError, type ChatTurn, type ModelClient } from "./modelClient.js";

interface OllamaChatResponse {
  message?: { role: string; content: string };
  error?: string;
}

/** Local `Gemma 4 E4B` inference via the Ollama HTTP API with JSON-schema constrained decoding. */
export class OllamaClient implements ModelClient {
  readonly runtime = "OLLAMA_LOCAL" as const;
  readonly modelId = config.ollama.model;

  async generate(systemPrompt: string, turns: ChatTurn[]): Promise<string> {
    let res: Response;
    try {
      res = await fetch(`${config.ollama.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: AbortSignal.timeout(config.ollama.timeoutMs),
        body: JSON.stringify({
          model: this.modelId,
          stream: false,
          format: AUDIT_OUTPUT_JSON_SCHEMA,
          options: { temperature: 0.1, num_ctx: 8192 },
          messages: [{ role: "system", content: systemPrompt }, ...turns],
        }),
      });
    } catch (err) {
      const e = err as Error;
      if (e.name === "TimeoutError") throw new ModelUnavailableError(`Ollama timed out after ${config.ollama.timeoutMs} ms.`);
      throw new ModelUnavailableError(`Ollama is not reachable at ${config.ollama.baseUrl}. Run \`ollama serve\`.`);
    }

    const body = (await res.json().catch(() => ({}))) as OllamaChatResponse;
    if (!res.ok) {
      const detail = body.error ?? `HTTP ${res.status}`;
      if (res.status === 404) throw new ModelUnavailableError(`Model ${this.modelId} not found in Ollama. Run \`ollama pull ${this.modelId}\`.`);
      throw new ModelUnavailableError(`Ollama error: ${detail}`);
    }
    return body.message?.content ?? "";
  }
}

export interface OllamaHealth {
  reachable: boolean;
  modelAvailable: boolean;
  error?: string;
}

export async function checkOllamaHealth(): Promise<OllamaHealth> {
  try {
    const res = await fetch(`${config.ollama.baseUrl}/api/tags`, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return { reachable: false, modelAvailable: false, error: `HTTP ${res.status}` };
    const data = (await res.json()) as { models?: Array<{ name: string; model?: string }> };
    const wanted = config.ollama.model;
    const withTag = wanted.includes(":") ? wanted : `${wanted}:latest`;
    const modelAvailable = (data.models ?? []).some((m) => [m.name, m.model].some((n) => n === wanted || n === withTag));
    return {
      reachable: true,
      modelAvailable,
      ...(modelAvailable ? {} : { error: `Model ${wanted} not pulled. Run \`ollama pull ${wanted}\`.` }),
    };
  } catch {
    return { reachable: false, modelAvailable: false, error: `Ollama not reachable at ${config.ollama.baseUrl}.` };
  }
}

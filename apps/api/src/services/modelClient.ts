import type { ModelRuntime } from "@reposage/shared";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** Common contract implemented by the Ollama (E4B) and Google AI Studio (26B) clients. */
export interface ModelClient {
  readonly runtime: ModelRuntime;
  readonly modelId: string;
  generate(systemPrompt: string, turns: ChatTurn[]): Promise<string>;
}

export class ModelUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelUnavailableError";
  }
}

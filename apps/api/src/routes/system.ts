import { Router } from "express";
import type { PreflightResponse } from "@reposage/shared";
import { config } from "../config.js";
import { GhCliBridge } from "../services/ghBridge.js";
import { checkOllamaHealth } from "../services/ollamaClient.js";
import { asyncHandler } from "../utils/http.js";

export const systemRouter = Router();

/** GET /api/v1/system/preflight — gh auth, Ollama health and AI Studio key presence (never the key). */
systemRouter.get(
  "/preflight",
  asyncHandler(async (_req, res) => {
    const [gh, ollama] = await Promise.all([GhCliBridge.verifySession(), checkOllamaHealth()]);
    const body: PreflightResponse = {
      gh,
      ollama: {
        reachable: ollama.reachable,
        baseUrl: config.ollama.baseUrl,
        model: config.ollama.model,
        modelAvailable: ollama.modelAvailable,
        ...(ollama.error ? { error: ollama.error } : {}),
      },
      googleAiStudio: { configured: Boolean(config.hosted.apiKey), model: config.hosted.model },
      checkedAt: new Date().toISOString(),
    };
    res.set("cache-control", "no-store").json(body);
  }),
);

systemRouter.get("/health", (_req, res) => {
  res.json({ ok: true });
});

import { Router } from "express";
import rateLimit from "express-rate-limit";
import { CreateAuditRequestSchema, type CreateAuditResponse } from "@reposage/shared";
import { activeSessionCount, createSession, getSession, type SseMessage } from "../services/auditStore.js";
import { renderMarkdownReport } from "../services/exporter.js";
import { runAuditPipeline } from "../services/pipeline.js";
import { asyncHandler, HttpError, UUID_REGEX } from "../utils/http.js";

export const auditsRouter = Router();

const MAX_CONCURRENT_AUDITS = 3;
const HEARTBEAT_MS = 15_000;

// Prevents runaway loops against the GitHub and Google AI Studio APIs.
const createLimiter = rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: "draft-7", legacyHeaders: false });

function requireSession(id: string | undefined) {
  if (!id || !UUID_REGEX.test(id)) throw new HttpError(400, "Invalid audit id.");
  const session = getSession(id);
  if (!session) throw new HttpError(404, "Audit not found or expired.");
  return session;
}

/** POST /api/v1/audits — starts an audit and returns its id; progress is streamed over SSE. */
auditsRouter.post(
  "/",
  createLimiter,
  asyncHandler(async (req, res) => {
    const parsed = CreateAuditRequestSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "Invalid audit request.", parsed.error.flatten().fieldErrors);
    if (activeSessionCount() >= MAX_CONCURRENT_AUDITS) throw new HttpError(429, "Too many audits running. Wait for one to finish.");

    const session = createSession(parsed.data.repo, parsed.data.mode);
    void runAuditPipeline(session);
    const body: CreateAuditResponse = { auditId: session.result.auditId };
    res.status(202).json(body);
  }),
);

/** GET /api/v1/audits/:id — current audit snapshot. */
auditsRouter.get("/:id", (req, res) => {
  const session = requireSession(req.params.id);
  res.set("cache-control", "no-store").json(session.result);
});

/** GET /api/v1/audits/:id/stream — Server-Sent Events: replays history, then streams live stages. */
auditsRouter.get("/:id/stream", (req, res) => {
  const session = requireSession(req.params.id);

  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    "x-accel-buffering": "no",
  });
  res.flushHeaders();

  let closed = false;
  const send = (msg: SseMessage) => {
    if (closed) return;
    res.write(`event: ${msg.event}\ndata: ${JSON.stringify(msg.data)}\n\n`);
    if (msg.event === "complete") finish();
  };

  const heartbeat = setInterval(() => !closed && res.write(": keep-alive\n\n"), HEARTBEAT_MS);
  const finish = () => {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);
    session.listeners.delete(send);
    res.end();
  };

  res.write("retry: 3000\n\n");
  for (const msg of session.messages) send(msg);
  if (!closed) session.listeners.add(send);
  req.on("close", finish);
});

/** POST /api/v1/audits/:id/export — portable Markdown report download. */
auditsRouter.post("/:id/export", (req, res) => {
  const session = requireSession(req.params.id);
  if (!session.done) throw new HttpError(409, "Audit is still running.");
  const markdown = renderMarkdownReport(session.result);
  const fileName = `reposage-${session.result.repo.replace(/[^a-zA-Z0-9_.-]+/g, "_")}-${session.result.auditId.slice(0, 8)}.md`;
  res
    .status(200)
    .set({
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="${fileName}"`,
      "cache-control": "no-store",
    })
    .send(markdown);
});

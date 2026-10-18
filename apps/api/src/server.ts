import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { config } from "./config.js";
import { actionsRouter } from "./routes/actions.js";
import { auditsRouter } from "./routes/audits.js";
import { reposRouter } from "./routes/repos.js";
import { systemRouter } from "./routes/system.js";
import { HttpError } from "./utils/http.js";
import { logger } from "./utils/logger.js";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", false);

/*
 * Local-first hardening. The API has no user accounts and acts with the developer's gh
 * session, so it must only ever answer the local web UI:
 *  - Host allow-list blocks DNS-rebinding attacks.
 *  - Origin allow-list blocks cross-site requests from other browser tabs.
 */
const allowedHosts = new Set(["localhost", "127.0.0.1", "[::1]", config.host]);
app.use((req, res, next) => {
  const host = (req.headers.host ?? "").replace(/:\d+$/, "").toLowerCase();
  if (!allowedHosts.has(host)) {
    res.status(403).json({ error: "Host not allowed." });
    return;
  }
  const origin = req.headers.origin;
  if (origin && !config.corsOrigins.includes(origin)) {
    res.status(403).json({ error: "Origin not allowed." });
    return;
  }
  next();
});

app.use(helmet({ crossOriginResourcePolicy: { policy: "same-site" } }));
app.use(
  cors({
    origin: config.corsOrigins,
    methods: ["GET", "POST"],
    allowedHeaders: ["content-type"],
    exposedHeaders: ["content-disposition"],
    maxAge: 600,
  }),
);
app.use(express.json({ limit: "64kb" }));
app.use("/api/v1", rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: "draft-7", legacyHeaders: false }));

app.use("/api/v1/system", systemRouter);
app.use("/api/v1/repos", reposRouter);
app.use("/api/v1/audits", auditsRouter);
app.use("/api/v1/actions", actionsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found." });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, ...(err.details ? { details: err.details } : {}) });
    return;
  }
  const e = err as { type?: string; status?: number };
  if (e?.type === "entity.parse.failed" || e?.type === "entity.too.large") {
    res.status(e.status ?? 400).json({ error: "Malformed or oversized JSON body." });
    return;
  }
  logger.error("Unhandled API error:", err);
  res.status(500).json({ error: "Internal server error." });
});

const server = app.listen(config.port, config.host, () => {
  logger.info(`RepoSage API listening on http://${config.host}:${config.port}/api/v1 (CORS: ${config.corsOrigins.join(", ")})`);
  if (!["127.0.0.1", "localhost", "::1"].includes(config.host)) {
    logger.warn("API is bound to a non-loopback interface. It has no authentication and acts with your gh session.");
  }
});

// SSE connections are long-lived; don't let the default timeouts cut them.
server.requestTimeout = 0;
server.headersTimeout = 65_000;

const shutdown = () => {
  logger.info("Shutting down RepoSage API…");
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

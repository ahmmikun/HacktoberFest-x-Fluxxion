import { Router } from "express";
import { z } from "zod";
import { describeGitHubError } from "../services/github.js";
import { listRepositories } from "../services/repos.js";
import { asyncHandler, HttpError } from "../utils/http.js";

export const reposRouter = Router();

const QuerySchema = z.object({
  q: z.string().max(100).optional(),
  visibility: z.enum(["all", "public", "private"]).default("all"),
  includeArchived: z.enum(["true", "false"]).default("false"),
  after: z.string().max(200).optional(),
  first: z.coerce.number().int().min(1).max(100).default(30),
});

/** GET /api/v1/repos — repositories accessible to the local gh session. */
reposRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = QuerySchema.safeParse(req.query);
    if (!parsed.success) throw new HttpError(400, "Invalid query parameters.", parsed.error.flatten().fieldErrors);
    const { q, visibility, includeArchived, after, first } = parsed.data;
    try {
      const data = await listRepositories({ query: q, visibility, includeArchived: includeArchived === "true", after, first });
      res.set("cache-control", "no-store").json(data);
    } catch (err) {
      if (err instanceof HttpError) throw err;
      const { status, message } = describeGitHubError(err);
      throw new HttpError(status, message);
    }
  }),
);

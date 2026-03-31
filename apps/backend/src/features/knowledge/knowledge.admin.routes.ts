import { Hono } from "hono";
import type { AppBindings } from "../../app/bindings";
import { requireAdminMiddleware } from "../../middleware/require-admin.middleware";
import {
  enqueueKnowledgeIngestionJob,
  getKnowledgeIngestionJobById,
  listKnowledgeIngestionJobs,
} from "./knowledge.ingestion";
import { knowledgeService } from "./knowledge.service";
import {
  parseKnowledgeDocumentFilters,
  parseKnowledgeDocumentPayload,
  parseKnowledgeDocumentUpdatePayload,
  parseKnowledgeIngestionKind,
} from "./knowledge.validation";

export const knowledgeAdminRoutes = new Hono<AppBindings>();

knowledgeAdminRoutes.use("*", requireAdminMiddleware);

knowledgeAdminRoutes.get("/", async (context) => {
  const filters = parseKnowledgeDocumentFilters(
    new URL(context.req.url).searchParams,
  );
  const documents = await knowledgeService.listForAdmin(filters);

  return context.json({ documents });
});

knowledgeAdminRoutes.post("/", async (context) => {
  const payload = parseKnowledgeDocumentPayload(await context.req.json());

  if (!payload) {
    return context.json(
      {
        error: "title, content, and a string array of tags are required",
      },
      400,
    );
  }

  const user = context.get("user");

  if (!user) {
    return context.json(
      {
        error: "Authentication required",
      },
      401,
    );
  }

  const document = await knowledgeService.create(payload, user.id);

  return context.json({ document }, 201);
});

knowledgeAdminRoutes.post("/ingest", async (context) => {
  const body = await context.req
    .json()
    .catch(() => ({}) as Record<string, unknown>);
  const kind = parseKnowledgeIngestionKind(body.kind);

  if (!kind) {
    return context.json(
      {
        error: "kind must be either 'incremental' or 'full'",
      },
      400,
    );
  }

  const user = context.get("user");

  if (!user) {
    return context.json(
      {
        error: "Authentication required",
      },
      401,
    );
  }

  const job = await enqueueKnowledgeIngestionJob({
    kind,
    triggeredBy: user.email || user.id,
  });

  return context.json(
    {
      message: "Knowledge ingestion job queued",
      job,
    },
    202,
  );
});

knowledgeAdminRoutes.get("/ingest/jobs", async (context) => {
  const limit = Math.max(
    1,
    Math.min(
      100,
      Number(new URL(context.req.url).searchParams.get("limit") ?? "30") || 30,
    ),
  );
  const jobs = await listKnowledgeIngestionJobs(limit);

  return context.json({ jobs });
});

knowledgeAdminRoutes.get("/ingest/jobs/:id", async (context) => {
  const job = await getKnowledgeIngestionJobById(context.req.param("id"));

  if (!job) {
    return context.json(
      {
        error: "Knowledge ingestion job not found",
      },
      404,
    );
  }

  return context.json({ job });
});

knowledgeAdminRoutes.get("/:id", async (context) => {
  const document = await knowledgeService.getById(context.req.param("id"));

  if (!document) {
    return context.json(
      {
        error: "Knowledge document not found",
      },
      404,
    );
  }

  return context.json({ document });
});

knowledgeAdminRoutes.patch("/:id", async (context) => {
  const payload = parseKnowledgeDocumentUpdatePayload(await context.req.json());

  if (!payload) {
    return context.json(
      {
        error: "Provide at least one valid field to update",
      },
      400,
    );
  }

  const user = context.get("user");

  if (!user) {
    return context.json(
      {
        error: "Authentication required",
      },
      401,
    );
  }

  const document = await knowledgeService.update(
    context.req.param("id"),
    payload,
    user.id,
  );

  if (!document) {
    return context.json(
      {
        error: "Knowledge document not found",
      },
      404,
    );
  }

  return context.json({ document });
});

knowledgeAdminRoutes.post("/:id/publish", async (context) => {
  const user = context.get("user");

  if (!user) {
    return context.json(
      {
        error: "Authentication required",
      },
      401,
    );
  }

  const document = await knowledgeService.update(
    context.req.param("id"),
    {
      status: "published",
    },
    user.id,
  );

  if (!document) {
    return context.json(
      {
        error: "Knowledge document not found",
      },
      404,
    );
  }

  return context.json({ document });
});

knowledgeAdminRoutes.post("/:id/draft", async (context) => {
  const user = context.get("user");

  if (!user) {
    return context.json(
      {
        error: "Authentication required",
      },
      401,
    );
  }

  const document = await knowledgeService.update(
    context.req.param("id"),
    {
      status: "draft",
    },
    user.id,
  );

  if (!document) {
    return context.json(
      {
        error: "Knowledge document not found",
      },
      404,
    );
  }

  return context.json({ document });
});

knowledgeAdminRoutes.delete("/:id", async (context) => {
  const deleted = await knowledgeService.remove(context.req.param("id"));

  if (!deleted) {
    return context.json(
      {
        error: "Knowledge document not found",
      },
      404,
    );
  }

  return context.json({
    success: true,
  });
});

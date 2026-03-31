import { resolveApiError, resolveApiUrl } from "@/lib/api-client";
import type {
  KnowledgeDocument,
  KnowledgeDocumentFilters,
  KnowledgeDocumentPayload,
  KnowledgeIngestionJob,
  KnowledgeIngestionJobKind,
} from "./knowledge.types";

const getJsonHeaders = () => {
  return {
    "content-type": "application/json",
  };
};

const buildKnowledgeUrl = ({ query, status }: KnowledgeDocumentFilters) => {
  const searchParams = new URLSearchParams();

  if (query.trim().length > 0) {
    searchParams.set("query", query.trim());
  }

  if (status !== "all") {
    searchParams.set("status", status);
  }

  const suffix = searchParams.toString();

  return resolveApiUrl(`/admin/knowledge${suffix ? `?${suffix}` : ""}`);
};

export const knowledgeApi = {
  async list(filters: KnowledgeDocumentFilters) {
    const response = await fetch(buildKnowledgeUrl(filters), {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(await resolveApiError(response));
    }

    return (await response.json()) as { documents: KnowledgeDocument[] };
  },

  async create(payload: KnowledgeDocumentPayload) {
    const response = await fetch(resolveApiUrl("/admin/knowledge"), {
      method: "POST",
      credentials: "include",
      headers: getJsonHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await resolveApiError(response));
    }

    return (await response.json()) as { document: KnowledgeDocument };
  },

  async update(id: string, payload: Partial<KnowledgeDocumentPayload>) {
    const response = await fetch(resolveApiUrl(`/admin/knowledge/${id}`), {
      method: "PATCH",
      credentials: "include",
      headers: getJsonHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(await resolveApiError(response));
    }

    return (await response.json()) as { document: KnowledgeDocument };
  },

  async publish(id: string) {
    const response = await fetch(
      resolveApiUrl(`/admin/knowledge/${id}/publish`),
      {
        method: "POST",
        credentials: "include",
      },
    );

    if (!response.ok) {
      throw new Error(await resolveApiError(response));
    }

    return (await response.json()) as { document: KnowledgeDocument };
  },

  async moveToDraft(id: string) {
    const response = await fetch(
      resolveApiUrl(`/admin/knowledge/${id}/draft`),
      {
        method: "POST",
        credentials: "include",
      },
    );

    if (!response.ok) {
      throw new Error(await resolveApiError(response));
    }

    return (await response.json()) as { document: KnowledgeDocument };
  },

  async remove(id: string) {
    const response = await fetch(resolveApiUrl(`/admin/knowledge/${id}`), {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(await resolveApiError(response));
    }

    return (await response.json()) as { success: boolean };
  },

  async queueIngestion(kind: KnowledgeIngestionJobKind) {
    const response = await fetch(resolveApiUrl("/admin/knowledge/ingest"), {
      method: "POST",
      credentials: "include",
      headers: getJsonHeaders(),
      body: JSON.stringify({ kind }),
    });

    if (!response.ok) {
      throw new Error(await resolveApiError(response));
    }

    return (await response.json()) as {
      message: string;
      job: KnowledgeIngestionJob;
    };
  },

  async listJobs(limit = 20) {
    const response = await fetch(
      resolveApiUrl(`/admin/knowledge/ingest/jobs?limit=${limit}`),
      {
        credentials: "include",
      },
    );

    if (!response.ok) {
      throw new Error(await resolveApiError(response));
    }

    return (await response.json()) as { jobs: KnowledgeIngestionJob[] };
  },
};

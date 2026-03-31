import type {
  KnowledgeDocumentListFilters,
  KnowledgeDocumentPayload,
  KnowledgeDocumentStatus,
  KnowledgeIngestionJobKind,
} from "./knowledge.types";

const validStatuses = new Set<KnowledgeDocumentStatus>(["draft", "published"]);
const validIngestionKinds = new Set<KnowledgeIngestionJobKind>([
  "incremental",
  "full",
]);

const normalizeString = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
};

const normalizeTags = (value: unknown) => {
  if (!Array.isArray(value)) {
    return null;
  }

  return value
    .map((tag) => (typeof tag === "string" ? tag.trim().toLowerCase() : ""))
    .filter(Boolean);
};

const normalizeStatus = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }

  return validStatuses.has(value as KnowledgeDocumentStatus)
    ? (value as KnowledgeDocumentStatus)
    : null;
};

export const parseKnowledgeDocumentPayload = (value: unknown) => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const title = normalizeString(payload.title);
  const content = normalizeString(payload.content);
  const tags = normalizeTags(payload.tags);
  const status = normalizeStatus(payload.status) ?? undefined;

  if (!title || !content || !tags) {
    return null;
  }

  return {
    title,
    content,
    tags,
    status,
  } satisfies KnowledgeDocumentPayload;
};

export const parseKnowledgeDocumentUpdatePayload = (value: unknown) => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const nextPayload: Partial<KnowledgeDocumentPayload> = {};

  if ("title" in payload) {
    const title = normalizeString(payload.title);

    if (!title) {
      return null;
    }

    nextPayload.title = title;
  }

  if ("content" in payload) {
    const content = normalizeString(payload.content);

    if (!content) {
      return null;
    }

    nextPayload.content = content;
  }

  if ("tags" in payload) {
    const tags = normalizeTags(payload.tags);

    if (!tags) {
      return null;
    }

    nextPayload.tags = tags;
  }

  if ("status" in payload) {
    const status = normalizeStatus(payload.status);

    if (!status) {
      return null;
    }

    nextPayload.status = status;
  }

  if (Object.keys(nextPayload).length === 0) {
    return null;
  }

  return nextPayload;
};

export const parseKnowledgeDocumentFilters = (
  searchParams: URLSearchParams,
) => {
  const query = searchParams.get("query")?.trim();
  const rawStatus = searchParams.get("status")?.trim();
  const status =
    rawStatus && validStatuses.has(rawStatus as KnowledgeDocumentStatus)
      ? (rawStatus as KnowledgeDocumentStatus)
      : undefined;

  return {
    query: query && query.length > 0 ? query : undefined,
    status,
  } satisfies KnowledgeDocumentListFilters;
};

export const parseKnowledgeIngestionKind = (value: unknown) => {
  if (value === undefined || value === null) {
    return "incremental" satisfies KnowledgeIngestionJobKind;
  }

  if (typeof value !== "string") {
    return null;
  }

  return validIngestionKinds.has(value as KnowledgeIngestionJobKind)
    ? (value as KnowledgeIngestionJobKind)
    : null;
};

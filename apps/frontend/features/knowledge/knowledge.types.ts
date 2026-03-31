export type KnowledgeDocumentStatus = "draft" | "published";
export type KnowledgeIngestionJobKind = "incremental" | "full";
export type KnowledgeIngestionJobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed";

export type KnowledgeDocument = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  status: KnowledgeDocumentStatus;
  version: number;
  publishedAt: string | null;
  createdByAuthUserId: string;
  updatedByAuthUserId: string;
  createdAt: string;
  updatedAt: string;
  lastIngestedVersion: number | null;
  lastIngestedAt: string | null;
  lastChunkCount: number | null;
  lastJobId: string | null;
};

export type KnowledgeDocumentPayload = {
  title: string;
  content: string;
  tags: string[];
  status?: KnowledgeDocumentStatus;
};

export type KnowledgeDocumentFilters = {
  query: string;
  status: "all" | KnowledgeDocumentStatus;
};

export type KnowledgeIngestionJob = {
  id: string;
  kind: KnowledgeIngestionJobKind;
  status: KnowledgeIngestionJobStatus;
  triggeredBy: string;
  totalDocs: number;
  processedDocs: number;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

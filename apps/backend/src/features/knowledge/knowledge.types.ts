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
  publishedAt: Date | null;
  createdByAuthUserId: string;
  updatedByAuthUserId: string;
  createdAt: Date;
  updatedAt: Date;
  lastIngestedVersion: number | null;
  lastIngestedAt: Date | null;
  lastChunkCount: number | null;
  lastJobId: string | null;
};

export type KnowledgeDocumentPayload = {
  title: string;
  content: string;
  tags: string[];
  status?: KnowledgeDocumentStatus;
};

export type KnowledgeDocumentUpdatePayload = Partial<KnowledgeDocumentPayload>;

export type KnowledgeDocumentListFilters = {
  query?: string;
  status?: KnowledgeDocumentStatus;
};

export type KnowledgeSearchResult = Pick<
  KnowledgeDocument,
  "id" | "title" | "content" | "tags" | "updatedAt"
>;

export type KnowledgeIngestableDocument = Pick<
  KnowledgeDocument,
  "id" | "title" | "content" | "tags" | "version"
>;

export type KnowledgeIngestionStateRecord = {
  docId: string;
  lastIngestedVersion: number;
  lastIngestedAt: Date;
  lastChunkCount: number;
  lastJobId: string;
  updatedAt: Date;
};

export type KnowledgeIngestionJob = {
  id: string;
  kind: KnowledgeIngestionJobKind;
  status: KnowledgeIngestionJobStatus;
  triggeredBy: string;
  totalDocs: number;
  processedDocs: number;
  error: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

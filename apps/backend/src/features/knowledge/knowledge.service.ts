import type { Types } from "mongoose";
import { ensureMongooseReady } from "../../infrastructure/database/mongo";
import { createLogger } from "../../infrastructure/logging/logger";
import { KnowledgeDocumentModel } from "./knowledge.model";
import { knowledgeSearch } from "./knowledge.search";
import type {
  KnowledgeDocument,
  KnowledgeDocumentListFilters,
  KnowledgeDocumentPayload,
  KnowledgeDocumentUpdatePayload,
  KnowledgeIngestableDocument,
} from "./knowledge.types";
import { KnowledgeIngestionStateModel } from "./knowledge-ingestion-state.model";

const knowledgeLogger = createLogger({ feature: "knowledge" });

type RawKnowledgeDocument = {
  _id: Types.ObjectId;
  title: string;
  content: string;
  tags: string[];
  status: "draft" | "published";
  version: number;
  publishedAt: Date | null;
  createdByAuthUserId: string;
  updatedByAuthUserId: string;
  createdAt: Date;
  updatedAt: Date;
};

type RawKnowledgeIngestionState = {
  docId: string;
  lastIngestedVersion: number;
  lastIngestedAt: Date;
  lastChunkCount: number;
  lastJobId: string;
};

const normalizeStatus = (status?: KnowledgeDocumentPayload["status"]) => {
  return status === "published" ? "published" : "draft";
};

const buildAdminFilter = ({ query, status }: KnowledgeDocumentListFilters) => {
  const filter: Record<string, unknown> = {};

  if (status) {
    filter.status = status;
  }

  if (query) {
    const expression = new RegExp(
      query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );

    filter.$or = [
      { title: expression },
      { content: expression },
      { tags: expression },
    ];
  }

  return filter;
};

const buildStateMap = async (documentIds: string[]) => {
  if (documentIds.length === 0) {
    return new Map<string, RawKnowledgeIngestionState>();
  }

  const states = (await KnowledgeIngestionStateModel.find({
    docId: {
      $in: documentIds,
    },
  }).lean()) as RawKnowledgeIngestionState[];

  return new Map(states.map((state) => [state.docId, state]));
};

const toKnowledgeDocument = (
  value: RawKnowledgeDocument,
  state?: RawKnowledgeIngestionState,
): KnowledgeDocument => {
  return {
    id: value._id.toString(),
    title: value.title,
    content: value.content,
    tags: value.tags,
    status: value.status,
    version: value.version,
    publishedAt: value.publishedAt,
    createdByAuthUserId: value.createdByAuthUserId,
    updatedByAuthUserId: value.updatedByAuthUserId,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    lastIngestedVersion: state?.lastIngestedVersion ?? null,
    lastIngestedAt: state?.lastIngestedAt ?? null,
    lastChunkCount: state?.lastChunkCount ?? null,
    lastJobId: state?.lastJobId ?? null,
  };
};

const toIngestableDocument = (
  document: KnowledgeDocument,
): KnowledgeIngestableDocument => {
  return {
    id: document.id,
    title: document.title,
    content: document.content,
    tags: document.tags,
    version: document.version,
  };
};

const hydrateDocuments = async (documents: RawKnowledgeDocument[]) => {
  const stateMap = await buildStateMap(
    documents.map((document) => document._id.toString()),
  );

  return documents.map((document) => {
    return toKnowledgeDocument(document, stateMap.get(document._id.toString()));
  });
};

export const knowledgeService = {
  async listForAdmin(filters: KnowledgeDocumentListFilters) {
    ensureMongooseReady();

    const documents = (await KnowledgeDocumentModel.find(
      buildAdminFilter(filters),
    )
      .sort({ updatedAt: -1 })
      .lean()) as RawKnowledgeDocument[];

    return hydrateDocuments(documents);
  },

  async getById(id: string) {
    ensureMongooseReady();

    const document = (await KnowledgeDocumentModel.findById(
      id,
    ).lean()) as RawKnowledgeDocument | null;

    if (!document) {
      return null;
    }

    const [state] = (await KnowledgeIngestionStateModel.find({
      docId: id,
    }).lean()) as RawKnowledgeIngestionState[];

    return toKnowledgeDocument(document, state);
  },

  async create(payload: KnowledgeDocumentPayload, actorAuthUserId: string) {
    ensureMongooseReady();

    const now = new Date();
    const status = normalizeStatus(payload.status);
    const created = await KnowledgeDocumentModel.create({
      title: payload.title,
      content: payload.content,
      tags: payload.tags,
      status,
      version: 1,
      publishedAt: status === "published" ? now : null,
      createdByAuthUserId: actorAuthUserId,
      updatedByAuthUserId: actorAuthUserId,
    });

    const document = toKnowledgeDocument(
      created.toObject() as RawKnowledgeDocument,
    );

    knowledgeLogger.info(
      {
        knowledgeDocumentId: document.id,
        actorAuthUserId,
      },
      "Knowledge document created",
    );

    return document;
  },

  async update(
    id: string,
    payload: KnowledgeDocumentUpdatePayload,
    actorAuthUserId: string,
  ) {
    ensureMongooseReady();

    const existing = (await KnowledgeDocumentModel.findById(
      id,
    ).lean()) as RawKnowledgeDocument | null;

    if (!existing) {
      return null;
    }

    const nextTitle = payload.title ?? existing.title;
    const nextContent = payload.content ?? existing.content;
    const nextTags = payload.tags ?? existing.tags;
    const nextStatus = normalizeStatus(payload.status ?? existing.status);
    const shouldBumpVersion =
      nextTitle !== existing.title ||
      nextContent !== existing.content ||
      nextStatus !== existing.status ||
      JSON.stringify(nextTags) !== JSON.stringify(existing.tags);
    const now = new Date();
    const updated = (await KnowledgeDocumentModel.findByIdAndUpdate(
      id,
      {
        title: nextTitle,
        content: nextContent,
        tags: nextTags,
        status: nextStatus,
        version: shouldBumpVersion ? existing.version + 1 : existing.version,
        publishedAt:
          nextStatus === "published" ? (existing.publishedAt ?? now) : null,
        updatedByAuthUserId: actorAuthUserId,
      },
      {
        new: true,
        runValidators: true,
      },
    ).lean()) as RawKnowledgeDocument | null;

    if (!updated) {
      return null;
    }

    const [state] = (await KnowledgeIngestionStateModel.find({
      docId: id,
    }).lean()) as RawKnowledgeIngestionState[];

    knowledgeLogger.info(
      {
        knowledgeDocumentId: id,
        actorAuthUserId,
      },
      "Knowledge document updated",
    );

    return toKnowledgeDocument(updated, state);
  },

  async remove(id: string) {
    ensureMongooseReady();

    const document = (await KnowledgeDocumentModel.findById(
      id,
    ).lean()) as RawKnowledgeDocument | null;

    if (!document) {
      return false;
    }

    try {
      await knowledgeSearch.removeDocuments([id]);
    } catch (error) {
      knowledgeLogger.warn(
        {
          err: error,
          knowledgeDocumentId: id,
        },
        "Knowledge vector cleanup failed; continuing with document deletion",
      );
    }

    await Promise.all([
      KnowledgeDocumentModel.findByIdAndDelete(id),
      KnowledgeIngestionStateModel.deleteOne({ docId: id }),
    ]);

    knowledgeLogger.info(
      { knowledgeDocumentId: id },
      "Knowledge document deleted",
    );

    return true;
  },

  async listPublishedDocsForFullIngestion() {
    ensureMongooseReady();

    const documents = (await KnowledgeDocumentModel.find({
      status: "published",
    })
      .sort({ updatedAt: -1 })
      .lean()) as RawKnowledgeDocument[];

    return documents.map((document) =>
      toIngestableDocument(toKnowledgeDocument(document)),
    );
  },

  async listPublishedDocsNeedingIngestion() {
    ensureMongooseReady();

    const documents = (await KnowledgeDocumentModel.find({
      status: "published",
    })
      .sort({ updatedAt: -1 })
      .lean()) as RawKnowledgeDocument[];
    const stateMap = await buildStateMap(
      documents.map((document) => document._id.toString()),
    );

    return documents
      .map((document) => {
        const hydrated = toKnowledgeDocument(
          document,
          stateMap.get(document._id.toString()),
        );

        return hydrated;
      })
      .filter((document) => {
        return (
          document.lastIngestedVersion === null ||
          document.lastIngestedVersion < document.version
        );
      })
      .map(toIngestableDocument);
  },

  async listDocsToRemoveFromVectorIndex() {
    ensureMongooseReady();

    const documents = (await KnowledgeDocumentModel.find({
      status: "draft",
    })
      .select({ _id: 1 })
      .lean()) as Array<{ _id: Types.ObjectId }>;

    if (documents.length === 0) {
      return [];
    }

    const states = (await KnowledgeIngestionStateModel.find({
      docId: {
        $in: documents.map((document) => document._id.toString()),
      },
    })
      .select({ docId: 1 })
      .lean()) as Array<{ docId: string }>;

    return states.map((state) => state.docId);
  },

  async upsertIngestionState(input: {
    docId: string;
    lastIngestedVersion: number;
    lastChunkCount: number;
    lastJobId: string;
  }) {
    ensureMongooseReady();

    const now = new Date();

    await KnowledgeIngestionStateModel.findOneAndUpdate(
      {
        docId: input.docId,
      },
      {
        docId: input.docId,
        lastIngestedVersion: input.lastIngestedVersion,
        lastChunkCount: input.lastChunkCount,
        lastJobId: input.lastJobId,
        lastIngestedAt: now,
        updatedAt: now,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );
  },

  async clearIngestionState(docId: string) {
    ensureMongooseReady();

    await KnowledgeIngestionStateModel.deleteOne({
      docId,
    });
  },

  async searchPublished(query: string, limit = 4) {
    ensureMongooseReady();

    return knowledgeSearch.search(query, limit);
  },
};

import { ModelRouterEmbeddingModel } from "@mastra/core/llm";
import type { QueryResult } from "@mastra/core/vector";
import { MongoDBVector } from "@mastra/mongodb";
import { embed, embedMany } from "ai";
import { getEnv } from "../../config/env";
import { createLogger } from "../../infrastructure/logging/logger";
import type {
  KnowledgeDocument,
  KnowledgeIngestableDocument,
  KnowledgeSearchResult,
} from "./knowledge.types";

const logger = createLogger({ feature: "knowledge-search" });
const atlasSupportHint =
  "MongoDB vector search requires MongoDB Atlas Local or Atlas Cloud with Atlas Search enabled.";
const deleteIndexTimeoutMs = 60_000;
const deleteIndexPollMs = 2_000;
const chunkSize = 1_200;
const chunkOverlap = 200;

type KnowledgeVectorMetadata = {
  knowledgeDocumentId: string;
  title: string;
  tags: string[];
  status: KnowledgeDocument["status"];
  updatedAt: string;
  chunkText: string;
};

type KnowledgeSearchState = {
  connected: boolean;
  embedder?: ModelRouterEmbeddingModel<string>;
  vectorStore?: MongoDBVector;
};

declare global {
  var __ersaKnowledgeSearchState: KnowledgeSearchState | undefined;
}

const getState = () => {
  globalThis.__ersaKnowledgeSearchState ??= {
    connected: false,
  };

  return globalThis.__ersaKnowledgeSearchState;
};

const getEmbedder = () => {
  const state = getState();

  state.embedder ??= new ModelRouterEmbeddingModel(
    getEnv().knowledgeEmbeddingModel,
  );

  return state.embedder;
};

const getVectorStore = () => {
  const state = getState();
  const env = getEnv();

  state.vectorStore ??= new MongoDBVector({
    id: "ersa-chat-knowledge-vectors",
    uri: env.mongoUri,
    dbName: env.mongoDbName,
  });

  return state.vectorStore;
};

const withIndexError = (action: string, error: unknown) => {
  if (
    error instanceof Error &&
    error.message.includes(
      "The maximum number of FTS indexes has been reached for this instance size.",
    )
  ) {
    return new Error(
      `${action} failed. ${atlasSupportHint} Atlas rejected the search index creation because this cluster has reached its FTS index limit. Remove unused Atlas Search indexes or wait for the previous deletion to finish, then restart the backend.`,
    );
  }

  if (error instanceof Error) {
    return new Error(`${action} failed. ${atlasSupportHint} ${error.message}`);
  }

  return new Error(`${action} failed. ${atlasSupportHint}`);
};

const sleep = (durationMs: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
};

const toPreview = (content: string, maxLength = 1_000) => {
  return content.length <= maxLength
    ? content
    : `${content.slice(0, maxLength - 1).trimEnd()}...`;
};

const splitIntoChunks = (content: string) => {
  const normalized = content.replace(/\s+\n/g, "\n").trim();

  if (!normalized) {
    return [];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    const end = Math.min(start + chunkSize, normalized.length);
    const chunk = normalized.slice(start, end).trim();

    if (chunk) {
      chunks.push(chunk);
    }

    if (end >= normalized.length) {
      break;
    }

    start = Math.max(end - chunkOverlap, start + 1);
  }

  return chunks;
};

const buildChunkInput = (
  document: KnowledgeIngestableDocument,
  chunk: string,
) => {
  return [
    `Title: ${document.title}`,
    document.tags.length > 0 ? `Tags: ${document.tags.join(", ")}` : null,
    "Content:",
    chunk,
  ]
    .filter(Boolean)
    .join("\n");
};

const buildChunkMetadata = (
  document: KnowledgeIngestableDocument,
  chunk: string,
): KnowledgeVectorMetadata => {
  return {
    knowledgeDocumentId: document.id,
    title: document.title,
    tags: document.tags,
    status: "published",
    updatedAt: new Date().toISOString(),
    chunkText: chunk,
  };
};

const toSearchResult = (result: QueryResult): KnowledgeSearchResult | null => {
  const metadata = result.metadata as
    | Partial<KnowledgeVectorMetadata>
    | undefined;

  if (
    !metadata ||
    typeof metadata.knowledgeDocumentId !== "string" ||
    typeof metadata.title !== "string" ||
    !Array.isArray(metadata.tags) ||
    typeof metadata.updatedAt !== "string" ||
    typeof metadata.chunkText !== "string"
  ) {
    return null;
  }

  const updatedAt = new Date(metadata.updatedAt);

  if (Number.isNaN(updatedAt.valueOf())) {
    return null;
  }

  return {
    id: metadata.knowledgeDocumentId,
    title: metadata.title,
    content: toPreview(metadata.chunkText),
    tags: metadata.tags.filter((tag): tag is string => typeof tag === "string"),
    updatedAt,
  };
};

const ensureConnected = async () => {
  const state = getState();

  if (state.connected) {
    return;
  }

  await getVectorStore().connect();
  state.connected = true;
};

const waitForDeletedIndex = async (indexName: string) => {
  const store = getVectorStore();
  const startedAt = Date.now();

  while (Date.now() - startedAt < deleteIndexTimeoutMs) {
    const indexes = await store.listIndexes();

    if (!indexes.includes(indexName)) {
      return;
    }

    await sleep(deleteIndexPollMs);
  }

  throw new Error(
    `Timed out waiting for Atlas Search index "${indexName}" to be deleted.`,
  );
};

const createIndex = async () => {
  const env = getEnv();

  await getVectorStore().createIndex({
    indexName: env.knowledgeVectorIndexName,
    dimension: env.knowledgeEmbeddingDimensions,
    metric: "cosine",
  });
};

const ensureIndex = async () => {
  const env = getEnv();
  const store = getVectorStore();
  let recreated = false;
  const indexes = await store.listIndexes();

  if (!indexes.includes(env.knowledgeVectorIndexName)) {
    await createIndex();
    recreated = true;
  } else {
    const index = await store.describeIndex({
      indexName: env.knowledgeVectorIndexName,
    });

    if (index.dimension !== env.knowledgeEmbeddingDimensions) {
      logger.warn(
        {
          indexName: env.knowledgeVectorIndexName,
          currentDimension: index.dimension,
          expectedDimension: env.knowledgeEmbeddingDimensions,
        },
        "Recreating knowledge vector index because the embedding dimension changed",
      );

      await store.deleteIndex({
        indexName: env.knowledgeVectorIndexName,
      });
      await waitForDeletedIndex(env.knowledgeVectorIndexName);
      await createIndex();
      recreated = true;
    }
  }

  await store.waitForIndexReady({
    indexName: env.knowledgeVectorIndexName,
    timeoutMs: 60_000,
    checkIntervalMs: 2_000,
  });

  return {
    recreated,
  };
};

const removeDocuments = async (documentIds: string[]) => {
  if (documentIds.length === 0) {
    return;
  }

  await ensureConnected();

  for (const documentId of documentIds) {
    await getVectorStore().deleteVectors({
      indexName: getEnv().knowledgeVectorIndexName,
      filter: {
        knowledgeDocumentId: documentId,
      },
    });
  }
};

export const knowledgeSearch = {
  async initialize() {
    try {
      await ensureConnected();

      return await ensureIndex();
    } catch (error) {
      throw withIndexError(
        "Initializing the MongoDB knowledge vector index",
        error,
      );
    }
  },

  async resetIndex() {
    await ensureConnected();
    const env = getEnv();
    const store = getVectorStore();
    const indexes = await store.listIndexes();

    if (!indexes.includes(env.knowledgeVectorIndexName)) {
      await createIndex();
      await store.waitForIndexReady({
        indexName: env.knowledgeVectorIndexName,
        timeoutMs: 60_000,
        checkIntervalMs: 2_000,
      });

      return;
    }

    logger.info(
      { indexName: env.knowledgeVectorIndexName },
      "Clearing knowledge vectors for a full ingestion rebuild without recreating Atlas Search indexes",
    );

    await store.deleteVectors({
      indexName: env.knowledgeVectorIndexName,
      filter: {
        status: "published",
      },
    });
  },

  async close() {
    const state = getState();

    if (!state.vectorStore || !state.connected) {
      return;
    }

    await state.vectorStore.disconnect();
    state.connected = false;
  },

  async removeDocuments(documentIds: string[]) {
    await removeDocuments(documentIds);
  },

  async upsertDocument(document: KnowledgeIngestableDocument) {
    await ensureConnected();

    const chunks = splitIntoChunks(document.content);

    if (chunks.length === 0) {
      await removeDocuments([document.id]);

      return {
        chunkCount: 0,
      };
    }

    const { embeddings } = await embedMany({
      model: getEmbedder(),
      values: chunks.map((chunk) => buildChunkInput(document, chunk)),
    });

    if (embeddings.length !== chunks.length) {
      throw new Error(
        "Knowledge embedding count did not match the generated chunk count.",
      );
    }

    await removeDocuments([document.id]);

    await getVectorStore().upsert({
      indexName: getEnv().knowledgeVectorIndexName,
      ids: chunks.map(
        (_, index) => `${document.id}:v${document.version}:${index}`,
      ),
      vectors: embeddings,
      metadata: chunks.map((chunk) => buildChunkMetadata(document, chunk)),
      documents: chunks,
    });

    return {
      chunkCount: chunks.length,
    };
  },

  async search(query: string, limit = 4) {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return [];
    }

    await ensureConnected();

    const { embedding } = await embed({
      model: getEmbedder(),
      value: trimmedQuery,
    });
    const results = await getVectorStore().query({
      indexName: getEnv().knowledgeVectorIndexName,
      queryVector: embedding,
      topK: Math.max(limit * 4, limit),
      filter: {
        status: "published",
      },
      includeVector: false,
    });
    const deduplicated = new Map<string, KnowledgeSearchResult>();

    for (const result of results) {
      const mapped = toSearchResult(result);

      if (!mapped || deduplicated.has(mapped.id)) {
        continue;
      }

      deduplicated.set(mapped.id, mapped);

      if (deduplicated.size >= limit) {
        break;
      }
    }

    return Array.from(deduplicated.values());
  },
};

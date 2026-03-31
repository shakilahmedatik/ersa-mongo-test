import { getEnv } from "../../config/env";
import { ensureMongooseReady } from "../../infrastructure/database/mongo";
import { createLogger } from "../../infrastructure/logging/logger";
import { knowledgeSearch } from "./knowledge.search";
import { knowledgeService } from "./knowledge.service";
import type {
  KnowledgeIngestionJob,
  KnowledgeIngestionJobKind,
} from "./knowledge.types";
import { KnowledgeIngestionJobModel } from "./knowledge-ingestion-job.model";

const logger = createLogger({ feature: "knowledge-ingestion" });

let isDraining = false;
let shouldDrainAgain = false;
let workerStarted = false;

const serializeError = (error: unknown) => {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`.slice(0, 2_000);
  }

  return String(error).slice(0, 2_000);
};

const toJob = (value: {
  _id: { toString(): string };
  kind: KnowledgeIngestionJobKind;
  status: KnowledgeIngestionJob["status"];
  triggeredBy: string;
  totalDocs: number;
  processedDocs: number;
  error?: string | null;
  startedAt?: Date | null;
  finishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): KnowledgeIngestionJob => {
  return {
    id: value._id.toString(),
    kind: value.kind,
    status: value.status,
    triggeredBy: value.triggeredBy,
    totalDocs: value.totalDocs,
    processedDocs: value.processedDocs,
    error: value.error ?? null,
    startedAt: value.startedAt ?? null,
    finishedAt: value.finishedAt ?? null,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
};

const setJobCounts = async (
  jobId: string,
  totalDocs: number,
  processedDocs: number,
) => {
  await KnowledgeIngestionJobModel.findByIdAndUpdate(jobId, {
    totalDocs,
    processedDocs,
    updatedAt: new Date(),
  });
};

const setJobStatus = async (
  jobId: string,
  status: KnowledgeIngestionJob["status"],
  patch: Partial<KnowledgeIngestionJob> = {},
) => {
  await KnowledgeIngestionJobModel.findByIdAndUpdate(jobId, {
    status,
    updatedAt: new Date(),
    ...patch,
  });
};

const recoverStaleRunningJobs = async () => {
  const staleBefore = new Date(
    Date.now() - getEnv().knowledgeIngestionStaleAfterMs,
  );
  const now = new Date();
  const result = await KnowledgeIngestionJobModel.updateMany(
    {
      status: "running",
      updatedAt: {
        $lt: staleBefore,
      },
    },
    {
      status: "failed",
      error: `Recovered stale running job after ${getEnv().knowledgeIngestionStaleAfterMs}ms timeout`,
      finishedAt: now,
      updatedAt: now,
    },
  );

  if (result.modifiedCount > 0) {
    logger.warn(
      { recoveredCount: result.modifiedCount },
      "Recovered stale running ingestion jobs",
    );
  }
};

const claimNextPendingJob = async () => {
  const claimed = await KnowledgeIngestionJobModel.findOneAndUpdate(
    {
      status: "pending",
    },
    {
      status: "running",
      startedAt: new Date(),
      updatedAt: new Date(),
    },
    {
      sort: {
        createdAt: 1,
      },
      new: true,
    },
  ).lean();

  return claimed ? toJob(claimed) : null;
};

const processClaimedJob = async (job: KnowledgeIngestionJob) => {
  try {
    const docsToIngest =
      job.kind === "full"
        ? await knowledgeService.listPublishedDocsForFullIngestion()
        : await knowledgeService.listPublishedDocsNeedingIngestion();
    const docsToRemove =
      job.kind === "full"
        ? []
        : await knowledgeService.listDocsToRemoveFromVectorIndex();
    const totalDocs = docsToRemove.length + docsToIngest.length;
    let processedDocs = 0;

    await setJobCounts(job.id, totalDocs, 0);

    if (job.kind === "full") {
      await knowledgeSearch.resetIndex();
    }

    if (totalDocs === 0) {
      await setJobStatus(job.id, "completed", {
        finishedAt: new Date(),
      });

      return;
    }

    const flushProgress = async (force = false) => {
      if (
        !force &&
        processedDocs % getEnv().knowledgeIngestionProgressFlushEveryDocs !== 0
      ) {
        return;
      }

      await setJobCounts(job.id, totalDocs, processedDocs);
    };

    if (docsToRemove.length > 0) {
      await knowledgeSearch.removeDocuments(docsToRemove);
    }

    for (const docId of docsToRemove) {
      await knowledgeService.clearIngestionState(docId);
      processedDocs += 1;
      await flushProgress();
    }

    for (const document of docsToIngest) {
      const result = await knowledgeSearch.upsertDocument(document);

      await knowledgeService.upsertIngestionState({
        docId: document.id,
        lastIngestedVersion: document.version,
        lastChunkCount: result.chunkCount,
        lastJobId: job.id,
      });
      processedDocs += 1;
      await flushProgress();
    }

    await flushProgress(true);
    await setJobStatus(job.id, "completed", {
      finishedAt: new Date(),
    });
  } catch (error) {
    await setJobStatus(job.id, "failed", {
      error: serializeError(error),
      finishedAt: new Date(),
    });
  }
};

const requestDrain = () => {
  if (isDraining) {
    shouldDrainAgain = true;
    return;
  }

  void drainKnowledgeIngestionJobs().catch((error) => {
    logger.error({ err: error }, "Knowledge ingestion drain failed");
  });
};

export const enqueueKnowledgeIngestionJob = async (input: {
  kind?: KnowledgeIngestionJobKind;
  triggeredBy?: string;
}) => {
  ensureMongooseReady();

  const created = await KnowledgeIngestionJobModel.create({
    kind: input.kind ?? "incremental",
    status: "pending",
    triggeredBy: input.triggeredBy ?? "system",
    totalDocs: 0,
    processedDocs: 0,
  });

  requestDrain();

  return toJob(created.toObject());
};

export const listKnowledgeIngestionJobs = async (limit = 30) => {
  ensureMongooseReady();

  const jobs = await KnowledgeIngestionJobModel.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return jobs.map(toJob);
};

export const getKnowledgeIngestionJobById = async (jobId: string) => {
  ensureMongooseReady();

  const job = await KnowledgeIngestionJobModel.findById(jobId).lean();

  return job ? toJob(job) : null;
};

export const drainKnowledgeIngestionJobs = async () => {
  if (isDraining) {
    shouldDrainAgain = true;
    return;
  }

  isDraining = true;

  try {
    do {
      shouldDrainAgain = false;
      await recoverStaleRunningJobs();

      while (true) {
        const job = await claimNextPendingJob();

        if (!job) {
          break;
        }

        await processClaimedJob(job);
      }
    } while (shouldDrainAgain);
  } finally {
    isDraining = false;
  }
};

export const startKnowledgeIngestionWorker = () => {
  if (workerStarted) {
    return;
  }

  workerStarted = true;
  requestDrain();

  logger.info("Knowledge ingestion worker initialized");
};

export const stopKnowledgeIngestionWorker = () => {
  workerStarted = false;
};

export const runKnowledgeIngestionNow = async (input?: {
  kind?: KnowledgeIngestionJobKind;
  triggeredBy?: string;
}) => {
  const job = await enqueueKnowledgeIngestionJob({
    kind: input?.kind ?? "incremental",
    triggeredBy: input?.triggeredBy ?? "system",
  });

  await drainKnowledgeIngestionJobs();

  return getKnowledgeIngestionJobById(job.id);
};

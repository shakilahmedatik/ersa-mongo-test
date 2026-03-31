import mongoose, { Schema } from "mongoose";
import type {
  KnowledgeIngestionJob,
  KnowledgeIngestionJobKind,
  KnowledgeIngestionJobStatus,
} from "./knowledge.types";

type KnowledgeIngestionJobDocument = Omit<KnowledgeIngestionJob, "id">;

const kinds: KnowledgeIngestionJobKind[] = ["incremental", "full"];
const statuses: KnowledgeIngestionJobStatus[] = [
  "pending",
  "running",
  "completed",
  "failed",
];

const knowledgeIngestionJobSchema = new Schema<KnowledgeIngestionJobDocument>(
  {
    kind: {
      type: String,
      enum: kinds,
      required: true,
      default: "incremental",
    },
    status: {
      type: String,
      enum: statuses,
      required: true,
      default: "pending",
      index: true,
    },
    triggeredBy: {
      type: String,
      required: true,
      default: "system",
    },
    totalDocs: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    processedDocs: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    error: {
      type: String,
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    finishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export const KnowledgeIngestionJobModel =
  mongoose.models.KnowledgeIngestionJob ??
  mongoose.model<KnowledgeIngestionJobDocument>(
    "KnowledgeIngestionJob",
    knowledgeIngestionJobSchema,
  );

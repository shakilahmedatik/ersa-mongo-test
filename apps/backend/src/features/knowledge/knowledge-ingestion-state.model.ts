import mongoose, { Schema } from "mongoose";
import type { KnowledgeIngestionStateRecord } from "./knowledge.types";

type KnowledgeIngestionStateDocument = Omit<
  KnowledgeIngestionStateRecord,
  never
>;

const knowledgeIngestionStateSchema =
  new Schema<KnowledgeIngestionStateDocument>(
    {
      docId: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },
      lastIngestedVersion: {
        type: Number,
        required: true,
        min: 1,
      },
      lastIngestedAt: {
        type: Date,
        required: true,
      },
      lastChunkCount: {
        type: Number,
        required: true,
        min: 0,
      },
      lastJobId: {
        type: String,
        required: true,
      },
      updatedAt: {
        type: Date,
        required: true,
      },
    },
    {
      versionKey: false,
    },
  );

export const KnowledgeIngestionStateModel =
  mongoose.models.KnowledgeIngestionState ??
  mongoose.model<KnowledgeIngestionStateDocument>(
    "KnowledgeIngestionState",
    knowledgeIngestionStateSchema,
  );

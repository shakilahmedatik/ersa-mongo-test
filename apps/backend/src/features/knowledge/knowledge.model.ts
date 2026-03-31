import mongoose, { Schema } from "mongoose";
import type {
  KnowledgeDocument,
  KnowledgeDocumentStatus,
} from "./knowledge.types";

type KnowledgeDocumentRecord = Omit<
  KnowledgeDocument,
  | "id"
  | "lastIngestedVersion"
  | "lastIngestedAt"
  | "lastChunkCount"
  | "lastJobId"
>;

const statuses: KnowledgeDocumentStatus[] = ["draft", "published"];

const knowledgeDocumentSchema = new Schema<KnowledgeDocumentRecord>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
      set: (value: unknown) => {
        if (!Array.isArray(value)) {
          return [];
        }

        return value
          .map((item) => String(item).trim().toLowerCase())
          .filter(Boolean);
      },
    },
    status: {
      type: String,
      enum: statuses,
      required: true,
      default: "draft",
      index: true,
    },
    version: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    createdByAuthUserId: {
      type: String,
      required: true,
      index: true,
    },
    updatedByAuthUserId: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

export const KnowledgeDocumentModel =
  mongoose.models.KnowledgeDocument ??
  mongoose.model<KnowledgeDocumentRecord>(
    "KnowledgeDocument",
    knowledgeDocumentSchema,
  );

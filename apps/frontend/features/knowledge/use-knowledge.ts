"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { knowledgeApi } from "./knowledge.api";
import type {
  KnowledgeDocumentFilters,
  KnowledgeDocumentPayload,
  KnowledgeIngestionJobKind,
} from "./knowledge.types";

const knowledgeDocumentsKey = (filters: KnowledgeDocumentFilters) => {
  return ["knowledge", "documents", filters] as const;
};

export const useKnowledgeDocumentsQuery = (
  filters: KnowledgeDocumentFilters,
  enabled: boolean,
) => {
  return useQuery({
    queryKey: knowledgeDocumentsKey(filters),
    queryFn: () => knowledgeApi.list(filters),
    enabled,
  });
};

export const useKnowledgeJobsQuery = (enabled: boolean) => {
  return useQuery({
    queryKey: ["knowledge", "jobs"],
    queryFn: () => knowledgeApi.listJobs(),
    enabled,
    refetchInterval: 10_000,
  });
};

export const useCreateKnowledgeDocumentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: KnowledgeDocumentPayload) => {
      return knowledgeApi.create(payload);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["knowledge", "documents"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["knowledge", "jobs"],
        }),
      ]);
    },
  });
};

export const useUpdateKnowledgeDocumentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<KnowledgeDocumentPayload>;
    }) => {
      return knowledgeApi.update(id, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["knowledge", "documents"],
      });
    },
  });
};

export const usePublishKnowledgeDocumentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => knowledgeApi.publish(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["knowledge", "documents"],
      });
    },
  });
};

export const useMoveKnowledgeDocumentToDraftMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => knowledgeApi.moveToDraft(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["knowledge", "documents"],
      });
    },
  });
};

export const useDeleteKnowledgeDocumentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      return knowledgeApi.remove(id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["knowledge", "documents"],
      });
    },
  });
};

export const useQueueKnowledgeIngestionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (kind: KnowledgeIngestionJobKind) => {
      return knowledgeApi.queueIngestion(kind);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["knowledge", "jobs"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["knowledge", "documents"],
        }),
      ]);
    },
  });
};

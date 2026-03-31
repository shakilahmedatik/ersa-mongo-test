"use client";

import {
  AlertCircleIcon,
  CheckCircle2Icon,
  Clock3Icon,
  FilePlus2Icon,
  Loader2Icon,
  RefreshCwIcon,
  RocketIcon,
  SearchIcon,
  Trash2Icon,
  WandSparklesIcon,
  XCircleIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAdminStatusQuery } from "@/features/admin/use-admin";
import { authClient } from "@/features/auth/auth-client";
import type {
  KnowledgeDocument,
  KnowledgeDocumentFilters,
  KnowledgeDocumentPayload,
  KnowledgeDocumentStatus,
  KnowledgeIngestionJob,
  KnowledgeIngestionJobKind,
} from "@/features/knowledge/knowledge.types";
import {
  useCreateKnowledgeDocumentMutation,
  useDeleteKnowledgeDocumentMutation,
  useKnowledgeDocumentsQuery,
  useKnowledgeJobsQuery,
  useMoveKnowledgeDocumentToDraftMutation,
  usePublishKnowledgeDocumentMutation,
  useQueueKnowledgeIngestionMutation,
  useUpdateKnowledgeDocumentMutation,
} from "@/features/knowledge/use-knowledge";
import { cn } from "@/lib/utils";

type FormState = {
  title: string;
  content: string;
  tags: string;
  status: KnowledgeDocumentStatus;
};

const panelClassName =
  "overflow-hidden rounded-3xl border border-border bg-card/90 shadow-sm backdrop-blur";

const emptyFormState: FormState = {
  title: "",
  content: "",
  tags: "",
  status: "draft",
};

const mapDocumentToFormState = (document: KnowledgeDocument): FormState => {
  return {
    title: document.title,
    content: document.content,
    tags: document.tags.join(", "),
    status: document.status,
  };
};

const toPayload = (value: FormState): KnowledgeDocumentPayload => {
  return {
    title: value.title.trim(),
    content: value.content.trim(),
    tags: value.tags
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean),
    status: value.status,
  };
};

const formatDate = (value: string | null) => {
  if (!value) {
    return "Not yet";
  }

  const date = new Date(value);

  return Number.isNaN(date.valueOf()) ? "Invalid date" : date.toLocaleString();
};

const getJobProgress = (job: KnowledgeIngestionJob) => {
  if (job.totalDocs <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((job.processedDocs / job.totalDocs) * 100));
};

const isActiveJob = (job: KnowledgeIngestionJob) => {
  return job.status === "pending" || job.status === "running";
};

const getIngestionLabel = (document: KnowledgeDocument) => {
  if (document.lastIngestedVersion === null) {
    return "Waiting for first ingest";
  }

  if (document.lastIngestedVersion < document.version) {
    return `Needs refresh (v${document.lastIngestedVersion} indexed, v${document.version} current)`;
  }

  return `Indexed at version ${document.lastIngestedVersion}`;
};

function AdminHeader({
  isRefreshingDocs,
  onRefreshDocs,
}: {
  isRefreshingDocs: boolean;
  onRefreshDocs: () => void;
}) {
  return (
    <header className={panelClassName}>
      <div className="flex flex-col gap-4 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Admin console
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Knowledge workspace
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Review content, adjust publish state, and run ingestion jobs without
            leaving the dashboard.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            className="rounded-xl"
            onClick={onRefreshDocs}
            type="button"
            variant="outline"
          >
            <RefreshCwIcon
              className={`size-4 ${isRefreshingDocs ? "animate-spin" : ""}`}
            />
            Refresh documents
          </Button>
          <Link
            className={cn(
              buttonVariants({
                className: "rounded-xl",
                variant: "outline",
              }),
            )}
            href="/chat"
          >
            Back to chat
          </Link>
        </div>
      </div>
    </header>
  );
}

function FlashBanner({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/90 px-4 py-3 text-sm text-foreground shadow-sm backdrop-blur">
      {message}
    </div>
  );
}

function DocumentsPanel({
  documents,
  editorMode,
  errorMessage,
  includeContent,
  isError,
  isLoading,
  onCreateNew,
  onSelectDocument,
  searchText,
  selectedDocumentId,
  setIncludeContent,
  setSearchText,
  setStatusFilter,
  statusFilter,
}: {
  documents: KnowledgeDocument[];
  editorMode: "create" | "edit";
  errorMessage: string;
  includeContent: boolean;
  isError: boolean;
  isLoading: boolean;
  onCreateNew: () => void;
  onSelectDocument: (documentId: string) => void;
  searchText: string;
  selectedDocumentId: string | null;
  setIncludeContent: (value: boolean) => void;
  setSearchText: (value: string) => void;
  setStatusFilter: (value: KnowledgeDocumentFilters["status"]) => void;
  statusFilter: KnowledgeDocumentFilters["status"];
}) {
  return (
    <section className={panelClassName}>
      <div className="border-b border-border p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-foreground">Documents</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse the knowledge library and jump into any entry quickly.
            </p>
          </div>
          <Button className="rounded-xl" onClick={onCreateNew} type="button">
            <FilePlus2Icon className="size-4" />
            New entry
          </Button>
        </div>

        <div className="mt-5 space-y-3">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="rounded-xl bg-background pl-9"
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search by title or content"
              value={searchText}
            />
          </div>

          <select
            className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none"
            onChange={(event) => {
              setStatusFilter(
                event.target.value as KnowledgeDocumentFilters["status"],
              );
            }}
            value={statusFilter}
          >
            <option value="all">All documents</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>

          <label className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-sm">
            <span className="text-muted-foreground">Show preview in list</span>
            <input
              checked={includeContent}
              onChange={(event) => setIncludeContent(event.target.checked)}
              type="checkbox"
            />
          </label>
        </div>
      </div>

      <div className="max-h-[34rem] overflow-y-auto p-4 md:max-h-[38rem]">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading documents...</p>
        ) : isError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No entries match the current filters.
          </p>
        ) : (
          <div className="space-y-3">
            {documents.map((document) => {
              const isSelected =
                editorMode === "edit" && selectedDocumentId === document.id;

              return (
                <button
                  className={cn(
                    "w-full rounded-2xl border p-3 text-left transition-all",
                    isSelected
                      ? "border-primary/40 bg-primary/8 shadow-[0_0_20px_rgba(8,145,178,0.08)]"
                      : "border-border bg-background hover:border-primary/20",
                  )}
                  key={document.id}
                  onClick={() => onSelectDocument(document.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="line-clamp-1 text-sm font-semibold text-foreground">
                      {document.title}
                    </p>
                    <span
                      className={`rounded-full border px-2 py-1 text-[11px] uppercase tracking-[0.14em] ${
                        document.status === "published"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-700"
                      }`}
                    >
                      {document.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Updated: {formatDate(document.updatedAt)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>v{document.version}</span>
                    <span>•</span>
                    <span>{getIngestionLabel(document)}</span>
                  </div>
                  {includeContent ? (
                    <p className="mt-3 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {document.content || "No content preview"}
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function EditorPanel({
  currentDocument,
  errorMessage,
  formState,
  isBusy,
  isError,
  isLoading,
  mode,
  onContentChange,
  onDelete,
  onMoveToDraft,
  onPublish,
  onSave,
  onStatusChange,
  onTagsChange,
  onTitleChange,
}: {
  currentDocument: KnowledgeDocument | null;
  errorMessage: string;
  formState: FormState;
  isBusy: boolean;
  isError: boolean;
  isLoading: boolean;
  mode: "create" | "edit";
  onContentChange: (value: string) => void;
  onDelete: (document: KnowledgeDocument) => void;
  onMoveToDraft: () => void;
  onPublish: () => void;
  onSave: () => void;
  onStatusChange: (value: KnowledgeDocumentStatus) => void;
  onTagsChange: (value: string) => void;
  onTitleChange: (value: string) => void;
}) {
  const isPublished = formState.status === "published";

  return (
    <section className={panelClassName}>
      <div className="border-b border-border p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-foreground">
              {mode === "create" ? "Create entry" : "Edit entry"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "create"
                ? "Draft a new knowledge entry and save or publish it from here."
                : "Update content, republish changes, or move the entry back to draft."}
            </p>
          </div>
          <span
            className={`rounded-full border px-2 py-1 text-[11px] uppercase tracking-[0.14em] ${
              isPublished
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                : "border-amber-500/30 bg-amber-500/10 text-amber-700"
            }`}
          >
            {formState.status}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">
            Loading entry details...
          </p>
        ) : null}

        {isError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <div className="flex items-start gap-2">
              <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="doc-title"
          >
            Title
          </label>
          <Input
            className="rounded-xl bg-background"
            disabled={isBusy}
            id="doc-title"
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Admissions policy summary"
            value={formState.title}
          />
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="doc-tags"
          >
            Tags
          </label>
          <Input
            className="rounded-xl bg-background"
            disabled={isBusy}
            id="doc-tags"
            onChange={(event) => onTagsChange(event.target.value)}
            placeholder="admissions, billing, onboarding"
            value={formState.tags}
          />
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="doc-status"
          >
            Status
          </label>
          <select
            className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none"
            id="doc-status"
            onChange={(event) => {
              onStatusChange(event.target.value as KnowledgeDocumentStatus);
            }}
            value={formState.status}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-medium text-foreground"
            htmlFor="doc-content"
          >
            Content
          </label>
          <Textarea
            className="min-h-72 rounded-2xl bg-background"
            disabled={isBusy}
            id="doc-content"
            onChange={(event) => onContentChange(event.target.value)}
            placeholder="Write or paste the knowledge content here..."
            value={formState.content}
          />
        </div>

        {mode === "edit" && currentDocument ? (
          <div className="grid gap-2 rounded-2xl border border-border bg-background px-3 py-3 text-xs text-muted-foreground sm:grid-cols-2">
            <p>ID: {currentDocument.id}</p>
            <p>Version: {currentDocument.version}</p>
            <p>Created: {formatDate(currentDocument.createdAt)}</p>
            <p>Updated: {formatDate(currentDocument.updatedAt)}</p>
            <p>Published: {formatDate(currentDocument.publishedAt)}</p>
            <p>Last ingest: {formatDate(currentDocument.lastIngestedAt)}</p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border p-4 sm:p-5">
        <Button
          className="rounded-xl"
          disabled={isBusy}
          onClick={onSave}
          type="button"
          variant="outline"
        >
          {isBusy ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <CheckCircle2Icon className="size-4" />
          )}
          Save
        </Button>
        <Button
          className="rounded-xl"
          disabled={isBusy || isPublished}
          onClick={onPublish}
          type="button"
        >
          {isBusy && !isPublished ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : isPublished ? (
            <CheckCircle2Icon className="size-4" />
          ) : (
            <WandSparklesIcon className="size-4" />
          )}
          {isPublished ? "Published" : "Publish"}
        </Button>
        {mode === "edit" && isPublished ? (
          <Button
            className="rounded-xl"
            disabled={isBusy}
            onClick={onMoveToDraft}
            type="button"
            variant="outline"
          >
            <Clock3Icon className="size-4" />
            Move to draft
          </Button>
        ) : null}
        {mode === "edit" && currentDocument ? (
          <Button
            className="rounded-xl"
            disabled={isBusy}
            onClick={() => onDelete(currentDocument)}
            type="button"
            variant="outline"
          >
            <Trash2Icon className="size-4" />
            Delete
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function IngestionPanel({
  ingestKind,
  isFetchingJobs,
  isJobsError,
  isTriggering,
  jobs,
  jobsErrorMessage,
  onRefreshJobs,
  onSelectJob,
  onTriggerIngestion,
  selectedJob,
  selectedJobId,
  setIngestKind,
}: {
  ingestKind: KnowledgeIngestionJobKind;
  isFetchingJobs: boolean;
  isJobsError: boolean;
  isTriggering: boolean;
  jobs: KnowledgeIngestionJob[];
  jobsErrorMessage: string;
  onRefreshJobs: () => void;
  onSelectJob: (jobId: string) => void;
  onTriggerIngestion: () => void;
  selectedJob: KnowledgeIngestionJob | null;
  selectedJobId: string | null;
  setIngestKind: (kind: KnowledgeIngestionJobKind) => void;
}) {
  const progress = selectedJob ? getJobProgress(selectedJob) : 0;

  return (
    <section className={panelClassName}>
      <div className="border-b border-border p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-foreground">
              Ingestion jobs
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Queue incremental updates or run a full vector refresh.
            </p>
          </div>
          <Button
            className="rounded-xl"
            onClick={onRefreshJobs}
            type="button"
            variant="outline"
          >
            <RefreshCwIcon
              className={`size-4 ${isFetchingJobs ? "animate-spin" : ""}`}
            />
            Refresh jobs
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <select
            className="flex h-11 min-w-44 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none"
            onChange={(event) => {
              setIngestKind(event.target.value as KnowledgeIngestionJobKind);
            }}
            value={ingestKind}
          >
            <option value="incremental">Incremental</option>
            <option value="full">Full rebuild</option>
          </select>
          <Button
            className="rounded-xl"
            disabled={isTriggering}
            onClick={onTriggerIngestion}
            type="button"
          >
            {isTriggering ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <RocketIcon className="size-4" />
            )}
            Start ingestion
          </Button>
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-border bg-background p-3">
          <p className="mb-3 text-sm font-semibold text-foreground">
            Recent jobs
          </p>
          {isJobsError ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {jobsErrorMessage}
            </div>
          ) : jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No ingestion jobs yet.
            </p>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {jobs.map((job) => {
                return (
                  <button
                    className={cn(
                      "w-full rounded-2xl border p-3 text-left transition-all",
                      selectedJobId === job.id
                        ? "border-primary/40 bg-primary/8"
                        : "border-border bg-card hover:border-primary/20",
                    )}
                    key={job.id}
                    onClick={() => onSelectJob(job.id)}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {job.kind === "full"
                          ? "Full rebuild"
                          : "Incremental run"}
                      </p>
                      <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        {job.status}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatDate(job.createdAt)}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-background p-3">
          <p className="mb-3 text-sm font-semibold text-foreground">
            Selected job details
          </p>
          {!selectedJob ? (
            <p className="text-sm text-muted-foreground">
              Select a job to inspect progress.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">
                  {selectedJob.kind === "full"
                    ? "Full index rebuild"
                    : "Incremental ingestion"}
                </p>
                <div
                  className={`flex items-center gap-1 text-sm ${
                    selectedJob.status === "completed"
                      ? "text-emerald-600"
                      : selectedJob.status === "failed"
                        ? "text-destructive"
                        : "text-amber-600"
                  }`}
                >
                  {selectedJob.status === "completed" ? (
                    <CheckCircle2Icon className="size-4" />
                  ) : selectedJob.status === "failed" ? (
                    <XCircleIcon className="size-4" />
                  ) : (
                    <Loader2Icon className="size-4 animate-spin" />
                  )}
                  <span className="capitalize">{selectedJob.status}</span>
                </div>
              </div>

              <div>
                <div className="h-2 overflow-hidden rounded-full bg-border/70">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Processed {selectedJob.processedDocs} of{" "}
                  {selectedJob.totalDocs} documents ({progress}%)
                </p>
              </div>

              <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                <p>Job ID: {selectedJob.id}</p>
                <p>Triggered by: {selectedJob.triggeredBy}</p>
                <p>Created: {formatDate(selectedJob.createdAt)}</p>
                <p>Started: {formatDate(selectedJob.startedAt)}</p>
                <p>Finished: {formatDate(selectedJob.finishedAt)}</p>
              </div>

              {selectedJob.error ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {selectedJob.error}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4 text-xs text-muted-foreground sm:p-5">
        <p>
          {jobs.some(isActiveJob)
            ? "Active jobs refresh automatically while processing is underway."
            : "Refresh the list to check the latest ingestion state."}
        </p>
        {jobs.some(isActiveJob) ? (
          <div className="flex items-center gap-1 text-amber-600">
            <Loader2Icon className="size-3.5 animate-spin" />
            <span>Ingestion in progress</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function KnowledgeAdminDashboard() {
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const adminStatusQuery = useAdminStatusQuery(Boolean(session?.user));
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<KnowledgeDocumentFilters["status"]>("all");
  const [includeContent, setIncludeContent] = useState(false);
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(
    null,
  );
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [ingestKind, setIngestKind] =
    useState<KnowledgeIngestionJobKind>("incremental");
  const [formState, setFormState] = useState<FormState>(emptyFormState);
  const [feedback, setFeedback] = useState<string | null>(null);

  const filters = useMemo<KnowledgeDocumentFilters>(() => {
    return {
      query: searchQuery,
      status: statusFilter,
    };
  }, [searchQuery, statusFilter]);

  const documentsQuery = useKnowledgeDocumentsQuery(
    filters,
    Boolean(session?.user && adminStatusQuery.data?.isAdmin),
  );
  const jobsQuery = useKnowledgeJobsQuery(
    Boolean(session?.user && adminStatusQuery.data?.isAdmin),
  );
  const createMutation = useCreateKnowledgeDocumentMutation();
  const updateMutation = useUpdateKnowledgeDocumentMutation();
  const publishMutation = usePublishKnowledgeDocumentMutation();
  const moveToDraftMutation = useMoveKnowledgeDocumentToDraftMutation();
  const deleteMutation = useDeleteKnowledgeDocumentMutation();
  const queueIngestionMutation = useQueueKnowledgeIngestionMutation();

  const documents = documentsQuery.data?.documents ?? [];
  const jobs = jobsQuery.data?.jobs ?? [];
  const editingDocument =
    editingDocumentId !== null
      ? (documents.find((document) => document.id === editingDocumentId) ??
        null)
      : null;
  const selectedJob =
    selectedJobId !== null
      ? (jobs.find((job) => job.id === selectedJobId) ?? null)
      : (jobs[0] ?? null);
  const editorMode = editingDocumentId ? "edit" : "create";
  const isBusy =
    createMutation.isPending ||
    updateMutation.isPending ||
    publishMutation.isPending ||
    moveToDraftMutation.isPending ||
    deleteMutation.isPending ||
    queueIngestionMutation.isPending;

  useEffect(() => {
    if (editingDocument) {
      setFormState(mapDocumentToFormState(editingDocument));
    }
  }, [editingDocument]);

  useEffect(() => {
    if (!selectedJobId && jobs[0]?.id) {
      setSelectedJobId(jobs[0].id);
    }
  }, [jobs, selectedJobId]);

  const resetEditor = () => {
    setEditingDocumentId(null);
    setFormState(emptyFormState);
  };

  const handleSave = async () => {
    const payload = toPayload(formState);

    if (
      payload.title.length === 0 ||
      payload.content.length === 0 ||
      payload.tags.length === 0
    ) {
      setFeedback("Title, content, and at least one tag are required.");
      return;
    }

    try {
      setFeedback(null);

      if (editingDocumentId) {
        await updateMutation.mutateAsync({
          id: editingDocumentId,
          payload,
        });
        setFeedback("Knowledge entry updated.");
      } else {
        await createMutation.mutateAsync(payload);
        setFeedback("Knowledge entry created.");
      }

      resetEditor();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Request failed.");
    }
  };

  const handlePublish = async () => {
    if (!editingDocumentId) {
      return;
    }

    try {
      setFeedback(null);
      await publishMutation.mutateAsync(editingDocumentId);
      setFeedback("Entry published.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Request failed.");
    }
  };

  const handleMoveToDraft = async () => {
    if (!editingDocumentId) {
      return;
    }

    try {
      setFeedback(null);
      await moveToDraftMutation.mutateAsync(editingDocumentId);
      setFeedback("Entry moved to draft.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Request failed.");
    }
  };

  const handleDelete = async (document: KnowledgeDocument) => {
    const shouldDelete = window.confirm(
      `Delete "${document.title}"? This action cannot be undone.`,
    );

    if (!shouldDelete) {
      return;
    }

    try {
      setFeedback(null);
      await deleteMutation.mutateAsync(document.id);
      setFeedback("Knowledge entry deleted.");
      resetEditor();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Request failed.");
    }
  };

  const handleQueueIngestion = async () => {
    try {
      setFeedback(null);
      await queueIngestionMutation.mutateAsync(ingestKind);
      setFeedback(
        ingestKind === "full"
          ? "Full rebuild queued."
          : "Incremental ingestion queued.",
      );
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Request failed.");
    }
  };

  if (isSessionPending) {
    return <LoadingSpinner text="Preparing admin workspace" />;
  }

  if (!session?.user) {
    return (
      <main className="min-h-[calc(100vh-65px)] bg-[linear-gradient(180deg,rgba(8,145,178,0.08),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.12),transparent_55%)] px-4 py-14 sm:px-6 md:py-16">
        <div className="mx-auto max-w-7xl rounded-3xl border border-border bg-card/90 p-8 shadow-sm backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Admin workspace
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
            Sign in to manage the knowledge workspace.
          </h1>
        </div>
      </main>
    );
  }

  if (adminStatusQuery.isPending) {
    return <LoadingSpinner text="Checking admin access" />;
  }

  if (adminStatusQuery.isError || !adminStatusQuery.data?.isAdmin) {
    return (
      <main className="min-h-[calc(100vh-65px)] bg-[linear-gradient(180deg,rgba(8,145,178,0.08),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.12),transparent_55%)] px-4 py-14 sm:px-6 md:py-16">
        <div className="mx-auto max-w-7xl rounded-3xl border border-border bg-card/90 p-8 shadow-sm backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Access denied
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
            This account cannot open the admin workspace.
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Add the account email to `ADMIN_EMAILS` in the backend environment
            to unlock this page.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-[calc(100vh-65px)] overflow-hidden bg-[linear-gradient(180deg,rgba(8,145,178,0.08),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.12),transparent_55%)] px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(8,145,178,0.08),transparent_40%),radial-gradient(circle_at_85%_20%,rgba(14,165,233,0.08),transparent_36%),radial-gradient(circle_at_50%_100%,rgba(15,23,42,0.1),transparent_48%)]" />

      <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-6">
        <AdminHeader
          isRefreshingDocs={documentsQuery.isFetching}
          onRefreshDocs={() => {
            void documentsQuery.refetch();
          }}
        />

        {feedback ? <FlashBanner message={feedback} /> : null}

        <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)] xl:gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <DocumentsPanel
            documents={documents}
            editorMode={editorMode}
            errorMessage={
              documentsQuery.error instanceof Error
                ? documentsQuery.error.message
                : "Unable to load documents."
            }
            includeContent={includeContent}
            isError={documentsQuery.isError}
            isLoading={documentsQuery.isPending}
            onCreateNew={resetEditor}
            onSelectDocument={(documentId) => {
              setEditingDocumentId(documentId);
              setFeedback(null);
            }}
            searchText={searchQuery}
            selectedDocumentId={editingDocumentId}
            setIncludeContent={setIncludeContent}
            setSearchText={setSearchQuery}
            setStatusFilter={setStatusFilter}
            statusFilter={statusFilter}
          />

          <div className="space-y-6">
            <EditorPanel
              currentDocument={editingDocument}
              errorMessage={
                documentsQuery.error instanceof Error
                  ? documentsQuery.error.message
                  : "Unable to load document details."
              }
              formState={formState}
              isBusy={isBusy}
              isError={documentsQuery.isError}
              isLoading={false}
              mode={editorMode}
              onContentChange={(value) => {
                setFormState((current) => ({
                  ...current,
                  content: value,
                }));
              }}
              onDelete={(document) => {
                void handleDelete(document);
              }}
              onMoveToDraft={() => {
                void handleMoveToDraft();
              }}
              onPublish={() => {
                void handlePublish();
              }}
              onSave={() => {
                void handleSave();
              }}
              onStatusChange={(value) => {
                setFormState((current) => ({
                  ...current,
                  status: value,
                }));
              }}
              onTagsChange={(value) => {
                setFormState((current) => ({
                  ...current,
                  tags: value,
                }));
              }}
              onTitleChange={(value) => {
                setFormState((current) => ({
                  ...current,
                  title: value,
                }));
              }}
            />

            <IngestionPanel
              ingestKind={ingestKind}
              isFetchingJobs={jobsQuery.isFetching}
              isJobsError={jobsQuery.isError}
              isTriggering={queueIngestionMutation.isPending}
              jobs={jobs}
              jobsErrorMessage={
                jobsQuery.error instanceof Error
                  ? jobsQuery.error.message
                  : "Unable to load jobs."
              }
              onRefreshJobs={() => {
                void jobsQuery.refetch();
              }}
              onSelectJob={setSelectedJobId}
              onTriggerIngestion={() => {
                void handleQueueIngestion();
              }}
              selectedJob={selectedJob}
              selectedJobId={selectedJobId}
              setIngestKind={setIngestKind}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

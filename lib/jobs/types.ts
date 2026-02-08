export type JobStatus = "queued" | "running" | "done" | "error";

export type StoredInputFile = {
  field: string;
  originalName: string;
  contentType: string;
  size: number;
  path: string;
};

export type StoredJobInput = {
  fields: Record<string, string[]>;
  files: Record<string, StoredInputFile[]>;
  totalFiles: number;
  totalBytes: number;
};

export type JobDownload = {
  path: string;
  filename: string;
  contentType: string;
};

export type JobRecord = {
  id: string;
  tool: string;
  status: JobStatus;
  progress: number;
  message: string;
  createdAt: number;
  updatedAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  expiresAt: number;
  workDir: string;
  input: StoredJobInput;
  download: JobDownload | null;
  errorMessage: string | null;
};

export type JobStatusPayload = {
  jobId: string;
  tool: string;
  status: JobStatus;
  progress: number;
  message: string;
  downloadUrl?: string;
};


import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { ApiError } from "@/lib/server/api";
import {
  APP_LIMITS,
  APP_LIMITS_BYTES,
  JOB_RETENTION_MS,
  JOB_TIMEOUT_MS,
} from "@/lib/config";
import type { JobRecord, JobStatusPayload, StoredInputFile, StoredJobInput } from "@/lib/jobs/types";
import { processToolJob, isSupportedTool } from "@/lib/tools/processors";

const JOB_ROOT = path.join("/tmp", "pdf-web-app-jobs");
const jobs = new Map<string, JobRecord>();
const queue: string[] = [];
let running = false;
let cleanupTimer: NodeJS.Timeout | null = null;

async function ensureJobRoot(): Promise<void> {
  await fs.mkdir(JOB_ROOT, { recursive: true });
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function now(): number {
  return Date.now();
}

function jobLog(jobId: string, message: string): void {
  console.log(`[job ${jobId}] ${message}`);
}

function buildStatusPayload(job: JobRecord): JobStatusPayload {
  return {
    jobId: job.id,
    tool: job.tool,
    status: job.status,
    progress: job.progress,
    message: job.status === "error" ? job.errorMessage || job.message : job.message,
    downloadUrl:
      job.status === "done" ? `/api/jobs/${job.id}/download` : undefined,
  };
}

function ensureCleanupLoop(): void {
  if (cleanupTimer) {
    return;
  }
  cleanupTimer = setInterval(() => {
    void cleanupExpiredJobs();
  }, 60_000);
  cleanupTimer.unref();
}

async function cleanupExpiredJobs(): Promise<void> {
  const nowTs = now();
  for (const [jobId, job] of jobs.entries()) {
    if (job.status === "running" || job.status === "queued") {
      continue;
    }
    if (job.expiresAt > nowTs) {
      continue;
    }

    try {
      await fs.rm(job.workDir, { recursive: true, force: true });
    } catch (error) {
      console.error(`[job ${jobId}] cleanup failed:`, error);
    } finally {
      jobs.delete(jobId);
    }
  }
}

function ensureExistingJob(jobId: string): JobRecord {
  const job = jobs.get(jobId);
  if (!job) {
    throw new ApiError("Job not found.", 404);
  }
  return job;
}

async function persistJobInput(
  formData: FormData,
  inputDir: string,
): Promise<StoredJobInput> {
  const fields: Record<string, string[]> = {};
  const files: Record<string, StoredInputFile[]> = {};
  let totalFiles = 0;
  let totalBytes = 0;
  let fileIndex = 0;

  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      const existing = fields[key] ?? [];
      existing.push(value);
      fields[key] = existing;
      continue;
    }

    if (!(value instanceof File)) {
      continue;
    }

    totalFiles += 1;
    totalBytes += value.size;

    if (totalFiles > APP_LIMITS.maxFiles) {
      throw new ApiError(
        `You can upload up to ${APP_LIMITS.maxFiles} files at once.`,
        400,
      );
    }

    if (value.size > APP_LIMITS_BYTES.maxFileBytes) {
      throw new ApiError(
        `"${value.name}" exceeds ${Math.floor(
          APP_LIMITS_BYTES.maxFileBytes / (1024 * 1024),
        )}MB limit.`,
        400,
      );
    }

    const safeName = sanitizeFilename(value.name || `upload-${fileIndex}`);
    const targetName = `${String(fileIndex).padStart(3, "0")}-${safeName}`;
    const filePath = path.join(inputDir, targetName);
    const bytes = Buffer.from(await value.arrayBuffer());
    await fs.writeFile(filePath, bytes);

    const existing = files[key] ?? [];
    existing.push({
      field: key,
      originalName: value.name || safeName,
      contentType: value.type || "application/octet-stream",
      size: value.size,
      path: filePath,
    });
    files[key] = existing;
    fileIndex += 1;
  }

  if (totalFiles > 0 && totalBytes > APP_LIMITS_BYTES.maxTotalBytes) {
    throw new ApiError(
      `Total upload size exceeds ${Math.floor(
        APP_LIMITS_BYTES.maxTotalBytes / (1024 * 1024),
      )}MB limit.`,
      400,
    );
  }

  return {
    fields,
    files,
    totalFiles,
    totalBytes,
  };
}

async function runJob(job: JobRecord): Promise<void> {
  job.status = "running";
  job.progress = 1;
  job.startedAt = now();
  job.updatedAt = now();
  job.message = "Running...";
  job.errorMessage = null;
  jobLog(job.id, `started tool=${job.tool}`);

  const inputDir = path.join(job.workDir, "input");
  const outputDir = path.join(job.workDir, "output");

  const setProgress = (progress: number, message: string) => {
    const normalized = Math.max(0, Math.min(100, Math.round(progress)));
    job.progress = normalized;
    job.message = message;
    job.updatedAt = now();
    jobLog(job.id, `${normalized}% ${message}`);
  };

  const failJob = (message: string) => {
    job.status = "error";
    job.progress = 100;
    job.message = "Error";
    job.errorMessage = message;
    job.finishedAt = now();
    job.updatedAt = now();
    job.expiresAt = now() + JOB_RETENTION_MS;
    jobLog(job.id, `failed: ${message}`);
  };

  try {
    let timeoutHandle: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(
          new ApiError(
            `Job exceeded ${Math.floor(JOB_TIMEOUT_MS / 60000)} minutes and was stopped.`,
            408,
          ),
        );
      }, JOB_TIMEOUT_MS);
    });

    const result = await Promise.race([
      processToolJob({
        jobId: job.id,
        tool: job.tool,
        workDir: job.workDir,
        inputDir,
        outputDir,
        input: job.input,
        setProgress,
        log: (message: string) => jobLog(job.id, message),
      }),
      timeoutPromise,
    ]).finally(() => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    });

    job.status = "done";
    job.progress = 100;
    job.message = "Done";
    job.download = {
      path: result.outputPath,
      filename: result.filename,
      contentType: result.contentType,
    };
    job.finishedAt = now();
    job.updatedAt = now();
    job.expiresAt = now() + JOB_RETENTION_MS;
    jobLog(job.id, `completed: ${result.filename}`);
  } catch (error) {
    if (error instanceof ApiError) {
      failJob(error.message);
      return;
    }
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    failJob(message);
  }
}

async function pumpQueue(): Promise<void> {
  if (running) {
    return;
  }
  running = true;

  while (queue.length > 0) {
    const jobId = queue.shift();
    if (!jobId) {
      continue;
    }
    const job = jobs.get(jobId);
    if (!job || job.status !== "queued") {
      continue;
    }
    await runJob(job);
  }

  running = false;
}

export async function createJob(
  tool: string,
  formData: FormData,
): Promise<{ jobId: string }> {
  if (!isSupportedTool(tool)) {
    throw new ApiError(`Unsupported tool "${tool}".`, 404);
  }

  await ensureJobRoot();
  ensureCleanupLoop();

  const jobId = randomUUID();
  const workDir = path.join(JOB_ROOT, jobId);
  const inputDir = path.join(workDir, "input");
  const outputDir = path.join(workDir, "output");
  await fs.mkdir(inputDir, { recursive: true });
  await fs.mkdir(outputDir, { recursive: true });

  let input: StoredJobInput;
  try {
    input = await persistJobInput(formData, inputDir);
  } catch (error) {
    await fs.rm(workDir, { recursive: true, force: true });
    throw error;
  }

  const createdAt = now();
  const job: JobRecord = {
    id: jobId,
    tool,
    status: "queued",
    progress: 0,
    message: "Queued",
    createdAt,
    updatedAt: createdAt,
    startedAt: null,
    finishedAt: null,
    expiresAt: createdAt + JOB_RETENTION_MS,
    workDir,
    input,
    download: null,
    errorMessage: null,
  };

  jobs.set(jobId, job);
  queue.push(jobId);
  jobLog(job.id, `queued tool=${tool}`);
  void pumpQueue();

  return { jobId };
}

export function getJobStatus(jobId: string): JobStatusPayload {
  ensureCleanupLoop();
  const job = ensureExistingJob(jobId);
  return buildStatusPayload(job);
}

export function getJobForDownload(jobId: string): {
  path: string;
  filename: string;
  contentType: string;
} {
  ensureCleanupLoop();
  const job = ensureExistingJob(jobId);
  if (job.status !== "done" || !job.download) {
    if (job.status === "error") {
      throw new ApiError(job.errorMessage || "Job failed.", 409);
    }
    throw new ApiError("Job output is not ready yet.", 409);
  }
  return job.download;
}

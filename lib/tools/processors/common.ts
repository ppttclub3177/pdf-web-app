import { promises as fs } from "node:fs";
import path from "node:path";
import { createWriteStream } from "node:fs";
import archiver from "archiver";
import { PDFDocument } from "pdf-lib";
import {
  APP_LIMITS,
  HTML_TO_PDF_MAX_BYTES,
  JOB_TIMEOUT_MS,
  OCR_MAX_PAGES,
  OFFICE_MAX_FILE_BYTES,
} from "@/lib/config";
import { ApiError } from "@/lib/server/api";
import { isCommandAvailable, runCommand } from "@/lib/server/command";
import type { StoredInputFile, StoredJobInput } from "@/lib/jobs/types";
import type { ToolProcessContext, ToolProcessResult } from "@/lib/tools/processor-types";

export const HTML_TO_PDF_TIMEOUT_MS = 60_000;
export const COMMAND_TIMEOUT_MS = Math.min(JOB_TIMEOUT_MS, 9 * 60 * 1000);

let hasPdfToTextSupport: boolean | null = null;

export function getField(
  input: StoredJobInput,
  key: string,
  fallback = "",
): string {
  const values = input.fields[key];
  if (!values || values.length === 0) {
    return fallback;
  }
  return values[0] ?? fallback;
}

export function getBooleanField(
  input: StoredJobInput,
  key: string,
  fallback = false,
): boolean {
  const value = getField(input, key, fallback ? "1" : "0").trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

export function getRequiredFiles(
  input: StoredJobInput,
  key: string,
  options?: {
    min?: number;
    max?: number;
  },
): StoredInputFile[] {
  const files = input.files[key] ?? [];
  const min = options?.min ?? 1;
  const max = options?.max ?? APP_LIMITS.maxFiles;
  if (files.length < min) {
    throw new ApiError(`Missing required file field "${key}".`, 400);
  }
  if (files.length > max) {
    throw new ApiError(`"${key}" supports up to ${max} file(s).`, 400);
  }
  return files;
}

export function getRequiredFile(
  input: StoredJobInput,
  key: string,
): StoredInputFile {
  return getRequiredFiles(input, key, { min: 1, max: 1 })[0];
}

export function getOptionalFile(
  input: StoredJobInput,
  key: string,
): StoredInputFile | null {
  const files = input.files[key] ?? [];
  if (files.length === 0) {
    return null;
  }
  if (files.length > 1) {
    throw new ApiError(`"${key}" supports only one file.`, 400);
  }
  return files[0];
}

export function assertTotalUploadLimits(input: StoredJobInput): void {
  if (input.totalFiles > APP_LIMITS.maxFiles) {
    throw new ApiError(
      `You can upload up to ${APP_LIMITS.maxFiles} files at once.`,
      400,
    );
  }
  if (input.totalBytes > APP_LIMITS.maxTotalMb * 1024 * 1024) {
    throw new ApiError(
      `Total upload size exceeds ${APP_LIMITS.maxTotalMb}MB limit.`,
      400,
    );
  }
}

export function assertPdfFile(file: StoredInputFile): void {
  const lowerName = file.originalName.toLowerCase();
  const isPdf =
    lowerName.endsWith(".pdf") || file.contentType === "application/pdf";
  if (!isPdf) {
    throw new ApiError(`"${file.originalName}" is not a PDF file.`, 400);
  }
}

export function assertImageFile(file: StoredInputFile): void {
  const lowerName = file.originalName.toLowerCase();
  const isImage =
    file.contentType === "image/jpeg" ||
    file.contentType === "image/png" ||
    lowerName.endsWith(".jpg") ||
    lowerName.endsWith(".jpeg") ||
    lowerName.endsWith(".png");
  if (!isImage) {
    throw new ApiError(`"${file.originalName}" must be JPG or PNG.`, 400);
  }
}

export function assertExt(file: StoredInputFile, allowed: string[]): void {
  const ext = path.extname(file.originalName).toLowerCase();
  if (!allowed.includes(ext)) {
    throw new ApiError(
      `"${file.originalName}" must use one of: ${allowed.join(", ")}`,
      400,
    );
  }
}

export async function loadPdf(file: StoredInputFile): Promise<PDFDocument> {
  try {
    const bytes = await fs.readFile(file.path);
    return await PDFDocument.load(bytes);
  } catch {
    throw new ApiError(`"${file.originalName}" is not a valid PDF file.`, 400);
  }
}

export async function ensureCommandAvailable(
  command: string,
  message: string,
): Promise<void> {
  const available = await isCommandAvailable(command);
  if (!available) {
    throw new ApiError(message, 503);
  }
}

export async function writeUint8Array(
  outputPath: string,
  bytes: Uint8Array,
): Promise<void> {
  await fs.writeFile(outputPath, Buffer.from(bytes));
}

export async function writeArrayBuffer(
  outputPath: string,
  buffer: ArrayBuffer,
): Promise<void> {
  await fs.writeFile(outputPath, Buffer.from(buffer));
}

export async function zipFileEntries(
  outputZipPath: string,
  entries: Array<{ path: string; name: string }>,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(outputZipPath);
    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    output.on("close", () => resolve());
    output.on("error", (error) => reject(error));
    archive.on("error", (error) => reject(error));

    archive.pipe(output);
    for (const entry of entries) {
      archive.file(entry.path, { name: entry.name });
    }
    void archive.finalize();
  });
}

export async function canExtractPdfTextLayer(): Promise<boolean> {
  if (hasPdfToTextSupport !== null) {
    return hasPdfToTextSupport;
  }
  hasPdfToTextSupport = await isCommandAvailable("pdftotext");
  return hasPdfToTextSupport;
}

export async function extractPdfPageText(
  pdfPath: string,
  pageNumber: number,
): Promise<string> {
  if (!(await canExtractPdfTextLayer())) {
    return "";
  }

  const result = await runCommand(
    "pdftotext",
    ["-f", String(pageNumber), "-l", String(pageNumber), pdfPath, "-"],
    { timeoutMs: 60_000 },
  );
  return result.stdout.trim();
}

export function pageLimitError(pageCount: number): ApiError {
  return new ApiError(
    `PDF has ${pageCount} pages. Limit is ${APP_LIMITS.maxPages}.`,
    413,
  );
}

export function getOutputPath(
  context: ToolProcessContext,
  filename: string,
): string {
  return path.join(context.outputDir, filename);
}

export async function makeRuntimeFile(file: StoredInputFile): Promise<File> {
  const bytes = await fs.readFile(file.path);
  return new File([bytes], file.originalName, { type: file.contentType });
}

export function progressForPage(
  pageNumber: number,
  pageCount: number,
  start = 10,
  end = 90,
): number {
  if (pageCount <= 1) {
    return end;
  }
  const ratio = (pageNumber - 1) / (pageCount - 1);
  return Math.round(start + (end - start) * ratio);
}

export function isPng(file: StoredInputFile): boolean {
  const lower = file.originalName.toLowerCase();
  return file.contentType === "image/png" || lower.endsWith(".png");
}

export function isJpeg(file: StoredInputFile): boolean {
  const lower = file.originalName.toLowerCase();
  return (
    file.contentType === "image/jpeg" ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg")
  );
}

export function assertOfficeInputSize(file: StoredInputFile): void {
  if (file.size > OFFICE_MAX_FILE_BYTES) {
    throw new ApiError(
      `"${file.originalName}" exceeds ${Math.floor(
        OFFICE_MAX_FILE_BYTES / (1024 * 1024),
      )}MB office conversion limit.`,
      400,
    );
  }
}

export function maxHtmlSizeKb(): number {
  return Math.floor(HTML_TO_PDF_MAX_BYTES / 1024);
}

export function ocrLimitReached(ocrUsed: number): boolean {
  return ocrUsed >= OCR_MAX_PAGES;
}

export async function doneResult(
  outputPath: string,
  filename: string,
  contentType: string,
): Promise<ToolProcessResult> {
  const stats = await fs.stat(outputPath);
  if (!stats.isFile() || stats.size <= 0) {
    throw new ApiError(`Generated output "${filename}" is empty.`, 500);
  }
  return { outputPath, filename, contentType };
}


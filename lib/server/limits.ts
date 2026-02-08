import { APP_LIMITS, APP_LIMITS_BYTES } from "@/lib/config";
import { ApiError } from "@/lib/server/api";

export function assertMaxFileCount(files: File[]): void {
  if (files.length === 0) {
    throw new ApiError("Please upload at least one file.", 400);
  }

  if (files.length > APP_LIMITS.maxFiles) {
    throw new ApiError(
      `You can upload up to ${APP_LIMITS.maxFiles} files at once.`,
      400,
    );
  }
}

export function assertFileSize(file: File): void {
  if (file.size > APP_LIMITS_BYTES.maxFileBytes) {
    throw new ApiError(
      `"${file.name}" exceeds ${APP_LIMITS.maxFileMb}MB limit.`,
      400,
    );
  }
}

export function assertTotalSize(files: File[]): void {
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > APP_LIMITS_BYTES.maxTotalBytes) {
    throw new ApiError(
      `Total upload size exceeds ${APP_LIMITS.maxTotalMb}MB limit.`,
      400,
    );
  }
}

export function assertPdfMime(file: File): void {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    throw new ApiError(`"${file.name}" is not a PDF file.`, 400);
  }
}

export function assertJpgPngMime(file: File): void {
  const name = file.name.toLowerCase();
  const isValid =
    file.type === "image/jpeg" ||
    file.type === "image/png" ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".png");
  if (!isValid) {
    throw new ApiError(`"${file.name}" must be JPG or PNG.`, 400);
  }
}

export function assertJpgMime(file: File): void {
  const name = file.name.toLowerCase();
  const isValid =
    file.type === "image/jpeg" || name.endsWith(".jpg") || name.endsWith(".jpeg");
  if (!isValid) {
    throw new ApiError(`"${file.name}" must be JPG.`, 400);
  }
}

export function assertMaxPages(pageCount: number): void {
  if (pageCount > APP_LIMITS.maxPages) {
    throw new ApiError(
      `PDF has ${pageCount} pages. Limit is ${APP_LIMITS.maxPages}.`,
      400,
    );
  }
}

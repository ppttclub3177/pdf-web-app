import { ApiError } from "@/lib/server/api";
import {
  assertFileSize,
  assertMaxFileCount,
  assertTotalSize,
} from "@/lib/server/limits";

export function getRequiredFile(formData: FormData, key: string): File {
  const entry = formData.get(key);
  if (!(entry instanceof File)) {
    throw new ApiError(`Missing required file field "${key}".`, 400);
  }
  assertFileSize(entry);
  return entry;
}

export function getOptionalFile(formData: FormData, key: string): File | null {
  const entry = formData.get(key);
  if (!entry) {
    return null;
  }
  if (!(entry instanceof File)) {
    throw new ApiError(`Invalid file field "${key}".`, 400);
  }
  assertFileSize(entry);
  return entry;
}

export function getRequiredFiles(formData: FormData, key: string): File[] {
  const entries = formData.getAll(key);
  const files = entries.filter((entry): entry is File => entry instanceof File);
  if (files.length !== entries.length || files.length === 0) {
    throw new ApiError(`Missing required file list field "${key}".`, 400);
  }
  assertMaxFileCount(files);
  files.forEach(assertFileSize);
  assertTotalSize(files);
  return files;
}

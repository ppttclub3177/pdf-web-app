import path from "node:path";
import { ApiError } from "@/lib/server/api";

export function assertAllowedExtensions(file: File, extensions: string[]): void {
  const ext = path.extname(file.name).toLowerCase();
  if (!extensions.includes(ext)) {
    throw new ApiError(
      `"${file.name}" must use one of: ${extensions.join(", ")}`,
      400,
    );
  }
}

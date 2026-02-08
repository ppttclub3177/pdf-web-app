import { ApiError } from "@/lib/server/api";
import { runCommand } from "@/lib/server/command";

export async function getPdfPageCount(pdfPath: string): Promise<number> {
  const { stdout } = await runCommand("pdfinfo", [pdfPath]);
  const match = stdout.match(/^Pages:\s+(\d+)/m);
  if (!match) {
    throw new ApiError("Unable to determine PDF page count.", 400);
  }

  const pageCount = Number.parseInt(match[1], 10);
  if (!Number.isFinite(pageCount) || pageCount <= 0) {
    throw new ApiError("Invalid PDF page count.", 400);
  }

  return pageCount;
}

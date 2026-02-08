import path from "node:path";
import { ApiError, withApiErrorHandling } from "@/lib/server/api";
import { runCommand } from "@/lib/server/command";
import { getRequiredFile } from "@/lib/server/form";
import { pathToFileResponse } from "@/lib/server/http";
import { assertPdfMime } from "@/lib/server/limits";
import { saveUploadedFile, withTempDir } from "@/lib/server/temp";

export const runtime = "nodejs";

const QUALITY_MAP: Record<string, string> = {
  screen: "/screen",
  ebook: "/ebook",
  printer: "/printer",
};

export async function POST(request: Request): Promise<Response> {
  const response = await withApiErrorHandling(async () => {
    return withTempDir("compress", async (workDir) => {
      const formData = await request.formData();
      const pdfFile = getRequiredFile(formData, "file");
      assertPdfMime(pdfFile);

      const qualityInput = String(formData.get("quality") ?? "ebook");
      const quality = QUALITY_MAP[qualityInput] || QUALITY_MAP.ebook;

      const inputPath = path.join(workDir, "input.pdf");
      const outputPath = path.join(workDir, "compressed.pdf");
      await saveUploadedFile(pdfFile, inputPath);

      try {
        await runCommand("gs", [
          "-sDEVICE=pdfwrite",
          "-dCompatibilityLevel=1.4",
          "-dNOPAUSE",
          "-dQUIET",
          "-dBATCH",
          `-dPDFSETTINGS=${quality}`,
          `-sOutputFile=${outputPath}`,
          inputPath,
        ]);
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        throw new ApiError("Failed to compress PDF.", 400);
      }

      return pathToFileResponse(outputPath, "compressed.pdf", "application/pdf");
    });
  });

  return response as Response;
}

import path from "node:path";
import { ApiError, withApiErrorHandling } from "@/lib/server/api";
import { runCommand } from "@/lib/server/command";
import { getRequiredFile } from "@/lib/server/form";
import { pathToFileResponse } from "@/lib/server/http";
import { assertPdfMime } from "@/lib/server/limits";
import { saveUploadedFile, withTempDir } from "@/lib/server/temp";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const response = await withApiErrorHandling(async () => {
    return withTempDir("unlock", async (workDir) => {
      const formData = await request.formData();
      const file = getRequiredFile(formData, "file");
      assertPdfMime(file);

      const password = String(formData.get("password") ?? "");
      if (!password) {
        throw new ApiError("Password is required to unlock PDF.", 400);
      }

      const inputPath = path.join(workDir, "input.pdf");
      const outputPath = path.join(workDir, "unlocked.pdf");
      await saveUploadedFile(file, inputPath);

      try {
        await runCommand("qpdf", [
          `--password=${password}`,
          "--decrypt",
          inputPath,
          outputPath,
        ]);
      } catch (error) {
        if (error instanceof ApiError) {
          if (error.message.includes('Required command "qpdf"')) {
            throw error;
          }
          throw new ApiError("Failed to unlock PDF. Password may be incorrect.", 400);
        }
        throw error;
      }

      return pathToFileResponse(outputPath, "unlocked.pdf", "application/pdf");
    });
  });

  return response as Response;
}

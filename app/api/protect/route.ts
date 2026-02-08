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
    return withTempDir("protect", async (workDir) => {
      const formData = await request.formData();
      const file = getRequiredFile(formData, "file");
      assertPdfMime(file);

      const password = String(formData.get("password") ?? "");
      if (password.length < 4) {
        throw new ApiError("Password must be at least 4 characters.", 400);
      }

      const inputPath = path.join(workDir, "input.pdf");
      const outputPath = path.join(workDir, "protected.pdf");
      await saveUploadedFile(file, inputPath);

      await runCommand("qpdf", [
        "--encrypt",
        password,
        password,
        "256",
        "--",
        inputPath,
        outputPath,
      ]);

      return pathToFileResponse(outputPath, "protected.pdf", "application/pdf");
    });
  });

  return response as Response;
}

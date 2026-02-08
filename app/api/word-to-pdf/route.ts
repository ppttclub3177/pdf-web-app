import path from "node:path";
import { withApiErrorHandling } from "@/lib/server/api";
import { assertAllowedExtensions } from "@/lib/server/file-types";
import { getRequiredFile } from "@/lib/server/form";
import { pathToFileResponse } from "@/lib/server/http";
import { convertOfficeToPdf } from "@/lib/server/office";
import { saveUploadedFile, withTempDir } from "@/lib/server/temp";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const response = await withApiErrorHandling(async () => {
    return withTempDir("word-to-pdf", async (workDir) => {
      const formData = await request.formData();
      const file = getRequiredFile(formData, "file");
      assertAllowedExtensions(file, [".doc", ".docx"]);

      const inputPath = path.join(workDir, file.name);
      await saveUploadedFile(file, inputPath);
      const outputPath = await convertOfficeToPdf(inputPath, workDir);
      return pathToFileResponse(outputPath, "word.pdf", "application/pdf");
    });
  });

  return response as Response;
}

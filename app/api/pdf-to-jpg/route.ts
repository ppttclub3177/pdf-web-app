import { promises as fs } from "node:fs";
import path from "node:path";
import { withApiErrorHandling } from "@/lib/server/api";
import { getRequiredFile } from "@/lib/server/form";
import { pathToFileResponse, zipPathsResponse } from "@/lib/server/http";
import { assertPdfMime } from "@/lib/server/limits";
import { rasterizePdfToImages } from "@/lib/server/pdf-raster";
import { saveUploadedFile, withTempDir } from "@/lib/server/temp";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const response = await withApiErrorHandling(async () => {
    return withTempDir("pdf-to-jpg", async (workDir) => {
      const formData = await request.formData();
      const pdfFile = getRequiredFile(formData, "file");
      assertPdfMime(pdfFile);

      const dpi = Number.parseInt(String(formData.get("dpi") ?? "150"), 10);
      const normalizedDpi = dpi === 300 ? 300 : 150;

      const inputPath = path.join(workDir, "input.pdf");
      await saveUploadedFile(pdfFile, inputPath);

      const imageDir = path.join(workDir, "images");
      await fs.mkdir(imageDir, { recursive: true });
      try {
        const images = await rasterizePdfToImages(inputPath, imageDir, {
          dpi: normalizedDpi,
          format: "jpg",
        });

        if (images.length === 0) {
          throw new Error("No pages rendered.");
        }

        if (images.length === 1) {
          return pathToFileResponse(images[0], "page-1.jpg", "image/jpeg");
        }

        return zipPathsResponse(
          images.map((imagePath, index) => ({
            path: imagePath,
            name: `page-${index + 1}.jpg`,
          })),
          "pages.zip",
        );
      } finally {
        await fs.rm(imageDir, { recursive: true, force: true });
      }
    });
  });

  return response as Response;
}

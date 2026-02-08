import { promises as fs } from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { withApiErrorHandling } from "@/lib/server/api";
import { getRequiredFile } from "@/lib/server/form";
import { getBooleanFormValue } from "@/lib/server/form-values";
import { fileResponse } from "@/lib/server/http";
import { assertPdfMime } from "@/lib/server/limits";
import { canUseOcr, runImageOcr } from "@/lib/server/ocr";
import { rasterizePdfToImages } from "@/lib/server/pdf-raster";
import { saveUploadedFile, withTempDir } from "@/lib/server/temp";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const response = await withApiErrorHandling(async () => {
    return withTempDir("pdf-to-excel", async (workDir) => {
      const formData = await request.formData();
      const file = getRequiredFile(formData, "file");
      assertPdfMime(file);

      const includeOcr = getBooleanFormValue(formData, "includeOcr", true);
      const ocrAvailable = includeOcr ? await canUseOcr() : false;

      const inputPath = path.join(workDir, "input.pdf");
      const imagesDir = path.join(workDir, "images");
      await fs.mkdir(imagesDir, { recursive: true });
      await saveUploadedFile(file, inputPath);

      const images = await rasterizePdfToImages(inputPath, imagesDir, {
        dpi: 150,
        format: "jpg",
      });

      const workbook = new ExcelJS.Workbook();
      for (let index = 0; index < images.length; index += 1) {
        const imagePath = images[index];
        const worksheet = workbook.addWorksheet(`page-${index + 1}`);

        if (ocrAvailable) {
          const ocrText = await runImageOcr(imagePath, workDir, `ocr-page-${index + 1}`);
          const lines = ocrText
            .split(/\r?\n/g)
            .map((line) => line.trim())
            .filter(Boolean);

          if (lines.length === 0) {
            worksheet.getCell("A1").value = "No OCR text extracted.";
          } else {
            lines.forEach((line, lineIndex) => {
              worksheet.getCell(lineIndex + 1, 1).value = line;
            });
          }
        } else {
          worksheet.getCell("A1").value =
            "OCR unavailable in current runtime. Use Docker full mode to enable OCR.";
        }
      }

      const outputBuffer = await workbook.xlsx.writeBuffer();
      return fileResponse(
        new Uint8Array(outputBuffer),
        "output.xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
    });
  });

  return response as Response;
}

import { promises as fs } from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { OCR_DPI, OCR_MAX_PAGES } from "@/lib/config";
import { ApiError, withApiErrorHandling } from "@/lib/server/api";
import { getRequiredFile } from "@/lib/server/form";
import { getBooleanFormValue } from "@/lib/server/form-values";
import { fileResponse } from "@/lib/server/http";
import { assertMaxPages, assertPdfMime } from "@/lib/server/limits";
import { canUseOcr, runImageOcr } from "@/lib/server/ocr";
import { getPdfPageCount } from "@/lib/server/pdf-info";
import { rasterizePdfToImages } from "@/lib/server/pdf-raster";
import { saveUploadedFile, withTempDir } from "@/lib/server/temp";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const response = await withApiErrorHandling(async () => {
    return withTempDir("pdf-to-excel", async (workDir) => {
      const formData = await request.formData();
      const file = getRequiredFile(formData, "file");
      assertPdfMime(file);

      const includeOcr = getBooleanFormValue(formData, "includeOcr", false);
      const ocrAvailable = includeOcr ? await canUseOcr() : false;

      const inputPath = path.join(workDir, "input.pdf");
      await saveUploadedFile(file, inputPath);
      const pageCount = await getPdfPageCount(inputPath);
      assertMaxPages(pageCount);

      if (ocrAvailable && pageCount > OCR_MAX_PAGES) {
        throw new ApiError(
          `OCR is limited to ${OCR_MAX_PAGES} pages per request in this runtime. Disable OCR or split the PDF into smaller files.`,
          413,
        );
      }

      const workbook = new ExcelJS.Workbook();

      if (!ocrAvailable) {
        const disabledMessage = includeOcr
          ? "OCR unavailable in current runtime. Use Docker full mode to enable OCR."
          : "OCR disabled for this request. Enable OCR to extract text from page images.";
        for (let index = 0; index < pageCount; index += 1) {
          const worksheet = workbook.addWorksheet(`page-${index + 1}`);
          worksheet.getCell("A1").value = disabledMessage;
        }
      } else {
        const imagesDir = path.join(workDir, "images");
        await fs.mkdir(imagesDir, { recursive: true });

        for (let index = 0; index < pageCount; index += 1) {
          const pageNumber = index + 1;
          const worksheet = workbook.addWorksheet(`page-${pageNumber}`);
          const images = await rasterizePdfToImages(inputPath, imagesDir, {
            dpi: OCR_DPI,
            format: "jpg",
            firstPage: pageNumber,
            lastPage: pageNumber,
            singleFile: true,
          });
          const imagePath = images[0];

          if (!imagePath) {
            worksheet.getCell("A1").value = "Failed to render page image for OCR.";
            continue;
          }

          try {
            const ocrText = await runImageOcr(imagePath, workDir, `ocr-page-${pageNumber}`);
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
          } finally {
            await fs.rm(imagePath, { force: true });
          }
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

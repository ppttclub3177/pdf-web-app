import { promises as fs } from "node:fs";
import path from "node:path";
import { Document, ImageRun, Packer, Paragraph, TextRun } from "docx";
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
    return withTempDir("pdf-to-word", async (workDir) => {
      const formData = await request.formData();
      const file = getRequiredFile(formData, "file");
      assertPdfMime(file);

      const includeOcr = getBooleanFormValue(formData, "includeOcr", false);
      const ocrAvailable = includeOcr ? await canUseOcr() : false;

      const inputPath = path.join(workDir, "input.pdf");
      const imagesDir = path.join(workDir, "images");
      await fs.mkdir(imagesDir, { recursive: true });
      await saveUploadedFile(file, inputPath);

      const images = await rasterizePdfToImages(inputPath, imagesDir, {
        dpi: 150,
        format: "png",
      });

      const pageParagraphs: Paragraph[] = [];
      for (let index = 0; index < images.length; index += 1) {
        const imagePath = images[index];
        const imageBytes = await fs.readFile(imagePath);

        if (index > 0) {
          pageParagraphs.push(
            new Paragraph({
              children: [new TextRun({ text: "", break: 1 })],
              pageBreakBefore: true,
            }),
          );
        }

        pageParagraphs.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: imageBytes,
                type: "png",
                transformation: {
                  width: 520,
                  height: 720,
                },
              }),
            ],
          }),
        );

        if (ocrAvailable) {
          const ocrText = await runImageOcr(imagePath, workDir, `ocr-page-${index + 1}`);
          if (ocrText) {
            pageParagraphs.push(
              new Paragraph({
                children: [new TextRun({ text: `OCR (Page ${index + 1}): ${ocrText}` })],
              }),
            );
          }
        }
      }

      if (!ocrAvailable && includeOcr) {
        pageParagraphs.unshift(
          new Paragraph({
            children: [
              new TextRun({
                text: "OCR not available in current runtime. Use Docker full mode to enable OCR text.",
              }),
            ],
          }),
        );
      }

      const document = new Document({
        sections: [{ children: pageParagraphs }],
      });
      const docxBuffer = await Packer.toBuffer(document);
      return fileResponse(
        new Uint8Array(docxBuffer),
        "output.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
    });
  });

  return response as Response;
}

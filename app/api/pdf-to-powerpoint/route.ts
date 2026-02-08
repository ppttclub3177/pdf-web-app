import { promises as fs } from "node:fs";
import path from "node:path";
import PptxGenJS from "pptxgenjs";
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
    return withTempDir("pdf-to-powerpoint", async (workDir) => {
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
        format: "jpg",
      });

      const pptx = new PptxGenJS();
      pptx.layout = "LAYOUT_WIDE";

      for (let index = 0; index < images.length; index += 1) {
        const imagePath = images[index];

        const slide = pptx.addSlide();
        slide.addImage({
          path: imagePath,
          x: 0,
          y: 0,
          w: 13.333,
          h: 7.5,
        });

        if (ocrAvailable) {
          const ocrText = await runImageOcr(imagePath, workDir, `ocr-page-${index + 1}`);
          if (ocrText) {
            slide.addText(`OCR: ${ocrText}`, {
              x: 0.2,
              y: 7.15,
              w: 12.8,
              h: 0.2,
              fontSize: 6,
              color: "FFFFFF",
            });
          }
        }
      }

      if (!ocrAvailable && includeOcr) {
        const slide = pptx.addSlide();
        slide.addText(
          "OCR not available in current runtime. Use Docker full mode to enable OCR annotations.",
          {
            x: 0.5,
            y: 0.7,
            w: 12.3,
            h: 1,
            fontSize: 18,
            color: "333333",
          },
        );
      }

      const output = (await pptx.write({
        outputType: "nodebuffer",
      })) as Buffer;

      return fileResponse(
        new Uint8Array(output),
        "output.pptx",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      );
    });
  });

  return response as Response;
}

import {
  PDFDocument,
  StandardFonts,
  degrees,
  rgb,
  type PDFImage,
} from "pdf-lib";
import { ApiError, withApiErrorHandling } from "@/lib/server/api";
import { getOptionalFile, getRequiredFile } from "@/lib/server/form";
import { fileResponse } from "@/lib/server/http";
import {
  assertJpgPngMime,
  assertMaxPages,
  assertPdfMime,
} from "@/lib/server/limits";
import { parsePageSelection, toPositiveNumber } from "@/lib/server/pdf-pages";

export const runtime = "nodejs";

type Position =
  | "center"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

const POSITION_SET = new Set<Position>([
  "center",
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
]);

function resolvePosition(
  position: Position,
  pageWidth: number,
  pageHeight: number,
  markWidth: number,
  markHeight: number,
): { x: number; y: number } {
  const margin = 24;
  if (position === "top-left") {
    return { x: margin, y: pageHeight - markHeight - margin };
  }
  if (position === "top-right") {
    return { x: pageWidth - markWidth - margin, y: pageHeight - markHeight - margin };
  }
  if (position === "bottom-left") {
    return { x: margin, y: margin };
  }
  if (position === "bottom-right") {
    return { x: pageWidth - markWidth - margin, y: margin };
  }
  return { x: (pageWidth - markWidth) / 2, y: (pageHeight - markHeight) / 2 };
}

export async function POST(request: Request): Promise<Response> {
  const response = await withApiErrorHandling(async () => {
    const formData = await request.formData();
    const pdfFile = getRequiredFile(formData, "file");
    const imageFile = getOptionalFile(formData, "image");
    assertPdfMime(pdfFile);

    if (imageFile) {
      assertJpgPngMime(imageFile);
    }

    const text = String(formData.get("text") ?? "").trim();
    if (!text && !imageFile) {
      throw new ApiError("Provide watermark text or image.", 400);
    }

    const opacity = Math.min(
      1,
      Math.max(0.05, toPositiveNumber(String(formData.get("opacity")), 0.3, 0)),
    );

    const scale = Math.min(
      2,
      Math.max(0.1, toPositiveNumber(String(formData.get("scale")), 0.35, 0)),
    );

    const positionRaw = String(formData.get("position") ?? "center") as Position;
    const position: Position = POSITION_SET.has(positionRaw)
      ? positionRaw
      : "center";

    let pdfDoc: PDFDocument;
    try {
      pdfDoc = await PDFDocument.load(await pdfFile.arrayBuffer());
    } catch {
      throw new ApiError(`"${pdfFile.name}" is not a valid PDF file.`, 400);
    }

    assertMaxPages(pdfDoc.getPageCount());
    const selectedPageIndexes = parsePageSelection(
      String(formData.get("pages") ?? "all"),
      pdfDoc.getPageCount(),
    );

    let watermarkImage: PDFImage | null = null;
    if (imageFile) {
      const imageBytes = await imageFile.arrayBuffer();
      if (
        imageFile.type === "image/png" ||
        imageFile.name.toLowerCase().endsWith(".png")
      ) {
        watermarkImage = await pdfDoc.embedPng(imageBytes);
      } else {
        watermarkImage = await pdfDoc.embedJpg(imageBytes);
      }
    }

    const font = text ? await pdfDoc.embedFont(StandardFonts.HelveticaBold) : null;
    const pages = pdfDoc.getPages();

    for (const pageIndex of selectedPageIndexes) {
      const page = pages[pageIndex];
      const { width: pageWidth, height: pageHeight } = page.getSize();

      if (watermarkImage) {
        const imageRatio = watermarkImage.height / watermarkImage.width;
        const targetWidth = pageWidth * scale;
        const targetHeight = targetWidth * imageRatio;
        const { x, y } = resolvePosition(
          position,
          pageWidth,
          pageHeight,
          targetWidth,
          targetHeight,
        );
        page.drawImage(watermarkImage, {
          x,
          y,
          width: targetWidth,
          height: targetHeight,
          opacity,
        });
      }

      if (text && font) {
        const fontSize = Math.max(18, Math.round(pageWidth * 0.06 * scale));
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const textHeight = font.heightAtSize(fontSize);
        const { x, y } = resolvePosition(
          position,
          pageWidth,
          pageHeight,
          textWidth,
          textHeight,
        );
        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(0.65, 0.67, 0.75),
          opacity,
          rotate: degrees(position === "center" ? 30 : 0),
        });
      }
    }

    const outputBytes = await pdfDoc.save();
    return fileResponse(outputBytes, "watermarked.pdf", "application/pdf");
  });

  return response as Response;
}

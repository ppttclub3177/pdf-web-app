import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { ApiError, withApiErrorHandling } from "@/lib/server/api";
import { getRequiredFile } from "@/lib/server/form";
import { fileResponse } from "@/lib/server/http";
import { assertMaxPages, assertPdfMime } from "@/lib/server/limits";
import { toPositiveNumber } from "@/lib/server/pdf-pages";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const response = await withApiErrorHandling(async () => {
    const formData = await request.formData();
    const pdfFile = getRequiredFile(formData, "file");
    assertPdfMime(pdfFile);

    let pdfDoc: PDFDocument;
    try {
      pdfDoc = await PDFDocument.load(await pdfFile.arrayBuffer());
    } catch {
      throw new ApiError("Invalid PDF file.", 400);
    }

    const pageCount = pdfDoc.getPageCount();
    assertMaxPages(pageCount);
    const pageNumber = Math.round(
      toPositiveNumber(String(formData.get("page") ?? "1"), 1, 1),
    );

    if (pageNumber < 1 || pageNumber > pageCount) {
      throw new ApiError(`Page must be between 1 and ${pageCount}.`, 400);
    }

    const page = pdfDoc.getPages()[pageNumber - 1];
    const { width, height } = page.getSize();

    const text = String(formData.get("text") ?? "").trim();
    if (!text) {
      throw new ApiError("Text is required for edit.", 400);
    }
    const textXPercent = Math.max(
      0,
      Math.min(100, toPositiveNumber(String(formData.get("textX")), 15, 0)),
    );
    const textYPercent = Math.max(
      0,
      Math.min(100, toPositiveNumber(String(formData.get("textY")), 75, 0)),
    );
    const textSize = Math.max(
      10,
      Math.min(72, toPositiveNumber(String(formData.get("textSize")), 18, 1)),
    );

    const highlightXPercent = Math.max(
      0,
      Math.min(100, toPositiveNumber(String(formData.get("highlightX")), 12, 0)),
    );
    const highlightYPercent = Math.max(
      0,
      Math.min(100, toPositiveNumber(String(formData.get("highlightY")), 68, 0)),
    );
    const highlightWidthPercent = Math.max(
      5,
      Math.min(100, toPositiveNumber(String(formData.get("highlightWidth")), 40, 1)),
    );
    const highlightHeightPercent = Math.max(
      2,
      Math.min(100, toPositiveNumber(String(formData.get("highlightHeight")), 8, 1)),
    );

    const highlightColor = String(formData.get("highlightColor") ?? "yellow");
    const color =
      highlightColor === "green"
        ? rgb(0.5, 0.95, 0.5)
        : highlightColor === "blue"
          ? rgb(0.5, 0.8, 1)
          : rgb(1, 0.95, 0.45);

    page.drawRectangle({
      x: (width * highlightXPercent) / 100,
      y: (height * highlightYPercent) / 100,
      width: (width * highlightWidthPercent) / 100,
      height: (height * highlightHeightPercent) / 100,
      color,
      opacity: 0.45,
      borderWidth: 0,
    });

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawText(text, {
      x: (width * textXPercent) / 100,
      y: (height * textYPercent) / 100,
      size: textSize,
      font,
      color: rgb(0.07, 0.07, 0.07),
    });

    const outputBytes = await pdfDoc.save();
    return fileResponse(outputBytes, "edited.pdf", "application/pdf");
  });

  return response as Response;
}

import { PDFDocument } from "pdf-lib";
import { ApiError, withApiErrorHandling } from "@/lib/server/api";
import { getRequiredFile } from "@/lib/server/form";
import { fileResponse } from "@/lib/server/http";
import {
  assertJpgPngMime,
  assertMaxPages,
  assertPdfMime,
} from "@/lib/server/limits";
import { toPositiveNumber } from "@/lib/server/pdf-pages";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const response = await withApiErrorHandling(async () => {
    const formData = await request.formData();
    const pdfFile = getRequiredFile(formData, "file");
    const signatureFile = getRequiredFile(formData, "signature");
    assertPdfMime(pdfFile);
    assertJpgPngMime(signatureFile);

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

    const xPercent = Math.max(
      0,
      Math.min(100, toPositiveNumber(String(formData.get("xPercent")), 50, 0)),
    );
    const yPercent = Math.max(
      0,
      Math.min(100, toPositiveNumber(String(formData.get("yPercent")), 20, 0)),
    );
    const widthPercent = Math.max(
      5,
      Math.min(80, toPositiveNumber(String(formData.get("widthPercent")), 25, 0)),
    );

    const signatureBytes = await signatureFile.arrayBuffer();
    const signatureImage =
      signatureFile.type === "image/png" ||
      signatureFile.name.toLowerCase().endsWith(".png")
        ? await pdfDoc.embedPng(signatureBytes)
        : await pdfDoc.embedJpg(signatureBytes);

    const page = pdfDoc.getPages()[pageNumber - 1];
    const { width, height } = page.getSize();
    const imageWidth = (width * widthPercent) / 100;
    const imageHeight = (signatureImage.height / signatureImage.width) * imageWidth;
    const x = (width * xPercent) / 100;
    const y = (height * yPercent) / 100;

    page.drawImage(signatureImage, {
      x: Math.min(Math.max(0, x), width - imageWidth),
      y: Math.min(Math.max(0, y), height - imageHeight),
      width: imageWidth,
      height: imageHeight,
    });

    const outputBytes = await pdfDoc.save();
    return fileResponse(outputBytes, "signed.pdf", "application/pdf");
  });

  return response as Response;
}

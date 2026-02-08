import { PDFDocument } from "pdf-lib";
import { ApiError } from "@/lib/server/api";

export type ImageToPdfOptions = {
  orientation: "portrait" | "landscape";
  margin: number;
};

function fitWithinBounds(
  sourceWidth: number,
  sourceHeight: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight);
  return {
    width: sourceWidth * scale,
    height: sourceHeight * scale,
  };
}

function isPng(file: File): boolean {
  return file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
}

function isJpeg(file: File): boolean {
  const lowerName = file.name.toLowerCase();
  return (
    file.type === "image/jpeg" ||
    lowerName.endsWith(".jpg") ||
    lowerName.endsWith(".jpeg")
  );
}

export async function imagesToPdfBytes(
  files: File[],
  options: ImageToPdfOptions,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const pageSize: [number, number] =
    options.orientation === "landscape" ? [842, 595] : [595, 842]; // A4 in pt
  const margin = options.margin;

  for (const file of files) {
    const bytes = await file.arrayBuffer();
    let image;
    if (isPng(file)) {
      image = await pdfDoc.embedPng(bytes);
    } else if (isJpeg(file)) {
      image = await pdfDoc.embedJpg(bytes);
    } else {
      throw new ApiError(`"${file.name}" must be JPG or PNG.`, 400);
    }

    const page = pdfDoc.addPage(pageSize);
    const availableWidth = pageSize[0] - margin * 2;
    const availableHeight = pageSize[1] - margin * 2;
    const fitted = fitWithinBounds(
      image.width,
      image.height,
      availableWidth,
      availableHeight,
    );

    const x = (pageSize[0] - fitted.width) / 2;
    const y = (pageSize[1] - fitted.height) / 2;
    page.drawImage(image, {
      x,
      y,
      width: fitted.width,
      height: fitted.height,
    });
  }

  return pdfDoc.save();
}

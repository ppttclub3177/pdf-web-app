import { promises as fs } from "node:fs";
import path from "node:path";
import { PDFDocument, StandardFonts, degrees, rgb, type PDFImage } from "pdf-lib";
import { ApiError } from "@/lib/server/api";
import { runCommand } from "@/lib/server/command";
import { APP_LIMITS } from "@/lib/config";
import { parsePageSelection, parseSplitRangeGroups, toPositiveNumber } from "@/lib/server/pdf-pages";
import { getPdfPageCount } from "@/lib/server/pdf-info";
import { rasterizePdfToImages } from "@/lib/server/pdf-raster";
import { imagesToPdfBytes } from "@/lib/server/image-pdf";
import type { ToolProcessor } from "@/lib/tools/processor-types";
import {
  COMMAND_TIMEOUT_MS,
  assertImageFile,
  assertPdfFile,
  assertTotalUploadLimits,
  doneResult,
  ensureCommandAvailable,
  getField,
  getOptionalFile,
  getOutputPath,
  getRequiredFile,
  getRequiredFiles,
  isJpeg,
  isPng,
  loadPdf,
  makeRuntimeFile,
  pageLimitError,
  progressForPage,
  writeUint8Array,
  zipFileEntries,
} from "@/lib/tools/processors/common";

export const processMergePdf: ToolProcessor = async (context) => {
  assertTotalUploadLimits(context.input);
  const files = getRequiredFiles(context.input, "files", { min: 1, max: 5 });
  files.forEach(assertPdfFile);

  context.setProgress(5, "Loading source PDFs...");
  const outputPdf = await PDFDocument.create();
  let totalPages = 0;

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const sourcePdf = await loadPdf(file);
    totalPages += sourcePdf.getPageCount();
    if (totalPages > APP_LIMITS.maxPages) {
      throw pageLimitError(totalPages);
    }

    const copiedPages = await outputPdf.copyPages(
      sourcePdf,
      sourcePdf.getPageIndices(),
    );
    copiedPages.forEach((page) => outputPdf.addPage(page));
    context.setProgress(
      Math.round(((index + 1) / files.length) * 90),
      `Merged ${index + 1}/${files.length} file(s)...`,
    );
  }

  const outputPath = getOutputPath(context, "merged.pdf");
  const bytes = await outputPdf.save();
  await writeUint8Array(outputPath, bytes);
  return doneResult(outputPath, "merged.pdf", "application/pdf");
};

export const processSplitPdf: ToolProcessor = async (context) => {
  assertTotalUploadLimits(context.input);
  const file = getRequiredFile(context.input, "file");
  assertPdfFile(file);

  context.setProgress(5, "Loading PDF...");
  const sourcePdf = await loadPdf(file);
  const pageCount = sourcePdf.getPageCount();
  if (pageCount > APP_LIMITS.maxPages) {
    throw pageLimitError(pageCount);
  }

  const ranges = getField(context.input, "ranges", "");
  const groups = parseSplitRangeGroups(ranges, pageCount);
  if (groups.length > APP_LIMITS.maxFiles * 10) {
    throw new ApiError("Too many split segments requested.", 400);
  }

  const segmentDir = path.join(context.outputDir, "segments");
  await fs.mkdir(segmentDir, { recursive: true });
  const entries: Array<{ path: string; name: string }> = [];

  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index];
    const outputPdf = await PDFDocument.create();
    const copiedPages = await outputPdf.copyPages(sourcePdf, group);
    copiedPages.forEach((page) => outputPdf.addPage(page));
    const outputBytes = await outputPdf.save();

    const rangeLabel =
      group.length === 1
        ? `${group[0] + 1}`
        : `${group[0] + 1}-${group[group.length - 1] + 1}`;
    const filename = `split-${index + 1}-${rangeLabel}.pdf`;
    const segmentPath = path.join(segmentDir, filename);
    await writeUint8Array(segmentPath, outputBytes);
    entries.push({ path: segmentPath, name: filename });
    context.setProgress(
      Math.round(((index + 1) / groups.length) * 90),
      `Prepared split ${index + 1}/${groups.length}...`,
    );
  }

  const outputPath = getOutputPath(context, "split.zip");
  await zipFileEntries(outputPath, entries);
  return doneResult(outputPath, "split.zip", "application/zip");
};

export const processRotatePdf: ToolProcessor = async (context) => {
  assertTotalUploadLimits(context.input);
  const file = getRequiredFile(context.input, "file");
  assertPdfFile(file);

  const angle = Number.parseInt(getField(context.input, "angle", "90"), 10);
  const allowedAngles = new Set([90, 180, 270]);
  if (!allowedAngles.has(angle)) {
    throw new ApiError("Angle must be 90, 180, or 270.", 400);
  }

  const pdfDoc = await loadPdf(file);
  const pageCount = pdfDoc.getPageCount();
  if (pageCount > APP_LIMITS.maxPages) {
    throw pageLimitError(pageCount);
  }

  const selectedPages = parsePageSelection(
    getField(context.input, "pages", "all"),
    pageCount,
  );
  const pages = pdfDoc.getPages();
  for (const pageIndex of selectedPages) {
    const page = pages[pageIndex];
    page.setRotation(degrees((page.getRotation().angle + angle) % 360));
  }

  const outputPath = getOutputPath(context, "rotated.pdf");
  await writeUint8Array(outputPath, await pdfDoc.save());
  return doneResult(outputPath, "rotated.pdf", "application/pdf");
};

function resolveWatermarkPosition(
  position: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right",
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

export const processWatermark: ToolProcessor = async (context) => {
  assertTotalUploadLimits(context.input);
  const pdfFile = getRequiredFile(context.input, "file");
  assertPdfFile(pdfFile);
  const imageFile = getOptionalFile(context.input, "image");
  if (imageFile) {
    assertImageFile(imageFile);
  }

  const text = getField(context.input, "text", "").trim();
  if (!text && !imageFile) {
    throw new ApiError("Provide watermark text or image.", 400);
  }

  const opacity = Math.min(
    1,
    Math.max(0.05, toPositiveNumber(getField(context.input, "opacity"), 0.3, 0)),
  );
  const scale = Math.min(
    2,
    Math.max(0.1, toPositiveNumber(getField(context.input, "scale"), 0.35, 0)),
  );

  const rawPosition = getField(context.input, "position", "center");
  const allowedPositions = new Set([
    "center",
    "top-left",
    "top-right",
    "bottom-left",
    "bottom-right",
  ]);
  const position = (allowedPositions.has(rawPosition)
    ? rawPosition
    : "center") as "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";

  const pdfDoc = await loadPdf(pdfFile);
  const pageCount = pdfDoc.getPageCount();
  if (pageCount > APP_LIMITS.maxPages) {
    throw pageLimitError(pageCount);
  }

  const selectedPages = parsePageSelection(
    getField(context.input, "pages", "all"),
    pageCount,
  );

  let watermarkImage: PDFImage | null = null;
  if (imageFile) {
    const imageBytes = await fs.readFile(imageFile.path);
    if (isPng(imageFile)) {
      watermarkImage = await pdfDoc.embedPng(imageBytes);
    } else if (isJpeg(imageFile)) {
      watermarkImage = await pdfDoc.embedJpg(imageBytes);
    }
  }
  const font = text ? await pdfDoc.embedFont(StandardFonts.HelveticaBold) : null;
  const pages = pdfDoc.getPages();

  for (let index = 0; index < selectedPages.length; index += 1) {
    const pageIndex = selectedPages[index];
    const page = pages[pageIndex];
    const { width, height } = page.getSize();

    if (watermarkImage) {
      const ratio = watermarkImage.height / watermarkImage.width;
      const targetWidth = width * scale;
      const targetHeight = targetWidth * ratio;
      const { x, y } = resolveWatermarkPosition(
        position,
        width,
        height,
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
      const fontSize = Math.max(18, Math.round(width * 0.06 * scale));
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      const textHeight = font.heightAtSize(fontSize);
      const { x, y } = resolveWatermarkPosition(
        position,
        width,
        height,
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

    context.setProgress(
      Math.round(((index + 1) / selectedPages.length) * 90),
      `Watermarked ${index + 1}/${selectedPages.length} page(s)...`,
    );
  }

  const outputPath = getOutputPath(context, "watermarked.pdf");
  await writeUint8Array(outputPath, await pdfDoc.save());
  return doneResult(outputPath, "watermarked.pdf", "application/pdf");
};

export const processJpgToPdf: ToolProcessor = async (context) => {
  assertTotalUploadLimits(context.input);
  const files = getRequiredFiles(context.input, "files", { min: 1, max: 5 });
  files.forEach(assertImageFile);

  const orientation =
    getField(context.input, "orientation", "portrait") === "landscape"
      ? "landscape"
      : "portrait";
  const margin = Math.max(
    0,
    Math.min(80, Number.parseFloat(getField(context.input, "margin", "24"))),
  );

  const runtimeFiles = await Promise.all(files.map((file) => makeRuntimeFile(file)));
  const outputBytes = await imagesToPdfBytes(runtimeFiles, {
    orientation,
    margin,
  });

  const outputPath = getOutputPath(context, "images.pdf");
  await writeUint8Array(outputPath, outputBytes);
  return doneResult(outputPath, "images.pdf", "application/pdf");
};

export const processPdfToJpg: ToolProcessor = async (context) => {
  assertTotalUploadLimits(context.input);
  const file = getRequiredFile(context.input, "file");
  assertPdfFile(file);

  const dpiInput = Number.parseInt(getField(context.input, "dpi", "150"), 10);
  const dpi = dpiInput === 300 ? 300 : 150;
  const pageCount = await getPdfPageCount(file.path);
  if (pageCount > APP_LIMITS.maxPages) {
    throw pageLimitError(pageCount);
  }

  const imageDir = path.join(context.outputDir, "images");
  await fs.mkdir(imageDir, { recursive: true });

  if (pageCount === 1) {
    const images = await rasterizePdfToImages(file.path, imageDir, {
      dpi,
      format: "jpg",
      firstPage: 1,
      lastPage: 1,
      singleFile: true,
    });
    const imagePath = images[0];
    if (!imagePath) {
      throw new ApiError("Failed to render PDF page as JPG.", 500);
    }
    const outputPath = getOutputPath(context, "page-1.jpg");
    await fs.copyFile(imagePath, outputPath);
    return doneResult(outputPath, "page-1.jpg", "image/jpeg");
  }

  const renderedEntries: Array<{ path: string; name: string }> = [];
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    context.setProgress(
      progressForPage(pageNumber, pageCount, 10, 80),
      `Rendering page ${pageNumber}/${pageCount}...`,
    );
    const images = await rasterizePdfToImages(file.path, imageDir, {
      dpi,
      format: "jpg",
      firstPage: pageNumber,
      lastPage: pageNumber,
      singleFile: true,
    });
    const imagePath = images[0];
    if (!imagePath) {
      throw new ApiError(`Failed to render page ${pageNumber}.`, 500);
    }
    renderedEntries.push({
      path: imagePath,
      name: `page-${pageNumber}.jpg`,
    });
  }

  const outputPath = getOutputPath(context, "pages.zip");
  await zipFileEntries(outputPath, renderedEntries);
  return doneResult(outputPath, "pages.zip", "application/zip");
};

export const processCompressPdf: ToolProcessor = async (context) => {
  assertTotalUploadLimits(context.input);
  const file = getRequiredFile(context.input, "file");
  assertPdfFile(file);
  await ensureCommandAvailable("gs", "Compress requires ghostscript in Docker.");

  const pdfDoc = await loadPdf(file);
  const pageCount = pdfDoc.getPageCount();
  if (pageCount > APP_LIMITS.maxPages) {
    throw pageLimitError(pageCount);
  }
  const qualityInput = getField(context.input, "quality", "ebook");
  const qualityMap: Record<string, string> = {
    screen: "/screen",
    ebook: "/ebook",
    printer: "/printer",
  };
  const quality = qualityMap[qualityInput] ?? qualityMap.ebook;

  const outputPath = getOutputPath(context, "compressed.pdf");
  await runCommand(
    "gs",
    [
      "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.4",
      "-dNOPAUSE",
      "-dQUIET",
      "-dBATCH",
      `-dPDFSETTINGS=${quality}`,
      `-sOutputFile=${outputPath}`,
      file.path,
    ],
    { timeoutMs: COMMAND_TIMEOUT_MS },
  );

  return doneResult(outputPath, "compressed.pdf", "application/pdf");
};

export const processEditPdf: ToolProcessor = async (context) => {
  assertTotalUploadLimits(context.input);
  const file = getRequiredFile(context.input, "file");
  assertPdfFile(file);
  const pdfDoc = await loadPdf(file);

  const pageCount = pdfDoc.getPageCount();
  if (pageCount > APP_LIMITS.maxPages) {
    throw pageLimitError(pageCount);
  }

  const pageNumber = Math.round(
    toPositiveNumber(getField(context.input, "page", "1"), 1, 1),
  );
  if (pageNumber < 1 || pageNumber > pageCount) {
    throw new ApiError(`Page must be between 1 and ${pageCount}.`, 400);
  }

  const text = getField(context.input, "text", "").trim();
  if (!text) {
    throw new ApiError("Text is required for edit.", 400);
  }

  const page = pdfDoc.getPages()[pageNumber - 1];
  const { width, height } = page.getSize();
  const textXPercent = Math.max(
    0,
    Math.min(100, toPositiveNumber(getField(context.input, "textX"), 15, 0)),
  );
  const textYPercent = Math.max(
    0,
    Math.min(100, toPositiveNumber(getField(context.input, "textY"), 75, 0)),
  );
  const textSize = Math.max(
    10,
    Math.min(72, toPositiveNumber(getField(context.input, "textSize"), 18, 1)),
  );

  const highlightXPercent = Math.max(
    0,
    Math.min(100, toPositiveNumber(getField(context.input, "highlightX"), 12, 0)),
  );
  const highlightYPercent = Math.max(
    0,
    Math.min(100, toPositiveNumber(getField(context.input, "highlightY"), 68, 0)),
  );
  const highlightWidthPercent = Math.max(
    5,
    Math.min(
      100,
      toPositiveNumber(getField(context.input, "highlightWidth"), 40, 1),
    ),
  );
  const highlightHeightPercent = Math.max(
    2,
    Math.min(
      100,
      toPositiveNumber(getField(context.input, "highlightHeight"), 8, 1),
    ),
  );

  const highlightColor = getField(context.input, "highlightColor", "yellow");
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

  const outputPath = getOutputPath(context, "edited.pdf");
  await writeUint8Array(outputPath, await pdfDoc.save());
  return doneResult(outputPath, "edited.pdf", "application/pdf");
};

export const processSignPdf: ToolProcessor = async (context) => {
  assertTotalUploadLimits(context.input);
  const pdfFile = getRequiredFile(context.input, "file");
  const signatureFile = getRequiredFile(context.input, "signature");
  assertPdfFile(pdfFile);
  assertImageFile(signatureFile);

  const pdfDoc = await loadPdf(pdfFile);
  const pageCount = pdfDoc.getPageCount();
  if (pageCount > APP_LIMITS.maxPages) {
    throw pageLimitError(pageCount);
  }

  const pageNumber = Math.round(
    toPositiveNumber(getField(context.input, "page", "1"), 1, 1),
  );
  if (pageNumber < 1 || pageNumber > pageCount) {
    throw new ApiError(`Page must be between 1 and ${pageCount}.`, 400);
  }

  const xPercent = Math.max(
    0,
    Math.min(100, toPositiveNumber(getField(context.input, "xPercent"), 50, 0)),
  );
  const yPercent = Math.max(
    0,
    Math.min(100, toPositiveNumber(getField(context.input, "yPercent"), 20, 0)),
  );
  const widthPercent = Math.max(
    5,
    Math.min(80, toPositiveNumber(getField(context.input, "widthPercent"), 25, 0)),
  );

  const signatureBytes = await fs.readFile(signatureFile.path);
  const signatureImage = isPng(signatureFile)
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

  const outputPath = getOutputPath(context, "signed.pdf");
  await writeUint8Array(outputPath, await pdfDoc.save());
  return doneResult(outputPath, "signed.pdf", "application/pdf");
};

export const processProtectPdf: ToolProcessor = async (context) => {
  assertTotalUploadLimits(context.input);
  const file = getRequiredFile(context.input, "file");
  assertPdfFile(file);
  const password = getField(context.input, "password", "");
  if (password.length < 4) {
    throw new ApiError("Password must be at least 4 characters.", 400);
  }

  await ensureCommandAvailable("qpdf", "Protect PDF requires qpdf in Docker.");
  const outputPath = getOutputPath(context, "protected.pdf");
  await runCommand(
    "qpdf",
    ["--encrypt", password, password, "256", "--", file.path, outputPath],
    { timeoutMs: COMMAND_TIMEOUT_MS },
  );
  return doneResult(outputPath, "protected.pdf", "application/pdf");
};

export const processUnlockPdf: ToolProcessor = async (context) => {
  assertTotalUploadLimits(context.input);
  const file = getRequiredFile(context.input, "file");
  assertPdfFile(file);
  const password = getField(context.input, "password", "");
  if (!password) {
    throw new ApiError("Password is required to unlock PDF.", 400);
  }

  await ensureCommandAvailable("qpdf", "Unlock PDF requires qpdf in Docker.");
  const outputPath = getOutputPath(context, "unlocked.pdf");
  try {
    await runCommand(
      "qpdf",
      [`--password=${password}`, "--decrypt", file.path, outputPath],
      { timeoutMs: COMMAND_TIMEOUT_MS },
    );
  } catch (error) {
    if (error instanceof ApiError) {
      throw new ApiError("Failed to unlock PDF. Password may be incorrect.", 400);
    }
    throw error;
  }
  return doneResult(outputPath, "unlocked.pdf", "application/pdf");
};

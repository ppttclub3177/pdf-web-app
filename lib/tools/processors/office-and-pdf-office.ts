import { promises as fs } from "node:fs";
import path from "node:path";
import { Document, ImageRun, Packer, Paragraph, TextRun } from "docx";
import PptxGenJS from "pptxgenjs";
import ExcelJS from "exceljs";
import { ApiError } from "@/lib/server/api";
import { isCommandAvailable } from "@/lib/server/command";
import { convertOfficeToPdf } from "@/lib/server/office";
import { runImageOcr } from "@/lib/server/ocr";
import { getPdfPageCount } from "@/lib/server/pdf-info";
import { rasterizePdfToImages } from "@/lib/server/pdf-raster";
import { APP_LIMITS, OCR_DPI, OCR_MAX_PAGES, OFFICE_MAX_PAGES } from "@/lib/config";
import type { ToolProcessContext, ToolProcessResult, ToolProcessor } from "@/lib/tools/processor-types";
import {
  assertExt,
  assertOfficeInputSize,
  assertPdfFile,
  assertTotalUploadLimits,
  doneResult,
  extractPdfPageText,
  getBooleanField,
  getOutputPath,
  getRequiredFile,
  ocrLimitReached,
  pageLimitError,
  progressForPage,
  writeArrayBuffer,
} from "@/lib/tools/processors/common";

async function convertOfficeProcessor(
  context: ToolProcessContext,
  field: string,
  extensions: string[],
  outputFilename: string,
): Promise<ToolProcessResult> {
  assertTotalUploadLimits(context.input);
  const file = getRequiredFile(context.input, field);
  assertExt(file, extensions);
  assertOfficeInputSize(file);

  context.setProgress(15, "Converting with LibreOffice...");
  const outputPath = await convertOfficeToPdf(file.path, context.outputDir);
  const pageCount = await getPdfPageCount(outputPath);
  if (pageCount > OFFICE_MAX_PAGES) {
    throw new ApiError(
      `Converted PDF has ${pageCount} pages. Office conversion limit is ${OFFICE_MAX_PAGES} pages.`,
      413,
    );
  }

  const finalPath = getOutputPath(context, outputFilename);
  await fs.copyFile(outputPath, finalPath);
  return doneResult(finalPath, outputFilename, "application/pdf");
}

export const processWordToPdf: ToolProcessor = async (context) =>
  convertOfficeProcessor(context, "file", [".doc", ".docx"], "word.pdf");

export const processPowerpointToPdf: ToolProcessor = async (context) =>
  convertOfficeProcessor(context, "file", [".ppt", ".pptx"], "slides.pdf");

export const processExcelToPdf: ToolProcessor = async (context) =>
  convertOfficeProcessor(context, "file", [".xls", ".xlsx"], "sheet.pdf");

async function resolveTextForPage(
  context: ToolProcessContext,
  pdfPath: string,
  pageNumber: number,
  includeOcr: boolean,
  ocrState: { used: number; warned: boolean; available: boolean },
  imagePathForOcr: string | null,
): Promise<string> {
  const textLayer = await extractPdfPageText(pdfPath, pageNumber);
  if (textLayer) {
    return textLayer;
  }

  if (!includeOcr || !ocrState.available) {
    return "";
  }
  if (ocrLimitReached(ocrState.used)) {
    if (!ocrState.warned) {
      context.log(
        `OCR page limit reached (${OCR_MAX_PAGES}); remaining pages skip OCR.`,
      );
      ocrState.warned = true;
    }
    return "";
  }
  if (!imagePathForOcr) {
    return "";
  }

  ocrState.used += 1;
  return runImageOcr(
    imagePathForOcr,
    context.workDir,
    `ocr-${context.tool}-page-${pageNumber}`,
  );
}

export const processPdfToWord: ToolProcessor = async (context) => {
  assertTotalUploadLimits(context.input);
  const file = getRequiredFile(context.input, "file");
  assertPdfFile(file);
  const includeOcr = getBooleanField(context.input, "includeOcr", false);
  const ocrAvailable = includeOcr ? await isCommandAvailable("tesseract") : false;

  const pageCount = await getPdfPageCount(file.path);
  if (pageCount > APP_LIMITS.maxPages) {
    throw pageLimitError(pageCount);
  }

  const imageDir = path.join(context.workDir, "word-images");
  await fs.mkdir(imageDir, { recursive: true });
  const paragraphs: Paragraph[] = [];
  const ocrState = { used: 0, warned: false, available: ocrAvailable };

  if (includeOcr && !ocrAvailable) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "OCR unavailable in this runtime. Text layer extraction only.",
          }),
        ],
      }),
    );
  }

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    context.setProgress(
      progressForPage(pageNumber, pageCount, 10, 85),
      `Rendering page ${pageNumber}/${pageCount}...`,
    );
    const images = await rasterizePdfToImages(file.path, imageDir, {
      dpi: OCR_DPI,
      format: "png",
      firstPage: pageNumber,
      lastPage: pageNumber,
      singleFile: true,
    });
    const imagePath = images[0];
    if (!imagePath) {
      throw new ApiError(`Failed to render page ${pageNumber}.`, 500);
    }

    const imageBytes = await fs.readFile(imagePath);
    if (pageNumber > 1) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: "", break: 1 })],
          pageBreakBefore: true,
        }),
      );
    }
    paragraphs.push(
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

    if (includeOcr) {
      const text = await resolveTextForPage(
        context,
        file.path,
        pageNumber,
        includeOcr,
        ocrState,
        imagePath,
      );
      if (text) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: `Extracted Text (Page ${pageNumber}): ${text}` })],
          }),
        );
      }
    }

    await fs.rm(imagePath, { force: true });
  }

  const document = new Document({
    sections: [{ children: paragraphs }],
  });
  const outputPath = getOutputPath(context, "output.docx");
  await fs.writeFile(outputPath, Buffer.from(await Packer.toBuffer(document)));
  return doneResult(
    outputPath,
    "output.docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
};

export const processPdfToPowerpoint: ToolProcessor = async (context) => {
  assertTotalUploadLimits(context.input);
  const file = getRequiredFile(context.input, "file");
  assertPdfFile(file);
  const includeOcr = getBooleanField(context.input, "includeOcr", false);
  const ocrAvailable = includeOcr ? await isCommandAvailable("tesseract") : false;

  const pageCount = await getPdfPageCount(file.path);
  if (pageCount > APP_LIMITS.maxPages) {
    throw pageLimitError(pageCount);
  }

  const imageDir = path.join(context.workDir, "ppt-images");
  await fs.mkdir(imageDir, { recursive: true });
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  const ocrState = { used: 0, warned: false, available: ocrAvailable };
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    context.setProgress(
      progressForPage(pageNumber, pageCount, 10, 85),
      `Building slide ${pageNumber}/${pageCount}...`,
    );

    const images = await rasterizePdfToImages(file.path, imageDir, {
      dpi: OCR_DPI,
      format: "jpg",
      firstPage: pageNumber,
      lastPage: pageNumber,
      singleFile: true,
    });
    const imagePath = images[0];
    if (!imagePath) {
      throw new ApiError(`Failed to render page ${pageNumber}.`, 500);
    }

    const slide = pptx.addSlide();
    slide.addImage({
      path: imagePath,
      x: 0,
      y: 0,
      w: 13.333,
      h: 7.5,
    });

    if (includeOcr) {
      const text = await resolveTextForPage(
        context,
        file.path,
        pageNumber,
        includeOcr,
        ocrState,
        imagePath,
      );
      if (text) {
        const noteText = text.length > 8000 ? `${text.slice(0, 8000)}...` : text;
        slide.addNotes(`Page ${pageNumber} text:\n${noteText}`);
      }
    }

    await fs.rm(imagePath, { force: true });
  }

  const outputPath = getOutputPath(context, "output.pptx");
  const buffer = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  await fs.writeFile(outputPath, buffer);
  return doneResult(
    outputPath,
    "output.pptx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  );
};

export const processPdfToExcel: ToolProcessor = async (context) => {
  assertTotalUploadLimits(context.input);
  const file = getRequiredFile(context.input, "file");
  assertPdfFile(file);
  const includeOcr = getBooleanField(context.input, "includeOcr", false);
  const ocrAvailable = includeOcr ? await isCommandAvailable("tesseract") : false;

  const pageCount = await getPdfPageCount(file.path);
  if (pageCount > APP_LIMITS.maxPages) {
    throw pageLimitError(pageCount);
  }

  const workbook = new ExcelJS.Workbook();
  const imageDir = path.join(context.workDir, "excel-images");
  await fs.mkdir(imageDir, { recursive: true });

  let ocrUsed = 0;
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    context.setProgress(
      progressForPage(pageNumber, pageCount, 10, 90),
      `Processing page ${pageNumber}/${pageCount}...`,
    );

    const worksheet = workbook.addWorksheet(`page-${pageNumber}`);
    let text = await extractPdfPageText(file.path, pageNumber);

    if (!text && includeOcr && ocrAvailable && ocrUsed < OCR_MAX_PAGES) {
      const images = await rasterizePdfToImages(file.path, imageDir, {
        dpi: OCR_DPI,
        format: "jpg",
        firstPage: pageNumber,
        lastPage: pageNumber,
        singleFile: true,
      });
      const imagePath = images[0];
      if (imagePath) {
        try {
          text = await runImageOcr(
            imagePath,
            context.workDir,
            `ocr-excel-page-${pageNumber}`,
          );
          ocrUsed += 1;
        } finally {
          await fs.rm(imagePath, { force: true });
        }
      }
    }

    if (text) {
      const cell = worksheet.getCell("A1");
      cell.value = text;
      cell.alignment = {
        wrapText: true,
        vertical: "top",
      };
      worksheet.getColumn(1).width = 120;
    } else if (includeOcr && !ocrAvailable) {
      worksheet.getCell("A1").value =
        "OCR unavailable in this runtime. No text layer found for this page.";
    } else if (includeOcr && ocrUsed >= OCR_MAX_PAGES) {
      worksheet.getCell("A1").value =
        `No text layer found. OCR page limit (${OCR_MAX_PAGES}) reached.`;
    } else {
      worksheet.getCell("A1").value = "No text layer found on this page.";
    }
  }

  const outputPath = getOutputPath(context, "output.xlsx");
  await writeArrayBuffer(outputPath, await workbook.xlsx.writeBuffer());
  return doneResult(
    outputPath,
    "output.xlsx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
};


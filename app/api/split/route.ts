import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import { APP_LIMITS } from "@/lib/config";
import { ApiError, withApiErrorHandling } from "@/lib/server/api";
import { getRequiredFile } from "@/lib/server/form";
import { fileResponse } from "@/lib/server/http";
import { assertMaxPages, assertPdfMime } from "@/lib/server/limits";
import { parseSplitRangeGroups } from "@/lib/server/pdf-pages";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const response = await withApiErrorHandling(async () => {
    const formData = await request.formData();
    const file = getRequiredFile(formData, "file");
    assertPdfMime(file);

    const rangeInput = String(formData.get("ranges") ?? "").trim();
    let sourcePdf: PDFDocument;
    try {
      sourcePdf = await PDFDocument.load(await file.arrayBuffer());
    } catch {
      throw new ApiError(`"${file.name}" is not a valid PDF file.`, 400);
    }

    const pageCount = sourcePdf.getPageCount();
    assertMaxPages(pageCount);
    const groups = parseSplitRangeGroups(rangeInput, pageCount);
    if (groups.length > APP_LIMITS.maxFiles * 10) {
      throw new ApiError("Too many split segments requested.", 400);
    }

    const zip = new JSZip();

    for (let segmentIndex = 0; segmentIndex < groups.length; segmentIndex += 1) {
      const group = groups[segmentIndex];
      const outputPdf = await PDFDocument.create();
      const copiedPages = await outputPdf.copyPages(sourcePdf, group);
      copiedPages.forEach((page) => outputPdf.addPage(page));
      const outputBytes = await outputPdf.save();
      const rangeLabel =
        group.length === 1
          ? `${group[0] + 1}`
          : `${group[0] + 1}-${group[group.length - 1] + 1}`;
      zip.file(`split-${segmentIndex + 1}-${rangeLabel}.pdf`, outputBytes);
    }

    const zipBytes = await zip.generateAsync({ type: "uint8array" });
    return fileResponse(zipBytes, "split.zip", "application/zip");
  });

  return response as Response;
}

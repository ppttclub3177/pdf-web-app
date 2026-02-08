import { PDFDocument } from "pdf-lib";
import { APP_LIMITS } from "@/lib/config";
import { ApiError, withApiErrorHandling } from "@/lib/server/api";
import { getRequiredFiles } from "@/lib/server/form";
import { assertMaxPages, assertPdfMime } from "@/lib/server/limits";
import { fileResponse } from "@/lib/server/http";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const response = await withApiErrorHandling(async () => {
    const formData = await request.formData();
    const files = getRequiredFiles(formData, "files");
    files.forEach(assertPdfMime);

    const outputPdf = await PDFDocument.create();
    let totalPages = 0;

    for (const file of files) {
      let sourcePdf: PDFDocument;
      try {
        sourcePdf = await PDFDocument.load(await file.arrayBuffer());
      } catch {
        throw new ApiError(`"${file.name}" is not a valid PDF file.`, 400);
      }

      const pageCount = sourcePdf.getPageCount();
      totalPages += pageCount;
      if (totalPages > APP_LIMITS.maxPages) {
        throw new ApiError(
          `Merged output exceeds ${APP_LIMITS.maxPages} page limit.`,
          400,
        );
      }

      const copiedPages = await outputPdf.copyPages(
        sourcePdf,
        sourcePdf.getPageIndices(),
      );
      copiedPages.forEach((page) => outputPdf.addPage(page));
    }

    assertMaxPages(totalPages);
    const outputBytes = await outputPdf.save();
    return fileResponse(outputBytes, "merged.pdf", "application/pdf");
  });

  return response as Response;
}

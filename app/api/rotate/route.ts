import { PDFDocument, degrees } from "pdf-lib";
import { ApiError, withApiErrorHandling } from "@/lib/server/api";
import { getRequiredFile } from "@/lib/server/form";
import { fileResponse } from "@/lib/server/http";
import { assertMaxPages, assertPdfMime } from "@/lib/server/limits";
import { parsePageSelection } from "@/lib/server/pdf-pages";

export const runtime = "nodejs";

const ALLOWED_ANGLES = new Set([90, 180, 270]);

export async function POST(request: Request): Promise<Response> {
  const response = await withApiErrorHandling(async () => {
    const formData = await request.formData();
    const file = getRequiredFile(formData, "file");
    assertPdfMime(file);

    const angle = Number.parseInt(String(formData.get("angle") ?? "90"), 10);
    if (!ALLOWED_ANGLES.has(angle)) {
      throw new ApiError("Angle must be 90, 180, or 270.", 400);
    }

    let sourcePdf: PDFDocument;
    try {
      sourcePdf = await PDFDocument.load(await file.arrayBuffer());
    } catch {
      throw new ApiError(`"${file.name}" is not a valid PDF file.`, 400);
    }

    assertMaxPages(sourcePdf.getPageCount());
    const pageSelection = parsePageSelection(
      String(formData.get("pages") ?? "all"),
      sourcePdf.getPageCount(),
    );

    const pages = sourcePdf.getPages();
    for (const index of pageSelection) {
      const page = pages[index];
      const currentAngle = page.getRotation().angle;
      page.setRotation(degrees((currentAngle + angle) % 360));
    }

    const outputBytes = await sourcePdf.save();
    return fileResponse(outputBytes, "rotated.pdf", "application/pdf");
  });

  return response as Response;
}

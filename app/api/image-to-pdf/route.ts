import { withApiErrorHandling } from "@/lib/server/api";
import { getRequiredFiles } from "@/lib/server/form";
import { fileResponse } from "@/lib/server/http";
import { assertJpgPngMime } from "@/lib/server/limits";
import { imagesToPdfBytes } from "@/lib/server/image-pdf";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const response = await withApiErrorHandling(async () => {
    const formData = await request.formData();
    const files = getRequiredFiles(formData, "files");
    files.forEach(assertJpgPngMime);

    const orientation =
      String(formData.get("orientation") ?? "portrait") === "landscape"
        ? "landscape"
        : "portrait";
    const margin = Math.max(
      0,
      Math.min(80, Number.parseFloat(String(formData.get("margin") ?? "24"))),
    );

    const outputBytes = await imagesToPdfBytes(files, { orientation, margin });
    return fileResponse(outputBytes, "images.pdf", "application/pdf");
  });

  return response as Response;
}

import { promises as fs } from "node:fs";
import path from "node:path";
import { runCommand } from "@/lib/server/command";

type RasterizeOptions = {
  dpi?: number;
  format?: "jpg" | "png";
};

export async function rasterizePdfToImages(
  pdfPath: string,
  outputDir: string,
  options?: RasterizeOptions,
): Promise<string[]> {
  const dpi = options?.dpi ?? 150;
  const format = options?.format ?? "jpg";
  const outputPrefix = path.join(outputDir, "page");
  const formatFlag = format === "jpg" ? "-jpeg" : "-png";
  const args = ["-r", String(dpi), formatFlag, pdfPath, outputPrefix];

  await runCommand("pdftoppm", args);

  const entries = await fs.readdir(outputDir);
  const extension = format === "jpg" ? ".jpg" : ".png";
  return entries
    .filter((entry) => entry.startsWith("page-") && entry.endsWith(extension))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((entry) => path.join(outputDir, entry));
}

import { promises as fs } from "node:fs";
import path from "node:path";
import { runCommand } from "@/lib/server/command";

type RasterizeOptions = {
  dpi?: number;
  format?: "jpg" | "png";
  firstPage?: number;
  lastPage?: number;
  singleFile?: boolean;
};

export async function rasterizePdfToImages(
  pdfPath: string,
  outputDir: string,
  options?: RasterizeOptions,
): Promise<string[]> {
  const dpi = options?.dpi ?? 150;
  const format = options?.format ?? "jpg";
  const outputBaseName =
    options?.singleFile && options.firstPage
      ? `page-${options.firstPage}`
      : "page";
  const outputPrefix = path.join(outputDir, outputBaseName);
  const formatFlag = format === "jpg" ? "-jpeg" : "-png";
  const args: string[] = [];
  if (options?.firstPage) {
    args.push("-f", String(options.firstPage));
  }
  if (options?.lastPage) {
    args.push("-l", String(options.lastPage));
  }
  if (options?.singleFile) {
    args.push("-singlefile");
  }
  args.push("-r", String(dpi), formatFlag, pdfPath, outputPrefix);

  await runCommand("pdftoppm", args);

  const extension = format === "jpg" ? ".jpg" : ".png";
  if (options?.singleFile) {
    const filePath = path.join(outputDir, `${outputBaseName}${extension}`);
    try {
      await fs.access(filePath);
      return [filePath];
    } catch {
      return [];
    }
  }

  const entries = await fs.readdir(outputDir);
  return entries
    .filter((entry) => entry.startsWith("page-") && entry.endsWith(extension))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((entry) => path.join(outputDir, entry));
}

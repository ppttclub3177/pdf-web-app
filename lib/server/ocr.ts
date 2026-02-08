import { promises as fs } from "node:fs";
import path from "node:path";
import { OCR_ENABLED } from "@/lib/config";
import { isCommandAvailable, runCommand } from "@/lib/server/command";

export async function canUseOcr(): Promise<boolean> {
  if (!OCR_ENABLED) {
    return false;
  }
  return isCommandAvailable("tesseract");
}

export async function runImageOcr(
  imagePath: string,
  workDir: string,
  outputBase: string,
): Promise<string> {
  const outputPathNoExt = path.join(workDir, outputBase);
  await runCommand("tesseract", [imagePath, outputPathNoExt, "-l", "eng"]);
  const textPath = `${outputPathNoExt}.txt`;
  const text = await fs.readFile(textPath, "utf-8");
  return text.trim();
}

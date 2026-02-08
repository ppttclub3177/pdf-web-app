import path from "node:path";
import { DOCKER_HINT } from "@/lib/config";
import { ApiError } from "@/lib/server/api";
import { runCommand } from "@/lib/server/command";

async function runLibreOfficeConvert(
  inputPath: string,
  outputDir: string,
): Promise<void> {
  const configured = process.env.LIBREOFFICE_CMD?.trim();
  const candidates = [configured, "libreoffice", "soffice"].filter(
    (value): value is string => Boolean(value && value.length > 0),
  );

  let lastError: Error | null = null;

  for (const command of candidates) {
    try {
      await runCommand(command, [
        "--headless",
        "--norestore",
        "--nolockcheck",
        "--nodefault",
        "--nofirststartwizard",
        "--convert-to",
        "pdf",
        "--outdir",
        outputDir,
        inputPath,
      ]);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (
        error instanceof ApiError &&
        error.message.startsWith(`Required command "${command}" is missing.`)
      ) {
        continue;
      }
      throw error;
    }
  }

  throw new ApiError(
    `LibreOffice command not found. Install LibreOffice and add it to PATH, or set LIBREOFFICE_CMD. ${DOCKER_HINT}${
      lastError ? ` Last error: ${lastError.message}` : ""
    }`,
    503,
  );
}

export async function convertOfficeToPdf(
  inputPath: string,
  outputDir: string,
): Promise<string> {
  await runLibreOfficeConvert(inputPath, outputDir);

  const outputPath = path.join(
    outputDir,
    `${path.parse(inputPath).name}.pdf`,
  );
  return outputPath;
}

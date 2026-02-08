import { promises as fs } from "node:fs";
import { chromium, type Browser } from "playwright";
import { ApiError } from "@/lib/server/api";
import { assertSafeHttpUrl } from "@/lib/server/net-guard";
import { fetchSafeHtmlWithOptions } from "@/lib/server/safe-fetch";
import { HTML_TO_PDF_MAX_BYTES } from "@/lib/config";
import type { ToolProcessor } from "@/lib/tools/processor-types";
import {
  HTML_TO_PDF_TIMEOUT_MS,
  doneResult,
  getField,
  getOutputPath,
  maxHtmlSizeKb,
} from "@/lib/tools/processors/common";

export const processHtmlToPdf: ToolProcessor = async (context) => {
  const mode = getField(context.input, "mode", "url");
  const urlInput = getField(context.input, "url", "").trim();
  const htmlInput = getField(context.input, "html", "").trim();

  if (mode !== "url" && mode !== "html") {
    throw new ApiError('Mode must be "url" or "html".', 400);
  }
  if (mode === "url" && !urlInput) {
    throw new ApiError("URL is required for URL mode.", 400);
  }
  if (mode === "html" && !htmlInput) {
    throw new ApiError("HTML content is required for HTML mode.", 400);
  }
  if (mode === "html" && Buffer.byteLength(htmlInput, "utf-8") > HTML_TO_PDF_MAX_BYTES) {
    throw new ApiError(
      `HTML content is too large. Max is ${maxHtmlSizeKb()}KB.`,
      413,
    );
  }

  context.setProgress(10, "Launching Chromium...");
  let browser: Browser;
  try {
    browser = await chromium.launch({
      args: [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process",
      ],
    });
  } catch {
    throw new ApiError(
      "HTML to PDF requires Playwright Chromium in Docker.",
      503,
    );
  }

  try {
    const page = await browser.newPage();
    await page.route("**/*", async (route) => {
      const requestUrl = route.request().url();
      if (!requestUrl.startsWith("http://") && !requestUrl.startsWith("https://")) {
        await route.continue();
        return;
      }
      try {
        await assertSafeHttpUrl(requestUrl);
        await route.continue();
      } catch {
        await route.abort();
      }
    });

    if (mode === "url") {
      context.setProgress(30, "Fetching target URL...");
      const { html, finalUrl } = await fetchSafeHtmlWithOptions(urlInput, {
        maxBytes: HTML_TO_PDF_MAX_BYTES,
        timeoutMs: HTML_TO_PDF_TIMEOUT_MS,
      });
      if (Buffer.byteLength(html, "utf-8") > HTML_TO_PDF_MAX_BYTES) {
        throw new ApiError(
          `Target HTML exceeded ${maxHtmlSizeKb()}KB limit.`,
          413,
        );
      }
      const baseTag = `<base href="${finalUrl.toString()}">`;
      const htmlWithBase = html.includes("<head>")
        ? html.replace("<head>", `<head>${baseTag}`)
        : `${baseTag}${html}`;
      await page.setContent(htmlWithBase, {
        waitUntil: "networkidle",
        timeout: HTML_TO_PDF_TIMEOUT_MS,
      });
    } else {
      context.setProgress(30, "Rendering HTML...");
      await page.setContent(htmlInput, {
        waitUntil: "networkidle",
        timeout: HTML_TO_PDF_TIMEOUT_MS,
      });
    }

    context.setProgress(80, "Generating PDF...");
    const outputPath = getOutputPath(context, "html.pdf");
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
    });
    await fs.writeFile(outputPath, pdfBuffer);
    return doneResult(outputPath, "html.pdf", "application/pdf");
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    const message =
      error instanceof Error ? error.message : "Failed to render HTML.";
    throw new ApiError(
      `HTML to PDF failed due to resource limits or page errors: ${message}`,
      400,
    );
  } finally {
    await browser.close();
  }
};


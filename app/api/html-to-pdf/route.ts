import { promises as fs } from "node:fs";
import path from "node:path";
import { chromium, type Browser } from "playwright";
import {
  DOCKER_HINT,
  MAX_HTML_FETCH_BYTES,
  MAX_HTML_FETCH_MB,
  REQUEST_TIMEOUT_MS,
} from "@/lib/config";
import { ApiError, withApiErrorHandling } from "@/lib/server/api";
import { pathToFileResponse } from "@/lib/server/http";
import { assertSafeHttpUrl } from "@/lib/server/net-guard";
import { fetchSafeHtml } from "@/lib/server/safe-fetch";
import { withTempDir } from "@/lib/server/temp";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const response = await withApiErrorHandling(async () => {
    const formData = await request.formData();
    const mode = String(formData.get("mode") ?? "url");
    const urlInput = String(formData.get("url") ?? "").trim();
    const htmlInput = String(formData.get("html") ?? "").trim();

    if (mode !== "url" && mode !== "html") {
      throw new ApiError('Mode must be "url" or "html".', 400);
    }

    if (mode === "url" && !urlInput) {
      throw new ApiError("URL is required for URL mode.", 400);
    }
    if (mode === "html" && !htmlInput) {
      throw new ApiError("HTML content is required for HTML mode.", 400);
    }
    if (
      mode === "html" &&
      Buffer.byteLength(htmlInput, "utf-8") > MAX_HTML_FETCH_BYTES
    ) {
      throw new ApiError(
        `HTML content is too large. Max is ${MAX_HTML_FETCH_MB}MB.`,
        413,
      );
    }

    return withTempDir("html-to-pdf", async (workDir) => {
      let browser: Browser;
      try {
        browser = await chromium.launch({
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
      } catch {
        throw new ApiError(`Playwright Chromium is not available. ${DOCKER_HINT}`, 503);
      }

      try {
        const page = await browser.newPage();
        await page.route("**/*", async (route) => {
          const requestUrl = route.request().url();
          if (
            !requestUrl.startsWith("http://") &&
            !requestUrl.startsWith("https://")
          ) {
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
          const { html, finalUrl } = await fetchSafeHtml(urlInput);
          const baseTag = `<base href="${finalUrl.toString()}">`;
          const htmlWithBase = html.includes("<head")
            ? html.replace("<head>", `<head>${baseTag}`)
            : `${baseTag}${html}`;

          await page.setContent(htmlWithBase, {
            waitUntil: "networkidle",
            timeout: REQUEST_TIMEOUT_MS,
          });
        } else {
          await page.setContent(htmlInput, {
            waitUntil: "networkidle",
            timeout: REQUEST_TIMEOUT_MS,
          });
        }

        const outputPath = path.join(workDir, "output.pdf");
        const pdfBuffer = await page.pdf({
          format: "A4",
          printBackground: true,
        });
        await fs.writeFile(outputPath, pdfBuffer);
        return pathToFileResponse(outputPath, "html.pdf", "application/pdf");
      } finally {
        await browser.close();
      }
    });
  });

  return response as Response;
}

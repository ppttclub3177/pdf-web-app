import {
  MAX_HTML_FETCH_BYTES,
  REQUEST_TIMEOUT_MS,
  REQUEST_TIMEOUT_SEC,
} from "@/lib/config";
import { ApiError } from "@/lib/server/api";
import { assertSafeHttpUrl } from "@/lib/server/net-guard";

const MAX_REDIRECTS = 5;

function isRedirectStatus(status: number): boolean {
  return status >= 300 && status < 400;
}

function getRedirectUrl(location: string, currentUrl: URL): URL {
  try {
    return new URL(location, currentUrl);
  } catch {
    throw new ApiError("Invalid redirect URL encountered.", 400);
  }
}

async function fetchWithTimeout(url: URL): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url.toString(), {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "User-Agent": "PDFFlowBot/1.0 (+html-to-pdf)",
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(
        `URL fetch timed out after ${REQUEST_TIMEOUT_SEC} seconds.`,
        408,
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function readBodyWithSizeLimit(response: Response): Promise<string> {
  const contentLengthHeader = response.headers.get("content-length");
  if (contentLengthHeader) {
    const declared = Number.parseInt(contentLengthHeader, 10);
    if (Number.isFinite(declared) && declared > MAX_HTML_FETCH_BYTES) {
      throw new ApiError(
        `Target HTML is too large. Max is ${Math.floor(
          MAX_HTML_FETCH_BYTES / (1024 * 1024),
        )}MB.`,
        413,
      );
    }
  }

  if (!response.body) {
    return "";
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (!value) {
      continue;
    }
    total += value.length;
    if (total > MAX_HTML_FETCH_BYTES) {
      throw new ApiError(
        `Target HTML exceeded max size ${Math.floor(
          MAX_HTML_FETCH_BYTES / (1024 * 1024),
        )}MB.`,
        413,
      );
    }
    chunks.push(value);
  }

  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  return new TextDecoder("utf-8").decode(combined);
}

export async function fetchSafeHtml(inputUrl: string): Promise<{
  html: string;
  finalUrl: URL;
}> {
  let currentUrl = await assertSafeHttpUrl(inputUrl);

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const response = await fetchWithTimeout(currentUrl);
    if (isRedirectStatus(response.status)) {
      const location = response.headers.get("location");
      if (!location) {
        throw new ApiError("Redirect response missing location header.", 400);
      }
      const redirectedUrl = getRedirectUrl(location, currentUrl);
      currentUrl = await assertSafeHttpUrl(redirectedUrl.toString());
      continue;
    }

    if (!response.ok) {
      throw new ApiError(
        `Failed to fetch URL: ${response.status} ${response.statusText}`,
        400,
      );
    }

    const contentType = response.headers.get("content-type") || "";
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml+xml")
    ) {
      throw new ApiError("URL did not return HTML content.", 400);
    }

    const html = await readBodyWithSizeLimit(response);
    return { html, finalUrl: currentUrl };
  }

  throw new ApiError("Too many redirects while fetching URL.", 400);
}

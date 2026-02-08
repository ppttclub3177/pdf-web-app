export const SITE_NAME =
  process.env.NEXT_PUBLIC_SITE_NAME?.trim() || "PDFFlow";

export const SITE_DESCRIPTION =
  "Fast online PDF tools for merge, split, convert, and secure workflows.";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";

export function getAbsoluteUrl(path = "/"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL.replace(/\/+$/, "")}${normalizedPath}`;
}

export const SITE_NAME =
  process.env.NEXT_PUBLIC_SITE_NAME?.trim() || "PDFFlow";

export const SITE_DESCRIPTION =
  "Fast online PDF tools for merge, split, convert, and secure workflows.";
export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "pdf.flow.contact@gmail.com";

const DEFAULT_SITE_URL = "https://pdf-web-app-fwwm.onrender.com";

function normalizeSiteUrl(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const normalized = new URL(trimmed);
    return normalized.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

export const SITE_URL =
  normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
  normalizeSiteUrl(process.env.RENDER_EXTERNAL_URL) ||
  DEFAULT_SITE_URL;

export function getAbsoluteUrl(path = "/"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, `${SITE_URL}/`).toString();
}

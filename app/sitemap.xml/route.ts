import { NextResponse } from "next/server";
import { PDF_TOOLS, getToolHref } from "@/lib/tools";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_PUBLIC_URL = "https://pdf-web-app-fwwm.onrender.com";
const STATIC_PATHS = ["/", "/privacy", "/terms"];

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function getBaseUrl(request: Request): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    return trimTrailingSlash(explicit);
  }

  const renderExternalUrl = process.env.RENDER_EXTERNAL_URL?.trim();
  if (renderExternalUrl) {
    return trimTrailingSlash(renderExternalUrl);
  }

  const forwardedHost =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const requestUrl = new URL(request.url);
  if (requestUrl.host) {
    return `${requestUrl.protocol}//${requestUrl.host}`;
  }

  return DEFAULT_PUBLIC_URL;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET(request: Request): Promise<Response> {
  const base = getBaseUrl(request);
  const now = new Date().toISOString();
  const toolPaths = PDF_TOOLS.map((tool) => getToolHref(tool.slug));
  const paths = Array.from(new Set([...STATIC_PATHS, ...toolPaths]));

  const body = paths
    .map((path) => {
      const priority = path === "/" ? "1.0" : "0.7";
      return [
        "<url>",
        `<loc>${escapeXml(`${base}${path}`)}</loc>`,
        `<lastmod>${now}</lastmod>`,
        "<changefreq>weekly</changefreq>",
        `<priority>${priority}</priority>`,
        "</url>",
      ].join("");
    })
    .join("");

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    body +
    `</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}


import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_PUBLIC_URL = "https://pdf-web-app-fwwm.onrender.com";

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

export async function GET(request: Request): Promise<Response> {
  const base = getBaseUrl(request);
  const body = `User-agent: *
Allow: /

Sitemap: ${base}/sitemap.xml
`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}


import dns from "node:dns/promises";
import net from "node:net";
import { URL } from "node:url";
import { ApiError } from "@/lib/server/api";

const BLOCKED_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }

  const [a, b] = parts;
  return (
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a === 127 ||
    (a === 169 && b === 254) ||
    a === 0
  );
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80")
  );
}

function assertIpAllowed(ip: string): void {
  if (net.isIPv4(ip) && isPrivateIpv4(ip)) {
    throw new ApiError("Blocked private network target URL.", 400);
  }
  if (net.isIPv6(ip) && isPrivateIpv6(ip)) {
    throw new ApiError("Blocked private network target URL.", 400);
  }
}

export async function assertSafeHttpUrl(rawUrl: string): Promise<URL> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new ApiError("Invalid URL format.", 400);
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new ApiError("Only http and https URLs are allowed.", 400);
  }

  const host = parsedUrl.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host)) {
    throw new ApiError("Blocked localhost URL.", 400);
  }

  if (net.isIP(host)) {
    assertIpAllowed(host);
    return parsedUrl;
  }

  const records = await dns.lookup(host, { all: true });
  if (records.length === 0) {
    throw new ApiError("Unable to resolve target URL.", 400);
  }
  for (const record of records) {
    assertIpAllowed(record.address);
  }

  return parsedUrl;
}

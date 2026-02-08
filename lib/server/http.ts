import { promises as fs } from "node:fs";
import path from "node:path";
import JSZip from "jszip";

export function uint8ToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

export function withDownloadHeaders(
  filename: string,
  contentType: string,
): HeadersInit {
  return {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
  };
}

export function fileResponse(
  bytes: Uint8Array | ArrayBuffer,
  filename: string,
  contentType: string,
): Response {
  const body = bytes instanceof Uint8Array ? uint8ToArrayBuffer(bytes) : bytes;
  return new Response(body, {
    status: 200,
    headers: withDownloadHeaders(filename, contentType),
  });
}

export async function pathToFileResponse(
  filePath: string,
  filename: string,
  contentType: string,
): Promise<Response> {
  const bytes = await fs.readFile(filePath);
  return fileResponse(bytes, filename, contentType);
}

export async function zipPathsResponse(
  entries: Array<{ path: string; name: string }>,
  outputFilename: string,
): Promise<Response> {
  const zip = new JSZip();
  for (const entry of entries) {
    const bytes = await fs.readFile(entry.path);
    zip.file(entry.name, bytes);
  }
  const zippedBytes = await zip.generateAsync({ type: "uint8array" });
  return fileResponse(zippedBytes, outputFilename, "application/zip");
}

export function changeExtension(filename: string, nextExt: string): string {
  const parsed = path.parse(filename);
  return `${parsed.name}${nextExt}`;
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

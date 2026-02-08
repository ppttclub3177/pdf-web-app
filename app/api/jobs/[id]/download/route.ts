import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { ApiError, jsonError } from "@/lib/server/api";
import { getJobForDownload } from "@/lib/jobs/queue";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: RouteContext,
): Promise<Response> {
  try {
    const { id } = await params;
    const download = getJobForDownload(id);
    const stream = createReadStream(download.path);

    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 200,
      headers: {
        "Content-Type": download.contentType,
        "Content-Disposition": `attachment; filename="${download.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonError(error.message, error.status);
    }
    console.error("Failed to download job output:", error);
    return jsonError("Unexpected server error.", 500);
  }
}


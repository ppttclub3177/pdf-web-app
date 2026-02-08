import { ApiError, jsonError } from "@/lib/server/api";
import { createJob, getJobStatus } from "@/lib/jobs/queue";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const result = await createJob(id, formData);
    return Response.json(result, { status: 202 });
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonError(error.message, error.status);
    }
    console.error("Failed to create job:", error);
    return jsonError("Unexpected server error.", 500);
  }
}

export async function GET(
  _request: Request,
  { params }: RouteContext,
): Promise<Response> {
  try {
    const { id } = await params;
    const status = getJobStatus(id);
    return Response.json(status, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonError(error.message, error.status);
    }
    console.error("Failed to fetch job status:", error);
    return jsonError("Unexpected server error.", 500);
  }
}


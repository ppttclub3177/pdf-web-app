import { APP_LIMITS } from "@/lib/config";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  return Response.json(APP_LIMITS, { status: 200 });
}

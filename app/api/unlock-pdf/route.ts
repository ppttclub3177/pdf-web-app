import { POST as basePost } from "@/app/api/unlock/route";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return basePost(request);
}

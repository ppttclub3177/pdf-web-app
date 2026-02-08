import { NextResponse } from "next/server";
import { REQUEST_TIMEOUT_MS, REQUEST_TIMEOUT_SEC } from "@/lib/config";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function jsonError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function withApiErrorHandling<T>(
  action: () => Promise<T>,
): Promise<T | NextResponse> {
  let timeoutId: NodeJS.Timeout | undefined;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(
          new ApiError(
            `Request timed out after ${REQUEST_TIMEOUT_SEC} seconds.`,
            408,
          ),
        );
      }, REQUEST_TIMEOUT_MS);
    });

    const result = await Promise.race([action(), timeoutPromise]);
    return result;
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonError(error.message, error.status);
    }

    console.error("Unhandled API error:", error);
    return jsonError("Unexpected server error.", 500);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

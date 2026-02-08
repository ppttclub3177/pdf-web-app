import { ApiError } from "@/lib/server/api";

function parseSinglePageToken(
  token: string,
  pageCount: number,
): { start: number; end: number } {
  const trimmed = token.trim();
  const rangeMatch = /^(\d+)\s*-\s*(\d+)$/.exec(trimmed);
  if (rangeMatch) {
    const start = Number.parseInt(rangeMatch[1], 10);
    const end = Number.parseInt(rangeMatch[2], 10);
    if (start < 1 || end < 1 || start > end || end > pageCount) {
      throw new ApiError(`Invalid page range "${token}".`, 400);
    }
    return { start, end };
  }

  const page = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(page) || page < 1 || page > pageCount) {
    throw new ApiError(`Invalid page number "${token}".`, 400);
  }
  return { start: page, end: page };
}

export function parsePageSelection(
  value: string | null | undefined,
  pageCount: number,
): number[] {
  if (!value || value.trim().length === 0 || value.trim().toLowerCase() === "all") {
    return Array.from({ length: pageCount }, (_, index) => index);
  }

  const tokens = value.split(",").map((token) => token.trim()).filter(Boolean);
  if (tokens.length === 0) {
    throw new ApiError("Page selection cannot be empty.", 400);
  }

  const indexes = new Set<number>();
  for (const token of tokens) {
    const { start, end } = parseSinglePageToken(token, pageCount);
    for (let page = start; page <= end; page += 1) {
      indexes.add(page - 1);
    }
  }

  return Array.from(indexes).sort((a, b) => a - b);
}

export function parseSplitRangeGroups(
  value: string | null | undefined,
  pageCount: number,
): number[][] {
  if (!value || value.trim().length === 0) {
    return Array.from({ length: pageCount }, (_, index) => [index]);
  }

  const tokens = value.split(",").map((token) => token.trim()).filter(Boolean);
  if (tokens.length === 0) {
    throw new ApiError("Split range cannot be empty.", 400);
  }

  return tokens.map((token) => {
    const { start, end } = parseSinglePageToken(token, pageCount);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index - 1);
  });
}

export function toPositiveNumber(
  value: string | null,
  fallback: number,
  min = 0,
): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < min) {
    return fallback;
  }
  return parsed;
}

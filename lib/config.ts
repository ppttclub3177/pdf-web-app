const DEFAULT_MAX_FILES = 20;
const DEFAULT_MAX_FILE_MB = 100;
const DEFAULT_MAX_PAGES = 500;
const DEFAULT_MAX_TOTAL_MB = 300;
const DEFAULT_TEMP_TTL_MINUTES = 20;
const DEFAULT_REQUEST_TIMEOUT_SEC = 120;
const DEFAULT_MAX_HTML_FETCH_MB = 15;

function parseEnvInt(name: string, fallback: number): number {
  const rawValue = process.env[name];
  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return parsedValue;
}

export const APP_LIMITS = {
  maxFiles: parseEnvInt("MAX_FILES", DEFAULT_MAX_FILES),
  maxFileMb: parseEnvInt("MAX_FILE_MB", DEFAULT_MAX_FILE_MB),
  maxPages: parseEnvInt("MAX_PAGES", DEFAULT_MAX_PAGES),
  maxTotalMb: parseEnvInt("MAX_TOTAL_MB", DEFAULT_MAX_TOTAL_MB),
} as const;

export const APP_LIMITS_BYTES = {
  maxFileBytes: APP_LIMITS.maxFileMb * 1024 * 1024,
  maxTotalBytes: APP_LIMITS.maxTotalMb * 1024 * 1024,
} as const;

export const TMP_DIR = process.env.TMP_DIR || "data/tmp";

export const TMP_TTL_MINUTES = parseEnvInt(
  "TMP_TTL_MINUTES",
  DEFAULT_TEMP_TTL_MINUTES,
);

export const REQUEST_TIMEOUT_SEC = parseEnvInt(
  "REQUEST_TIMEOUT_SEC",
  DEFAULT_REQUEST_TIMEOUT_SEC,
);

export const REQUEST_TIMEOUT_MS = REQUEST_TIMEOUT_SEC * 1000;

export const MAX_HTML_FETCH_MB = parseEnvInt(
  "MAX_HTML_FETCH_MB",
  DEFAULT_MAX_HTML_FETCH_MB,
);

export const MAX_HTML_FETCH_BYTES = MAX_HTML_FETCH_MB * 1024 * 1024;

export const DOCKER_HINT =
  "Missing system dependency. Run in Docker full mode: docker compose up --build";

export const OCR_ENABLED = process.env.ENABLE_OCR !== "0";

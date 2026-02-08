const DEFAULT_MAX_FILES = 5;
const DEFAULT_MAX_FILE_MB = 25;
const DEFAULT_MAX_PAGES = 50;
const DEFAULT_MAX_TOTAL_MB = 50;
const DEFAULT_TEMP_TTL_MINUTES = 15;
const DEFAULT_REQUEST_TIMEOUT_SEC = 600;
const DEFAULT_MAX_HTML_FETCH_MB = 1;
const DEFAULT_OCR_MAX_PAGES = 10;
const DEFAULT_OCR_DPI = 150;
const DEFAULT_HTML_TO_PDF_MAX_KB = 300;
const DEFAULT_JOB_TIMEOUT_MINUTES = 10;
const DEFAULT_JOB_RETENTION_MINUTES = 15;
const DEFAULT_OFFICE_MAX_FILE_MB = 10;
const DEFAULT_OFFICE_MAX_PAGES = 30;

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

export const OCR_MAX_PAGES = parseEnvInt(
  "OCR_MAX_PAGES",
  DEFAULT_OCR_MAX_PAGES,
);

export const OCR_DPI = parseEnvInt("OCR_DPI", DEFAULT_OCR_DPI);

export const HTML_TO_PDF_MAX_BYTES =
  parseEnvInt("HTML_TO_PDF_MAX_KB", DEFAULT_HTML_TO_PDF_MAX_KB) * 1024;

export const JOB_TIMEOUT_MS =
  parseEnvInt("JOB_TIMEOUT_MINUTES", DEFAULT_JOB_TIMEOUT_MINUTES) * 60 * 1000;

export const JOB_RETENTION_MS =
  parseEnvInt("JOB_RETENTION_MINUTES", DEFAULT_JOB_RETENTION_MINUTES) *
  60 *
  1000;

export const OFFICE_MAX_FILE_MB = parseEnvInt(
  "OFFICE_MAX_FILE_MB",
  DEFAULT_OFFICE_MAX_FILE_MB,
);

export const OFFICE_MAX_FILE_BYTES = OFFICE_MAX_FILE_MB * 1024 * 1024;

export const OFFICE_MAX_PAGES = parseEnvInt(
  "OFFICE_MAX_PAGES",
  DEFAULT_OFFICE_MAX_PAGES,
);

export const DOCKER_HINT =
  "Missing system dependency. Run in Docker full mode: docker compose up --build";

export const OCR_ENABLED = process.env.ENABLE_OCR !== "0";

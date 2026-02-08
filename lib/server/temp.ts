import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { TMP_DIR, TMP_TTL_MINUTES } from "@/lib/config";

function resolveTmpRoot(): string {
  return path.isAbsolute(TMP_DIR) ? TMP_DIR : path.join(process.cwd(), TMP_DIR);
}

export async function ensureTmpRoot(): Promise<string> {
  const tmpRoot = resolveTmpRoot();
  await fs.mkdir(tmpRoot, { recursive: true });
  return tmpRoot;
}

export async function cleanupStaleTempDirs(): Promise<void> {
  const tmpRoot = await ensureTmpRoot();
  const expirationMs = TMP_TTL_MINUTES * 60 * 1000;
  const now = Date.now();

  const entries = await fs.readdir(tmpRoot, { withFileTypes: true });
  await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const directoryPath = path.join(tmpRoot, entry.name);
        try {
          const stats = await fs.stat(directoryPath);
          if (now - stats.mtimeMs > expirationMs) {
            await fs.rm(directoryPath, { recursive: true, force: true });
          }
        } catch {
          // Ignore race conditions caused by concurrent cleanup.
        }
      }),
  );
}

export async function createTempDir(prefix: string): Promise<string> {
  await cleanupStaleTempDirs();
  const tmpRoot = await ensureTmpRoot();
  const directoryPath = path.join(tmpRoot, `${prefix}-${randomUUID()}`);
  await fs.mkdir(directoryPath, { recursive: true });
  return directoryPath;
}

export async function withTempDir<T>(
  prefix: string,
  action: (directoryPath: string) => Promise<T>,
): Promise<T> {
  const directoryPath = await createTempDir(prefix);
  try {
    return await action(directoryPath);
  } finally {
    await fs.rm(directoryPath, { recursive: true, force: true });
  }
}

export async function saveUploadedFile(
  file: File,
  outputPath: string,
): Promise<void> {
  const arrayBuffer = await file.arrayBuffer();
  await fs.writeFile(outputPath, Buffer.from(arrayBuffer));
}

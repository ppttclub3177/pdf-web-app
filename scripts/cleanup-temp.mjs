import { readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

const tmpDir = process.env.TMP_DIR || "data/tmp";
const ttlMinutes = Number.parseInt(process.env.TMP_TTL_MINUTES || "20", 10);
const root = path.isAbsolute(tmpDir) ? tmpDir : path.join(process.cwd(), tmpDir);

async function main() {
  const now = Date.now();
  const ttlMs = Math.max(1, ttlMinutes) * 60 * 1000;
  let removed = 0;

  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    console.log(`Temp root not found: ${root}`);
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const dirPath = path.join(root, entry.name);
    try {
      const stats = await stat(dirPath);
      if (now - stats.mtimeMs > ttlMs) {
        await rm(dirPath, { recursive: true, force: true });
        removed += 1;
      }
    } catch {
      // Ignore entries removed by concurrent workers.
    }
  }

  console.log(`Temp cleanup done. Removed ${removed} stale directories.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

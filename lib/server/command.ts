import { spawn } from "node:child_process";
import { DOCKER_HINT, REQUEST_TIMEOUT_MS, REQUEST_TIMEOUT_SEC } from "@/lib/config";
import { ApiError } from "@/lib/server/api";

type CommandResult = {
  stdout: string;
  stderr: string;
};

export async function runCommand(
  command: string,
  args: string[],
  options?: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    timeoutMs?: number;
  },
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const timeoutMs = options?.timeoutMs ?? REQUEST_TIMEOUT_MS;
    const child = spawn(command, args, {
      cwd: options?.cwd,
      env: options?.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timeoutHandle = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      child.kill("SIGKILL");
      reject(
        new ApiError(
          `Command "${command}" timed out after ${REQUEST_TIMEOUT_SEC} seconds.`,
          408,
        ),
      );
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on("error", (error: NodeJS.ErrnoException) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutHandle);
      if (error.code === "ENOENT") {
        reject(
          new ApiError(`Required command "${command}" is missing. ${DOCKER_HINT}`, 503),
        );
        return;
      }

      reject(new ApiError(`Failed to run command "${command}".`, 500));
    });

    child.on("close", (code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutHandle);
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(
        new ApiError(
          `Command "${command}" failed with code ${code}. ${stderr || stdout}`.trim(),
          400,
        ),
      );
    });
  });
}

export async function isCommandAvailable(command: string): Promise<boolean> {
  const checker = process.platform === "win32" ? "where" : "which";
  try {
    await runCommand(checker, [command]);
    return true;
  } catch {
    return false;
  }
}

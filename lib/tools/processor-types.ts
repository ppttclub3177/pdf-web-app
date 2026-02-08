import type { StoredJobInput } from "@/lib/jobs/types";

export type ToolProcessResult = {
  outputPath: string;
  filename: string;
  contentType: string;
};

export type ToolProcessContext = {
  jobId: string;
  tool: string;
  workDir: string;
  inputDir: string;
  outputDir: string;
  input: StoredJobInput;
  setProgress: (progress: number, message: string) => void;
  log: (message: string) => void;
};

export type ToolProcessor = (
  context: ToolProcessContext,
) => Promise<ToolProcessResult>;


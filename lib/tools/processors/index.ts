import type { ToolSlug } from "@/lib/tools";
import type { ToolProcessContext, ToolProcessResult, ToolProcessor } from "@/lib/tools/processor-types";
import { ApiError } from "@/lib/server/api";
import {
  processCompressPdf,
  processEditPdf,
  processJpgToPdf,
  processMergePdf,
  processPdfToJpg,
  processProtectPdf,
  processRotatePdf,
  processSignPdf,
  processSplitPdf,
  processUnlockPdf,
  processWatermark,
} from "@/lib/tools/processors/pdf-basic";
import {
  processExcelToPdf,
  processPdfToExcel,
  processPdfToPowerpoint,
  processPdfToWord,
  processPowerpointToPdf,
  processWordToPdf,
} from "@/lib/tools/processors/office-and-pdf-office";
import { processHtmlToPdf } from "@/lib/tools/processors/html";

const TOOL_PROCESSORS: Record<ToolSlug, ToolProcessor> = {
  "merge-pdf": processMergePdf,
  "split-pdf": processSplitPdf,
  "compress-pdf": processCompressPdf,
  "pdf-to-word": processPdfToWord,
  "pdf-to-powerpoint": processPdfToPowerpoint,
  "pdf-to-excel": processPdfToExcel,
  "word-to-pdf": processWordToPdf,
  "powerpoint-to-pdf": processPowerpointToPdf,
  "excel-to-pdf": processExcelToPdf,
  "edit-pdf": processEditPdf,
  "pdf-to-jpg": processPdfToJpg,
  "jpg-to-pdf": processJpgToPdf,
  "sign-pdf": processSignPdf,
  watermark: processWatermark,
  "rotate-pdf": processRotatePdf,
  "html-to-pdf": processHtmlToPdf,
  "unlock-pdf": processUnlockPdf,
  "protect-pdf": processProtectPdf,
};

export function isSupportedTool(tool: string): tool is ToolSlug {
  return tool in TOOL_PROCESSORS;
}

export async function processToolJob(
  context: ToolProcessContext,
): Promise<ToolProcessResult> {
  if (!isSupportedTool(context.tool)) {
    throw new ApiError(`Unsupported tool "${context.tool}".`, 404);
  }

  context.log(`processor start (${context.tool})`);
  const processor = TOOL_PROCESSORS[context.tool];
  const result = await processor(context);
  context.log(`processor done (${context.tool})`);
  return result;
}


"use client";

import { FormEvent, useEffect, useState } from "react";
import { APP_LIMITS } from "@/lib/config";
import type { PdfTool } from "@/lib/tools";
import { FileDropzone } from "@/components/tools/file-dropzone";

type Limits = {
  maxFiles: number;
  maxFileMb: number;
  maxPages: number;
  maxTotalMb: number;
};

const DEFAULT_LIMITS: Limits = { ...APP_LIMITS };

function extAllowed(file: File, allowedExtensions: string[]): boolean {
  const lower = file.name.toLowerCase();
  return allowedExtensions.some((ext) => lower.endsWith(ext));
}

function validateFiles(
  files: File[],
  limits: Limits,
  options: {
    min?: number;
    max?: number;
    extensions?: string[];
  } = {},
): string | null {
  const min = options.min ?? 1;
  const max = Math.min(options.max ?? limits.maxFiles, limits.maxFiles);

  if (files.length < min) {
    return `Please select at least ${min} file(s).`;
  }
  if (files.length > max) {
    return `You can upload up to ${max} file(s).`;
  }

  let totalBytes = 0;
  for (const file of files) {
    totalBytes += file.size;
    if (file.size > limits.maxFileMb * 1024 * 1024) {
      return `"${file.name}" exceeds ${limits.maxFileMb}MB limit.`;
    }
    if (options.extensions && !extAllowed(file, options.extensions)) {
      return `"${file.name}" must be one of: ${options.extensions.join(", ")}.`;
    }
  }

  if (totalBytes > limits.maxTotalMb * 1024 * 1024) {
    return `Total upload exceeds ${limits.maxTotalMb}MB limit.`;
  }

  return null;
}

async function parseError(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const payload = (await response.json()) as { error?: string };
    return payload.error || "Request failed.";
  }
  const text = await response.text();
  return text || "Request failed.";
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function useLimits(): Limits {
  const [limits, setLimits] = useState<Limits>(DEFAULT_LIMITS);

  useEffect(() => {
    let active = true;
    fetch("/api/limits")
      .then((response) => response.json() as Promise<Limits>)
      .then((payload) => {
        if (active) {
          setLimits(payload);
        }
      })
      .catch(() => {
        // keep defaults
      });

    return () => {
      active = false;
    };
  }, []);

  return limits;
}

function useToolRequest(tool: PdfTool) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = async (formData: FormData, outputName?: string) => {
    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(tool.apiPath, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error(await parseError(response));
      }

      const blob = await response.blob();
      const filename = outputName || `${tool.slug}.${tool.outputExtension}`;
      downloadBlob(blob, filename);
      setSuccess(`Done. Downloaded ${filename}.`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Request failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  return { submit, isProcessing, error, success, setError };
}

function ToolFormShell({
  tool,
  limits,
  children,
}: {
  tool: PdfTool;
  limits: Limits;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-7 text-zinc-300">{tool.description}</p>
      <p className="rounded-lg border border-zinc-800 bg-[#0a111c] px-3 py-2 text-xs text-zinc-400">
        Limits: {limits.maxFiles} files, {limits.maxFileMb}MB each,{" "}
        {limits.maxTotalMb}MB total, {limits.maxPages} pages per PDF operation.
      </p>
      {tool.systemDependencies?.length ? (
        <p className="rounded-lg border border-yellow-900/40 bg-yellow-950/20 px-3 py-2 text-xs text-yellow-200">
          System dependencies: {tool.systemDependencies.join(", ")}. If missing,
          run Docker full mode: <code>docker compose up --build</code>.
        </p>
      ) : null}
      {children}
    </div>
  );
}

function Status({
  isProcessing,
  error,
  success,
}: {
  isProcessing: boolean;
  error: string | null;
  success: string | null;
}) {
  return (
    <div className="space-y-2">
      {isProcessing ? (
        <p className="rounded-lg border border-blue-900/40 bg-blue-950/30 px-3 py-2 text-sm text-blue-200">
          Processing...
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-lg border border-emerald-900/40 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-300">
          {success}
        </p>
      ) : null}
    </div>
  );
}

function MergeForm({ tool, limits }: { tool: PdfTool; limits: Limits }) {
  const [files, setFiles] = useState<File[]>([]);
  const { submit, isProcessing, error, success, setError } = useToolRequest(tool);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validateFiles(files, limits, {
      extensions: [".pdf"],
    });
    if (validationError) {
      setError(validationError);
      return;
    }
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    await submit(formData, "merged.pdf");
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FileDropzone
        id="merge-files"
        label="Select PDF files"
        accept="application/pdf,.pdf"
        multiple
        files={files}
        onFilesChange={setFiles}
      />
      <Status isProcessing={isProcessing} error={error} success={success} />
      <button
        type="submit"
        disabled={isProcessing}
        className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-orange-400 disabled:bg-zinc-600"
      >
        Merge PDF
      </button>
    </form>
  );
}

function SplitForm({ tool, limits }: { tool: PdfTool; limits: Limits }) {
  const [files, setFiles] = useState<File[]>([]);
  const [ranges, setRanges] = useState("");
  const { submit, isProcessing, error, success, setError } = useToolRequest(tool);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validateFiles(files, limits, {
      max: 1,
      extensions: [".pdf"],
    });
    if (validationError) {
      setError(validationError);
      return;
    }
    const formData = new FormData();
    formData.append("file", files[0]);
    if (ranges.trim()) {
      formData.append("ranges", ranges.trim());
    }
    await submit(formData, "split.zip");
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FileDropzone
        id="split-file"
        label="Select one PDF"
        accept="application/pdf,.pdf"
        files={files}
        onFilesChange={setFiles}
      />
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-200" htmlFor="ranges">
          Page ranges (optional)
        </label>
        <input
          id="ranges"
          value={ranges}
          onChange={(event) => setRanges(event.target.value)}
          placeholder="Example: 1-3,5,7-9"
          className="w-full rounded-lg border border-zinc-700 bg-[#0a111c] px-3 py-2 text-sm text-zinc-100"
        />
      </div>
      <Status isProcessing={isProcessing} error={error} success={success} />
      <button
        type="submit"
        disabled={isProcessing}
        className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-orange-400 disabled:bg-zinc-600"
      >
        Split PDF
      </button>
    </form>
  );
}

function RotateForm({ tool, limits }: { tool: PdfTool; limits: Limits }) {
  const [files, setFiles] = useState<File[]>([]);
  const [angle, setAngle] = useState("90");
  const [pages, setPages] = useState("all");
  const { submit, isProcessing, error, success, setError } = useToolRequest(tool);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validateFiles(files, limits, {
      max: 1,
      extensions: [".pdf"],
    });
    if (validationError) {
      setError(validationError);
      return;
    }
    const formData = new FormData();
    formData.append("file", files[0]);
    formData.append("angle", angle);
    formData.append("pages", pages.trim() || "all");
    await submit(formData, "rotated.pdf");
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FileDropzone
        id="rotate-file"
        label="Select one PDF"
        accept="application/pdf,.pdf"
        files={files}
        onFilesChange={setFiles}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="angle" className="mb-2 block text-sm font-medium text-zinc-200">
            Angle
          </label>
          <select
            id="angle"
            value={angle}
            onChange={(event) => setAngle(event.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-[#0a111c] px-3 py-2 text-sm text-zinc-100"
          >
            <option value="90">90</option>
            <option value="180">180</option>
            <option value="270">270</option>
          </select>
        </div>
        <div>
          <label htmlFor="pages" className="mb-2 block text-sm font-medium text-zinc-200">
            Pages
          </label>
          <input
            id="pages"
            value={pages}
            onChange={(event) => setPages(event.target.value)}
            placeholder="all or 1-3,5"
            className="w-full rounded-lg border border-zinc-700 bg-[#0a111c] px-3 py-2 text-sm text-zinc-100"
          />
        </div>
      </div>
      <Status isProcessing={isProcessing} error={error} success={success} />
      <button
        type="submit"
        disabled={isProcessing}
        className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-orange-400 disabled:bg-zinc-600"
      >
        Rotate PDF
      </button>
    </form>
  );
}

function WatermarkForm({ tool, limits }: { tool: PdfTool; limits: Limits }) {
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [text, setText] = useState("CONFIDENTIAL");
  const [opacity, setOpacity] = useState("0.3");
  const [scale, setScale] = useState("0.35");
  const [position, setPosition] = useState("center");
  const [pages, setPages] = useState("all");
  const { submit, isProcessing, error, success, setError } = useToolRequest(tool);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const pdfError = validateFiles(pdfFiles, limits, {
      max: 1,
      extensions: [".pdf"],
    });
    if (pdfError) {
      setError(pdfError);
      return;
    }
    if (!text.trim() && imageFiles.length === 0) {
      setError("Provide watermark text or an image.");
      return;
    }
    if (imageFiles.length > 1) {
      setError("Only one image watermark is supported.");
      return;
    }
    if (imageFiles.length === 1) {
      const imageError = validateFiles(imageFiles, limits, {
        max: 1,
        extensions: [".png", ".jpg", ".jpeg"],
      });
      if (imageError) {
        setError(imageError);
        return;
      }
    }

    const formData = new FormData();
    formData.append("file", pdfFiles[0]);
    formData.append("text", text);
    formData.append("opacity", opacity);
    formData.append("scale", scale);
    formData.append("position", position);
    formData.append("pages", pages);
    if (imageFiles[0]) {
      formData.append("image", imageFiles[0]);
    }
    await submit(formData, "watermarked.pdf");
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FileDropzone
        id="watermark-pdf"
        label="PDF file"
        accept="application/pdf,.pdf"
        files={pdfFiles}
        onFilesChange={setPdfFiles}
      />
      <FileDropzone
        id="watermark-image"
        label="Watermark image (optional)"
        accept="image/png,image/jpeg,.png,.jpg,.jpeg"
        files={imageFiles}
        onFilesChange={setImageFiles}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-200" htmlFor="wm-text">
            Text (optional if image exists)
          </label>
          <input
            id="wm-text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-[#0a111c] px-3 py-2 text-sm text-zinc-100"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-200" htmlFor="wm-pages">
            Pages
          </label>
          <input
            id="wm-pages"
            value={pages}
            onChange={(event) => setPages(event.target.value)}
            placeholder="all or 1-3,5"
            className="w-full rounded-lg border border-zinc-700 bg-[#0a111c] px-3 py-2 text-sm text-zinc-100"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-200" htmlFor="wm-opacity">
            Opacity
          </label>
          <input
            id="wm-opacity"
            value={opacity}
            onChange={(event) => setOpacity(event.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-[#0a111c] px-3 py-2 text-sm text-zinc-100"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-200" htmlFor="wm-scale">
            Size scale
          </label>
          <input
            id="wm-scale"
            value={scale}
            onChange={(event) => setScale(event.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-[#0a111c] px-3 py-2 text-sm text-zinc-100"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-200" htmlFor="wm-position">
            Position
          </label>
          <select
            id="wm-position"
            value={position}
            onChange={(event) => setPosition(event.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-[#0a111c] px-3 py-2 text-sm text-zinc-100"
          >
            <option value="center">center</option>
            <option value="top-left">top-left</option>
            <option value="top-right">top-right</option>
            <option value="bottom-left">bottom-left</option>
            <option value="bottom-right">bottom-right</option>
          </select>
        </div>
      </div>
      <Status isProcessing={isProcessing} error={error} success={success} />
      <button
        type="submit"
        disabled={isProcessing}
        className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-orange-400 disabled:bg-zinc-600"
      >
        Apply Watermark
      </button>
    </form>
  );
}

function SignForm({ tool, limits }: { tool: PdfTool; limits: Limits }) {
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [signatureFiles, setSignatureFiles] = useState<File[]>([]);
  const [page, setPage] = useState("1");
  const [xPercent, setXPercent] = useState("50");
  const [yPercent, setYPercent] = useState("18");
  const [widthPercent, setWidthPercent] = useState("24");
  const { submit, isProcessing, error, success, setError } = useToolRequest(tool);

  const onPickerClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setXPercent(x.toFixed(2));
    setYPercent((100 - y).toFixed(2));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const pdfError = validateFiles(pdfFiles, limits, {
      max: 1,
      extensions: [".pdf"],
    });
    if (pdfError) {
      setError(pdfError);
      return;
    }
    const signatureError = validateFiles(signatureFiles, limits, {
      max: 1,
      extensions: [".png", ".jpg", ".jpeg"],
    });
    if (signatureError) {
      setError(signatureError);
      return;
    }

    const formData = new FormData();
    formData.append("file", pdfFiles[0]);
    formData.append("signature", signatureFiles[0]);
    formData.append("page", page);
    formData.append("xPercent", xPercent);
    formData.append("yPercent", yPercent);
    formData.append("widthPercent", widthPercent);
    await submit(formData, "signed.pdf");
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FileDropzone
        id="sign-pdf"
        label="PDF file"
        accept="application/pdf,.pdf"
        files={pdfFiles}
        onFilesChange={setPdfFiles}
      />
      <FileDropzone
        id="sign-image"
        label="Signature image (PNG/JPG)"
        accept="image/png,image/jpeg,.png,.jpg,.jpeg"
        files={signatureFiles}
        onFilesChange={setSignatureFiles}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-200">Page</label>
          <input
            value={page}
            onChange={(event) => setPage(event.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-[#0a111c] px-3 py-2 text-sm text-zinc-100"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-200">X %</label>
          <input
            value={xPercent}
            onChange={(event) => setXPercent(event.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-[#0a111c] px-3 py-2 text-sm text-zinc-100"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-200">Y %</label>
          <input
            value={yPercent}
            onChange={(event) => setYPercent(event.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-[#0a111c] px-3 py-2 text-sm text-zinc-100"
          />
        </div>
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-200">Width %</label>
        <input
          value={widthPercent}
          onChange={(event) => setWidthPercent(event.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-[#0a111c] px-3 py-2 text-sm text-zinc-100"
        />
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-zinc-200">Click to place signature</p>
        <div
          onClick={onPickerClick}
          className="relative h-56 cursor-crosshair rounded-lg border border-zinc-700 bg-gradient-to-b from-zinc-900 to-zinc-800"
        >
          <div
            className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-300 bg-orange-500"
            style={{
              left: `${xPercent}%`,
              bottom: `${yPercent}%`,
            }}
          />
        </div>
      </div>
      <Status isProcessing={isProcessing} error={error} success={success} />
      <button
        type="submit"
        disabled={isProcessing}
        className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-orange-400 disabled:bg-zinc-600"
      >
        Sign PDF
      </button>
    </form>
  );
}

function EditForm({ tool, limits }: { tool: PdfTool; limits: Limits }) {
  const [files, setFiles] = useState<File[]>([]);
  const [page, setPage] = useState("1");
  const [text, setText] = useState("Edited text");
  const [textX, setTextX] = useState("15");
  const [textY, setTextY] = useState("75");
  const [textSize, setTextSize] = useState("18");
  const [highlightX, setHighlightX] = useState("12");
  const [highlightY, setHighlightY] = useState("68");
  const [highlightWidth, setHighlightWidth] = useState("40");
  const [highlightHeight, setHighlightHeight] = useState("8");
  const [highlightColor, setHighlightColor] = useState("yellow");
  const { submit, isProcessing, error, success, setError } = useToolRequest(tool);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validateFiles(files, limits, {
      max: 1,
      extensions: [".pdf"],
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    const formData = new FormData();
    formData.append("file", files[0]);
    formData.append("page", page);
    formData.append("text", text);
    formData.append("textX", textX);
    formData.append("textY", textY);
    formData.append("textSize", textSize);
    formData.append("highlightX", highlightX);
    formData.append("highlightY", highlightY);
    formData.append("highlightWidth", highlightWidth);
    formData.append("highlightHeight", highlightHeight);
    formData.append("highlightColor", highlightColor);
    await submit(formData, "edited.pdf");
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FileDropzone
        id="edit-file"
        label="PDF file"
        accept="application/pdf,.pdf"
        files={files}
        onFilesChange={setFiles}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-200">Page</label>
          <input
            value={page}
            onChange={(event) => setPage(event.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-[#0a111c] px-3 py-2 text-sm text-zinc-100"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-200">Text size</label>
          <input
            value={textSize}
            onChange={(event) => setTextSize(event.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-[#0a111c] px-3 py-2 text-sm text-zinc-100"
          />
        </div>
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-200">Text</label>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-[#0a111c] px-3 py-2 text-sm text-zinc-100"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-200">Text X %</label>
          <input
            value={textX}
            onChange={(event) => setTextX(event.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-[#0a111c] px-3 py-2 text-sm text-zinc-100"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-200">Text Y %</label>
          <input
            value={textY}
            onChange={(event) => setTextY(event.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-[#0a111c] px-3 py-2 text-sm text-zinc-100"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-200">Highlight X %</label>
          <input
            value={highlightX}
            onChange={(event) => setHighlightX(event.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-[#0a111c] px-3 py-2 text-sm text-zinc-100"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-200">Highlight Y %</label>
          <input
            value={highlightY}
            onChange={(event) => setHighlightY(event.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-[#0a111c] px-3 py-2 text-sm text-zinc-100"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-200">
            Highlight width %
          </label>
          <input
            value={highlightWidth}
            onChange={(event) => setHighlightWidth(event.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-[#0a111c] px-3 py-2 text-sm text-zinc-100"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-200">
            Highlight height %
          </label>
          <input
            value={highlightHeight}
            onChange={(event) => setHighlightHeight(event.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-[#0a111c] px-3 py-2 text-sm text-zinc-100"
          />
        </div>
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-200">Highlight color</label>
        <select
          value={highlightColor}
          onChange={(event) => setHighlightColor(event.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-[#0a111c] px-3 py-2 text-sm text-zinc-100"
        >
          <option value="yellow">yellow</option>
          <option value="green">green</option>
          <option value="blue">blue</option>
        </select>
      </div>
      <Status isProcessing={isProcessing} error={error} success={success} />
      <button
        type="submit"
        disabled={isProcessing}
        className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-orange-400 disabled:bg-zinc-600"
      >
        Edit PDF
      </button>
    </form>
  );
}

function ImageToPdfForm({ tool, limits }: { tool: PdfTool; limits: Limits }) {
  const [files, setFiles] = useState<File[]>([]);
  const [orientation, setOrientation] = useState("portrait");
  const [margin, setMargin] = useState("24");
  const { submit, isProcessing, error, success, setError } = useToolRequest(tool);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validateFiles(files, limits, {
      extensions: [".jpg", ".jpeg", ".png"],
    });
    if (validationError) {
      setError(validationError);
      return;
    }
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("orientation", orientation);
    formData.append("margin", margin);
    await submit(formData, "images.pdf");
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FileDropzone
        id="images"
        label="Image files (JPG/PNG)"
        accept="image/png,image/jpeg,.png,.jpg,.jpeg"
        multiple
        files={files}
        onFilesChange={setFiles}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-200">Orientation</label>
          <select
            value={orientation}
            onChange={(event) => setOrientation(event.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-[#0a111c] px-3 py-2 text-sm text-zinc-100"
          >
            <option value="portrait">portrait</option>
            <option value="landscape">landscape</option>
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-200">Margin (pt)</label>
          <input
            value={margin}
            onChange={(event) => setMargin(event.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-[#0a111c] px-3 py-2 text-sm text-zinc-100"
          />
        </div>
      </div>
      <Status isProcessing={isProcessing} error={error} success={success} />
      <button
        type="submit"
        disabled={isProcessing}
        className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-orange-400 disabled:bg-zinc-600"
      >
        Create PDF
      </button>
    </form>
  );
}

function PdfToJpgForm({ tool, limits }: { tool: PdfTool; limits: Limits }) {
  const [files, setFiles] = useState<File[]>([]);
  const [dpi, setDpi] = useState("150");
  const { submit, isProcessing, error, success, setError } = useToolRequest(tool);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validateFiles(files, limits, {
      max: 1,
      extensions: [".pdf"],
    });
    if (validationError) {
      setError(validationError);
      return;
    }
    const formData = new FormData();
    formData.append("file", files[0]);
    formData.append("dpi", dpi);
    await submit(formData, "pages.zip");
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FileDropzone
        id="pdf-to-jpg-file"
        label="PDF file"
        accept="application/pdf,.pdf"
        files={files}
        onFilesChange={setFiles}
      />
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-200">DPI</label>
        <select
          value={dpi}
          onChange={(event) => setDpi(event.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-[#0a111c] px-3 py-2 text-sm text-zinc-100"
        >
          <option value="150">150</option>
          <option value="300">300</option>
        </select>
      </div>
      <Status isProcessing={isProcessing} error={error} success={success} />
      <button
        type="submit"
        disabled={isProcessing}
        className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-orange-400 disabled:bg-zinc-600"
      >
        Convert to JPG
      </button>
    </form>
  );
}

function HtmlToPdfForm({ tool }: { tool: PdfTool }) {
  const [mode, setMode] = useState("url");
  const [url, setUrl] = useState("");
  const [html, setHtml] = useState("<h1>Hello PDF</h1><p>Generated from HTML.</p>");
  const { submit, isProcessing, error, success, setError } = useToolRequest(tool);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (mode === "url" && !url.trim()) {
      setError("URL is required.");
      return;
    }
    if (mode === "html" && !html.trim()) {
      setError("HTML content is required.");
      return;
    }

    const formData = new FormData();
    formData.append("mode", mode);
    formData.append("url", url);
    formData.append("html", html);
    await submit(formData, "html.pdf");
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-200">Mode</label>
        <select
          value={mode}
          onChange={(event) => setMode(event.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-[#0a111c] px-3 py-2 text-sm text-zinc-100"
        >
          <option value="url">URL</option>
          <option value="html">Raw HTML</option>
        </select>
      </div>
      {mode === "url" ? (
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-200">URL</label>
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com"
            className="w-full rounded-lg border border-zinc-700 bg-[#0a111c] px-3 py-2 text-sm text-zinc-100"
          />
        </div>
      ) : (
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-200">HTML</label>
          <textarea
            value={html}
            onChange={(event) => setHtml(event.target.value)}
            rows={8}
            className="w-full rounded-lg border border-zinc-700 bg-[#0a111c] px-3 py-2 text-sm text-zinc-100"
          />
        </div>
      )}
      <Status isProcessing={isProcessing} error={error} success={success} />
      <button
        type="submit"
        disabled={isProcessing}
        className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-orange-400 disabled:bg-zinc-600"
      >
        Convert HTML to PDF
      </button>
    </form>
  );
}

function CompressForm({ tool, limits }: { tool: PdfTool; limits: Limits }) {
  const [files, setFiles] = useState<File[]>([]);
  const [quality, setQuality] = useState("ebook");
  const { submit, isProcessing, error, success, setError } = useToolRequest(tool);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validateFiles(files, limits, {
      max: 1,
      extensions: [".pdf"],
    });
    if (validationError) {
      setError(validationError);
      return;
    }
    const formData = new FormData();
    formData.append("file", files[0]);
    formData.append("quality", quality);
    await submit(formData, "compressed.pdf");
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FileDropzone
        id="compress-file"
        label="PDF file"
        accept="application/pdf,.pdf"
        files={files}
        onFilesChange={setFiles}
      />
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-200">Quality</label>
        <select
          value={quality}
          onChange={(event) => setQuality(event.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-[#0a111c] px-3 py-2 text-sm text-zinc-100"
        >
          <option value="screen">screen</option>
          <option value="ebook">ebook</option>
          <option value="printer">printer</option>
        </select>
      </div>
      <Status isProcessing={isProcessing} error={error} success={success} />
      <button
        type="submit"
        disabled={isProcessing}
        className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-orange-400 disabled:bg-zinc-600"
      >
        Compress PDF
      </button>
    </form>
  );
}

function OfficeToPdfForm({
  tool,
  limits,
  extensions,
}: {
  tool: PdfTool;
  limits: Limits;
  extensions: string[];
}) {
  const [files, setFiles] = useState<File[]>([]);
  const { submit, isProcessing, error, success, setError } = useToolRequest(tool);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validateFiles(files, limits, {
      max: 1,
      extensions,
    });
    if (validationError) {
      setError(validationError);
      return;
    }
    const formData = new FormData();
    formData.append("file", files[0]);
    await submit(formData, `${tool.slug}.pdf`);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FileDropzone
        id={`${tool.slug}-file`}
        label={`Upload ${extensions.join(", ")}`}
        accept={extensions.join(",")}
        files={files}
        onFilesChange={setFiles}
      />
      <Status isProcessing={isProcessing} error={error} success={success} />
      <button
        type="submit"
        disabled={isProcessing}
        className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-orange-400 disabled:bg-zinc-600"
      >
        Convert to PDF
      </button>
    </form>
  );
}

function PdfToOfficeForm({ tool, limits }: { tool: PdfTool; limits: Limits }) {
  const [files, setFiles] = useState<File[]>([]);
  const [includeOcr, setIncludeOcr] = useState(true);
  const { submit, isProcessing, error, success, setError } = useToolRequest(tool);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validateFiles(files, limits, {
      max: 1,
      extensions: [".pdf"],
    });
    if (validationError) {
      setError(validationError);
      return;
    }
    const formData = new FormData();
    formData.append("file", files[0]);
    formData.append("includeOcr", includeOcr ? "1" : "0");
    await submit(formData, `${tool.slug}.${tool.outputExtension}`);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FileDropzone
        id={`${tool.slug}-file`}
        label="PDF file"
        accept="application/pdf,.pdf"
        files={files}
        onFilesChange={setFiles}
      />
      <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
        <input
          type="checkbox"
          checked={includeOcr}
          onChange={(event) => setIncludeOcr(event.target.checked)}
          className="h-4 w-4"
        />
        Include OCR text when available
      </label>
      <Status isProcessing={isProcessing} error={error} success={success} />
      <button
        type="submit"
        disabled={isProcessing}
        className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-orange-400 disabled:bg-zinc-600"
      >
        Convert
      </button>
    </form>
  );
}

function PasswordPdfForm({ tool, limits }: { tool: PdfTool; limits: Limits }) {
  const [files, setFiles] = useState<File[]>([]);
  const [password, setPassword] = useState("");
  const { submit, isProcessing, error, success, setError } = useToolRequest(tool);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validateFiles(files, limits, {
      max: 1,
      extensions: [".pdf"],
    });
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }
    const formData = new FormData();
    formData.append("file", files[0]);
    formData.append("password", password);
    const output = tool.slug === "unlock-pdf" ? "unlocked.pdf" : "protected.pdf";
    await submit(formData, output);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FileDropzone
        id={`${tool.slug}-file`}
        label="PDF file"
        accept="application/pdf,.pdf"
        files={files}
        onFilesChange={setFiles}
      />
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-200">Password</label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-[#0a111c] px-3 py-2 text-sm text-zinc-100"
        />
      </div>
      <Status isProcessing={isProcessing} error={error} success={success} />
      <button
        type="submit"
        disabled={isProcessing}
        className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-orange-400 disabled:bg-zinc-600"
      >
        {tool.slug === "unlock-pdf" ? "Unlock PDF" : "Protect PDF"}
      </button>
    </form>
  );
}

function renderToolForm(tool: PdfTool, limits: Limits) {
  const slug = tool.slug;
  if (slug === "merge-pdf") {
    return <MergeForm tool={tool} limits={limits} />;
  }
  if (slug === "split-pdf") {
    return <SplitForm tool={tool} limits={limits} />;
  }
  if (slug === "rotate-pdf") {
    return <RotateForm tool={tool} limits={limits} />;
  }
  if (slug === "watermark") {
    return <WatermarkForm tool={tool} limits={limits} />;
  }
  if (slug === "sign-pdf") {
    return <SignForm tool={tool} limits={limits} />;
  }
  if (slug === "edit-pdf") {
    return <EditForm tool={tool} limits={limits} />;
  }
  if (slug === "jpg-to-pdf") {
    return <ImageToPdfForm tool={tool} limits={limits} />;
  }
  if (slug === "pdf-to-jpg") {
    return <PdfToJpgForm tool={tool} limits={limits} />;
  }
  if (slug === "html-to-pdf") {
    return <HtmlToPdfForm tool={tool} />;
  }
  if (slug === "compress-pdf") {
    return <CompressForm tool={tool} limits={limits} />;
  }
  if (slug === "word-to-pdf") {
    return <OfficeToPdfForm tool={tool} limits={limits} extensions={[".doc", ".docx"]} />;
  }
  if (slug === "powerpoint-to-pdf") {
    return <OfficeToPdfForm tool={tool} limits={limits} extensions={[".ppt", ".pptx"]} />;
  }
  if (slug === "excel-to-pdf") {
    return <OfficeToPdfForm tool={tool} limits={limits} extensions={[".xls", ".xlsx"]} />;
  }
  if (slug === "pdf-to-word" || slug === "pdf-to-powerpoint" || slug === "pdf-to-excel") {
    return <PdfToOfficeForm tool={tool} limits={limits} />;
  }
  if (slug === "protect-pdf" || slug === "unlock-pdf") {
    return <PasswordPdfForm tool={tool} limits={limits} />;
  }
  return (
    <p className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
      Tool form is not implemented for {slug}.
    </p>
  );
}

function ToolFaq({ tool }: { tool: PdfTool }) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-[#0b121d] p-6">
      <h2 className="text-lg font-semibold text-white">FAQ</h2>
      <div className="mt-4 space-y-3">
        {tool.faq.map((item) => (
          <div key={item.q} className="rounded-lg border border-zinc-800 bg-[#0a111c] p-3">
            <p className="text-sm font-medium text-zinc-100">{item.q}</p>
            <p className="mt-1 text-sm text-zinc-300">{item.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ToolRunner({ tool }: { tool: PdfTool }) {
  const limits = useLimits();
  const form = renderToolForm(tool, limits);

  return (
    <div className="space-y-6">
      <ToolFormShell tool={tool} limits={limits}>
        {form}
      </ToolFormShell>
      <ToolFaq tool={tool} />
    </div>
  );
}

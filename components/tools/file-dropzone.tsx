"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";

type FileDropzoneProps = {
  id: string;
  label: string;
  accept: string;
  multiple?: boolean;
  files: File[];
  onFilesChange: (files: File[]) => void;
  helperText?: string;
};

function formatMb(size: number): string {
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

export function FileDropzone({
  id,
  label,
  accept,
  multiple = false,
  files,
  onFilesChange,
  helperText,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const applyFileList = (incoming: FileList | null) => {
    const nextFiles = incoming ? Array.from(incoming) : [];
    onFilesChange(nextFiles);
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    applyFileList(event.target.files);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    applyFileList(event.dataTransfer.files);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
  };

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-zinc-200">
        {label}
      </label>
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border border-dashed p-4 transition ${
          dragActive
            ? "border-orange-400 bg-orange-500/10"
            : "border-zinc-700 bg-[#0a111c] hover:border-zinc-500"
        }`}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          className="hidden"
          multiple={multiple}
          accept={accept}
          onChange={onInputChange}
        />
        <p className="text-sm text-zinc-300">
          Drag and drop file{multiple ? "s" : ""} here, or click to browse.
        </p>
        {helperText ? <p className="mt-1 text-xs text-zinc-400">{helperText}</p> : null}
      </div>

      {files.length > 0 ? (
        <ul className="rounded-lg border border-zinc-800 bg-[#0a111c] p-3 text-sm text-zinc-300">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`} className="truncate py-0.5">
              {index + 1}. {file.name} ({formatMb(file.size)})
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

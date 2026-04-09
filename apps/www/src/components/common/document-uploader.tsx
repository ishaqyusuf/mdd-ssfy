"use client";

import { Icons } from "@gnd/ui/icons";

import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { Label } from "@gnd/ui/label";
import { Textarea } from "@gnd/ui/textarea";
import { useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

type UploadableDocument = {
  filename: string;
  contentType?: string | null;
  contentBase64: string;
  size?: number | null;
};

type UploadedDocument = {
  id: string;
  title: string;
  description?: string | null;
  filename?: string | null;
  url?: string | null;
  pathname: string;
  mimeType?: string | null;
  extension?: string | null;
  size?: number | null;
  createdAt?: string | Date | null;
  uploadedByName?: string | null;
};

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Unable to read file"));
        return;
      }
      const [, base64 = ""] = result.split(",");
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error || new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}

export type DocumentUploaderProps = {
  title?: string;
  description?: string;
  accept?: Record<string, string[]>;
  maxFiles?: number;
  multiple?: boolean;
  noteLabel?: string;
  notePlaceholder?: string;
  showNote?: boolean;
  submitLabel?: string;
  uploadLabel?: string;
  disabled?: boolean;
  onUpload: (input: {
    files: UploadableDocument[];
    note?: string | null;
  }) => Promise<{ documents: UploadedDocument[] }>;
  onUploaded?: (documents: UploadedDocument[]) => void;
};

export function DocumentUploader({
  title = "Upload documents",
  description = "Drag files here or browse from your device.",
  accept = {
    "application/pdf": [".pdf"],
    "image/*": [".jpg", ".jpeg", ".png", ".webp", ".heic"],
  },
  maxFiles = 10,
  multiple = true,
  noteLabel = "Note",
  notePlaceholder = "Add context for this upload",
  showNote = true,
  submitLabel = "Upload documents",
  uploadLabel = "Browse files",
  disabled,
  onUpload,
  onUploaded,
}: DocumentUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [note, setNote] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const acceptSummary = useMemo(() => {
    return Object.values(accept)
      .flat()
      .filter(Boolean)
      .join(", ");
  }, [accept]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop(acceptedFiles) {
      if (!acceptedFiles.length) return;
      setFiles((current) => {
        const next = multiple ? [...current, ...acceptedFiles] : acceptedFiles.slice(0, 1);
        return next.slice(0, maxFiles);
      });
    },
    onDropRejected(rejections) {
      const hasInvalidType = rejections.some(({ errors }) =>
        errors.some(({ code }) => code === "file-invalid-type"),
      );
      const hasTooManyFiles = rejections.some(({ errors }) =>
        errors.some(({ code }) => code === "too-many-files"),
      );
      const hasTooLarge = rejections.some(({ errors }) =>
        errors.some(({ code }) => code === "file-too-large"),
      );

      if (hasInvalidType) toast.error("One or more files use an unsupported type.");
      if (hasTooManyFiles) toast.error(`You can upload up to ${maxFiles} files at once.`);
      if (hasTooLarge) toast.error("One or more files exceed the upload limit.");
    },
    accept,
    multiple,
    maxFiles,
    maxSize: 15 * 1024 * 1024,
    noClick: true,
    disabled: disabled || isUploading,
  });

  async function handleUpload() {
    if (!files.length) {
      toast.error("Select at least one document to upload.");
      return;
    }

    setIsUploading(true);
    try {
      const payload = await Promise.all(
        files.map(async (file) => ({
          filename: file.name,
          contentType: file.type || null,
          contentBase64: await fileToBase64(file),
          size: file.size,
        })),
      );

      const result = await onUpload({
        files: payload,
        note: showNote ? note.trim() || null : null,
      });

      setFiles([]);
      setNote("");
      onUploaded?.(result.documents);
      toast.success(
        `${result.documents.length} document${result.documents.length === 1 ? "" : "s"} uploaded.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to upload documents.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">{description}</p>
      </div>

      <div
        {...getRootProps()}
        className={cn(
          "rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-5 transition-colors",
          isDragActive && "border-emerald-400 bg-emerald-50",
          (disabled || isUploading) && "opacity-70",
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-10 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
              <Icons.UploadCloud className="size-5" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-900">
                {isDragActive ? "Drop files to add them" : "Drop documents here"}
              </p>
              <p className="text-xs text-slate-500">
                Accepted: {acceptSummary || "Configured types"}.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={open}
            disabled={disabled || isUploading}
          >
            {uploadLabel}
          </Button>
        </div>
      </div>

      {files.length ? (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2"
            >
              <div className="min-w-0 flex items-center gap-2">
                <Icons.FileText className="size-4 shrink-0 text-slate-500" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 rounded-full"
                onClick={() =>
                  setFiles((current) => current.filter((_, currentIndex) => currentIndex !== index))
                }
                disabled={isUploading}
              >
                <Icons.X className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {showNote ? (
        <div className="space-y-2">
          <Label>{noteLabel}</Label>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={notePlaceholder}
            className="min-h-24 resize-none"
            disabled={disabled || isUploading}
          />
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={handleUpload}
          disabled={disabled || isUploading || files.length === 0}
        >
          {isUploading ? "Uploading..." : submitLabel}
        </Button>
      </div>
    </div>
  );
}

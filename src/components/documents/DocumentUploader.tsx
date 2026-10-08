// src/components/documents/DocumentUploader.tsx: Drag-and-drop uploader for health documents.
"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud, Loader2, FileImage } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDocumentUpload } from "@/hooks/useDocumentUpload";

export function DocumentUploader({ onUploaded }: { onUploaded?: (docId: string) => void }) {
  const { upload, busy, error } = useDocumentUpload();
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File | undefined | null) => {
      if (!file) return;
      const docId = await upload(file);
      if (docId) onUploaded?.(docId);
    },
    [upload, onUploaded]
  );

  const useSample = useCallback(async () => {
    const res = await fetch("/samples/sample-lab-report.png");
    const blob = await res.blob();
    await handleFile(new File([blob], "sample-lab-report.png", { type: "image/png" }));
  }, [handleFile]);

  return (
    <div>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition-colors",
          dragOver ? "border-coral bg-coral-light/40" : "border-border-strong bg-porcelain-2/40 hover:border-coral/40"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {busy ? (
          <Loader2 className="size-8 animate-spin text-coral" />
        ) : (
          <UploadCloud className="size-8 text-ink-soft" />
        )}
        <div>
          <p className="text-sm font-medium text-ink">
            {busy ? "Reading your document…" : "Drop a lab report or prescription here"}
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            {busy
              ? "This can take a few seconds."
              : "or click to browse — PDF, JPG, PNG, or HEIC. Photos are resized automatically; PDFs should be a single page."}
          </p>
        </div>
      </label>

      <button
        type="button"
        onClick={useSample}
        disabled={busy}
        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border-strong px-3 py-2 text-xs font-medium text-ink-2 transition-colors hover:bg-porcelain-2 disabled:opacity-50"
      >
        <FileImage className="size-3.5" /> No report handy? Try a sample (fictional) lab report
      </button>

      {error && <p className="mt-3 text-sm text-alert">{error}</p>}

      <p className="mt-3 text-xs text-ink-soft">
        Vitalis reads the document automatically, but always show you the results to confirm before
        saving anything to your health record.
      </p>
    </div>
  );
}

"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { createHealthDocument, updateHealthDocument } from "@/lib/firebase/repo";
import { extractDocument } from "@/lib/aiClient";
import { prepareFileForUpload, FileTooLargeError } from "@/lib/fileUpload";

const ACCEPTED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export function useDocumentUpload() {
  const { user, getIdToken } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File): Promise<string | null> => {
      if (!user) return null;
      setError(null);

      if (!ACCEPTED_MIME.includes(file.type)) {
        setError("Please upload a PDF, JPG, PNG, or HEIC file.");
        return null;
      }

      setBusy(true);
      let docId: string | null = null;
      try {
        const prepared = await prepareFileForUpload(file);

        docId = await createHealthDocument(user.uid, {
          fileName: file.name,
          fileBase64: prepared.base64,
          mimeType: prepared.mimeType,
          sizeBytes: prepared.sizeBytes,
        });

        const token = await getIdToken();
        if (!token) throw new Error("Not signed in.");

        const extraction = await extractDocument(token, {
          fileBase64: prepared.base64,
          mimeType: prepared.mimeType,
        });

        await updateHealthDocument(user.uid, docId, {
          status: "pending_review",
          extraction,
        });

        return docId;
      } catch (err) {
        const message =
          err instanceof FileTooLargeError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Couldn't process that document.";
        setError(message);
        if (docId) {
          await updateHealthDocument(user.uid, docId, { status: "failed", error: message }).catch(() => {});
        }
        return docId;
      } finally {
        setBusy(false);
      }
    },
    [user, getIdToken]
  );

  return { upload, busy, error };
}

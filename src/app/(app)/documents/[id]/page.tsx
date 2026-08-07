"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  AlertTriangle,
  ExternalLink,
  Trash2,
  CheckCircle2,
  Loader2,
  FileWarning,
} from "lucide-react";
import { useHealthDocument } from "@/hooks/useHealthDocuments";
import { useAuth } from "@/lib/auth/AuthContext";
import { deleteHealthDocument, updateHealthDocument } from "@/lib/firebase/repo";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DocumentStatusBadge } from "@/components/documents/DocumentStatusBadge";
import { LabResultsReview } from "@/components/documents/LabResultsReview";
import { MedicationsExtractionReview } from "@/components/documents/MedicationsExtractionReview";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { formatDate, formatRelative } from "@/lib/utils";

const TYPE_LABEL: Record<string, string> = {
  lab_report: "Lab report",
  prescription: "Prescription",
  other: "Document",
};

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { document, loading } = useHealthDocument(params?.id ?? null);
  const [marking, setMarking] = useState(false);

  function handleViewOriginal() {
    if (!document) return;
    const dataUrl = `data:${document.mimeType};base64,${document.fileBase64}`;
    window.open(dataUrl, "_blank", "noopener,noreferrer");
  }

  async function handleMarkReviewed() {
    if (!user || !document) return;
    setMarking(true);
    try {
      await updateHealthDocument(user.uid, document.id, {
        status: "reviewed",
        reviewedAt: new Date().toISOString(),
      });
    } finally {
      setMarking(false);
    }
  }

  async function handleDelete() {
    if (!user || !document) return;
    await deleteHealthDocument(user.uid, document.id);
    router.push("/documents");
  }

  if (loading) return <FullPageSpinner label="Loading document…" />;

  if (!document) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <FileWarning className="size-8 text-ink-soft" />
        <p className="text-sm text-ink-soft">This document doesn&apos;t exist or was removed.</p>
        <Link href="/documents">
          <Button variant="outline" size="sm">
            <ArrowLeft className="size-4" /> Back to documents
          </Button>
        </Link>
      </div>
    );
  }

  const extraction = document.extraction;
  const hasLabValues = (extraction?.labValues.length ?? 0) > 0;
  const hasMedications = (extraction?.medications.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          href="/documents"
          className="mb-3 flex items-center gap-1.5 text-xs font-medium text-ink-soft hover:text-ink"
        >
          <ArrowLeft className="size-3.5" /> All documents
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-semibold text-ink">{document.fileName}</h1>
            <p className="mt-1 text-sm text-ink-soft">
              Uploaded {formatDate(document.uploadedAt)} · {formatRelative(document.uploadedAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DocumentStatusBadge status={document.status} />
            <Button variant="outline" size="sm" onClick={handleViewOriginal}>
              <ExternalLink className="size-3.5" /> View original
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDelete}>
              <Trash2 className="size-3.5" /> Delete
            </Button>
          </div>
        </div>
      </div>

      {document.status === "processing" && (
        <Card className="flex items-center gap-3 p-6">
          <Loader2 className="size-5 animate-spin text-coral" />
          <p className="text-sm text-ink-2">Still reading this document — this page will update automatically.</p>
        </Card>
      )}

      {document.status === "failed" && (
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-alert" />
            <div>
              <p className="text-sm font-medium text-ink">Couldn&apos;t read this document</p>
              <p className="mt-1 text-sm text-ink-soft">
                {document.error || "Something went wrong processing it. You can delete it and try uploading again."}
              </p>
            </div>
          </div>
        </Card>
      )}

      {extraction && (
        <>
          <Card className="p-6">
            <div className="mb-2 flex items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-coral">
                {TYPE_LABEL[extraction.documentType] ?? "Document"}
              </p>
            </div>
            <p className="text-sm leading-relaxed text-ink-2">{extraction.summary}</p>

            {extraction.lowConfidenceWarning && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-amber-light p-3.5">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-dark" />
                <p className="text-sm text-amber-dark">
                  Part of this document was hard to read clearly. Double-check the values below against the
                  original before saving.
                </p>
              </div>
            )}

            <p className="mt-4 text-xs italic text-ink-soft">{extraction.disclaimer}</p>
          </Card>

          {!hasLabValues && !hasMedications && (
            <Card className="p-6 text-sm text-ink-soft">
              No lab values or medications were found to extract from this document.
            </Card>
          )}

          {hasLabValues && (
            <LabResultsReview
              values={extraction.labValues}
              sourceDocumentId={document.id}
              onSaved={handleMarkReviewed}
            />
          )}

          {hasMedications && (
            <MedicationsExtractionReview medications={extraction.medications} sourceDocumentId={document.id} />
          )}

          {document.status === "pending_review" && (
            <Card>
              <CardHeader>
                <CardTitle>Done reviewing?</CardTitle>
              </CardHeader>
              <CardBody className="pt-0">
                <p className="mb-4 text-sm text-ink-soft">
                  Marking this reviewed just files it away — you can still come back and re-check it anytime.
                </p>
                <Button size="sm" variant="outline" onClick={handleMarkReviewed} loading={marking}>
                  <CheckCircle2 className="size-3.5" /> Mark as reviewed
                </Button>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

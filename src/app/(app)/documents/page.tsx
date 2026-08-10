"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Pill as PillIcon, FileQuestion, Trash2 } from "lucide-react";
import { useHealthDocuments } from "@/hooks/useHealthDocuments";
import { useLabResults } from "@/hooks/useLabResults";
import { useAuth } from "@/lib/auth/AuthContext";
import { deleteHealthDocument } from "@/lib/firebase/repo";
import { Card } from "@/components/ui/Card";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { DocumentUploader } from "@/components/documents/DocumentUploader";
import { DocumentStatusBadge } from "@/components/documents/DocumentStatusBadge";
import { LabResultTrendsChart } from "@/components/documents/LabResultTrendsChart";
import { formatDate, formatRelative } from "@/lib/utils";
import { toast } from "@/store/toastStore";
import type { DocumentType } from "@/types";

const TYPE_ICON: Record<DocumentType, typeof FileText> = {
  lab_report: FileText,
  prescription: PillIcon,
  other: FileQuestion,
};

const TYPE_LABEL: Record<DocumentType, string> = {
  lab_report: "Lab report",
  prescription: "Prescription",
  other: "Document",
};

export default function DocumentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { documents, loading } = useHealthDocuments();
  const { results: labResults } = useLabResults();

  async function handleDeleteDoc(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    try {
      await deleteHealthDocument(user.uid, id);
      toast.success("Document deleted.");
    } catch {
      toast.error("Failed to delete document.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Documents</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Upload a lab report or prescription and Vitalis will read it for you — you confirm before
          anything is saved.
        </p>
      </div>

      <DocumentUploader onUploaded={(docId) => router.push(`/documents/${docId}`)} />

      <LabResultTrendsChart labResults={labResults} />

      {loading && (
        <div className="grid gap-3 sm:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!loading && documents.length === 0 && (
        <EmptyState
          icon={FileText}
          title="No documents uploaded yet"
          description="Drag and drop or select a PDF/image of a lab report or prescription."
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {documents.map((d) => {
          const type = d.extraction?.documentType ?? "other";
          const Icon = TYPE_ICON[type];
          return (
            <Link key={d.id} href={`/documents/${d.id}`}>
              <Card className="flex items-start justify-between gap-3 p-4 transition-shadow hover:shadow-[var(--shadow-card)]">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-porcelain-2 text-ink-soft">
                    <Icon className="size-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{d.fileName}</p>
                    <p className="mt-0.5 text-xs text-ink-soft truncate">
                      {d.extraction ? TYPE_LABEL[type] : "Processing"} · {formatDate(d.uploadedAt)} ·{" "}
                      {formatRelative(d.uploadedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <DocumentStatusBadge status={d.status} />
                  <button
                    onClick={(e) => handleDeleteDoc(d.id, e)}
                    className="rounded-lg p-1.5 text-ink-soft hover:bg-alert-light hover:text-alert transition-colors"
                    aria-label="Delete document"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

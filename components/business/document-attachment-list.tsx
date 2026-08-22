"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FileText, Loader2, Trash2 } from "lucide-react";

import { deleteBusinessDocumentAction } from "@/app/app/(workspace)/settings/documents/actions";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/components/ui/attachment";
import { notifyError, notifySuccess } from "@/lib/feedback/toast";
import type { DocumentRecord } from "@/modules/documents/domain/types";

function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentAttachmentList({
  documents,
  canDelete,
  emptyMessage = "No documents yet. Upload a receipt, invoice scan, or other supporting file to keep it with this business.",
  onDelete = deleteBusinessDocumentAction,
}: {
  documents: DocumentRecord[];
  canDelete: boolean;
  emptyMessage?: string;
  onDelete?: (documentId: string) => Promise<{ error?: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<Record<string, string>>({});

  if (documents.length === 0) {
    return (
      <p className="text-base text-muted-foreground">{emptyMessage}</p>
    );
  }

  const handleDelete = (documentId: string, filename: string) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"?`)) {
      return;
    }

    startTransition(async () => {
      setPendingDeleteId(documentId);
      const result = await onDelete(documentId);
      setPendingDeleteId(null);
      if (result.error) {
        setDeleteError((prev) => ({ ...prev, [documentId]: result.error! }));
        notifyError("Could not delete document", result.error);
      } else {
        setDeleteError((prev) => {
          const rest = { ...prev };
          delete rest[documentId];
          return rest;
        });
        notifySuccess("Document deleted", `"${filename}" was removed.`);
        router.refresh();
      }
    });
  };

  return (
    <AttachmentGroup className="flex-col overflow-visible">
      {documents.map((document) => (
        <div key={document.id}>
          <Attachment state="done" className="w-full max-w-xl">
            <AttachmentMedia>
              <FileText />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>{document.filename}</AttachmentTitle>
              <AttachmentDescription>
                {document.contentType} · {formatSize(document.sizeBytes)}
              </AttachmentDescription>
            </AttachmentContent>
            <AttachmentTrigger
              render={
                <a
                  href={`/api/documents/${document.id}`}
                  download={document.filename}
                  aria-label={`Download ${document.filename}`}
                />
              }
            />
            {canDelete ? (
              <AttachmentActions>
                <AttachmentAction
                  variant="ghost"
                  aria-label={`Remove ${document.filename}`}
                  disabled={isPending}
                  onClick={() => handleDelete(document.id, document.filename)}
                >
                  {pendingDeleteId === document.id ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 />
                  )}
                </AttachmentAction>
              </AttachmentActions>
            ) : null}
          </Attachment>
          {deleteError[document.id] && (
            <div role="alert" className="mt-2 text-base text-destructive">
              {deleteError[document.id]}
            </div>
          )}
        </div>
      ))}
    </AttachmentGroup>
  );
}

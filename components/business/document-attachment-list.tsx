"use client";

import { FileText, Trash2 } from "lucide-react";

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
}: {
  documents: DocumentRecord[];
  canDelete: boolean;
}) {
  if (documents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No documents yet. Upload a receipt, invoice scan, or other supporting
        file to keep it with this business.
      </p>
    );
  }

  return (
    <AttachmentGroup className="flex-col overflow-visible">
      {documents.map((document) => (
        <Attachment key={document.id} state="done" className="w-full max-w-xl">
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
              <a href={`/api/documents/${document.id}`} download={document.filename} />
            }
          />
          {canDelete ? (
            <AttachmentActions>
              <AttachmentAction
                variant="ghost"
                aria-label={`Remove ${document.filename}`}
                onClick={() => {
                  void deleteBusinessDocumentAction(document.id);
                }}
              >
                <Trash2 />
              </AttachmentAction>
            </AttachmentActions>
          ) : null}
        </Attachment>
      ))}
    </AttachmentGroup>
  );
}

import Link from "next/link";

import { DocumentAttachmentList } from "@/components/business/document-attachment-list";
import { UploadDocumentForm } from "@/components/business/upload-document-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shell/page-header";
import { authorize } from "@/lib/security";
import { roleHasPermission } from "@/lib/security/permissions";
import { listDocumentsForOwner } from "@/modules/documents";
import { prismaDocumentRepository } from "@/modules/documents/infrastructure/prisma-document-repository";

export default async function BusinessDocumentsPage() {
  const tenant = await authorize("document:read");
  const canUpload = roleHasPermission(tenant.membership.role, "document:upload");
  const canDelete = roleHasPermission(tenant.membership.role, "document:delete");
  const documents = await listDocumentsForOwner({
    tenantId: tenant.tenantId,
    ownerRecordType: "BUSINESS",
    ownerRecordId: tenant.tenantId,
    documents: prismaDocumentRepository,
  });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6">
      <PageHeader
        title="Documents"
        description="Upload supporting files for this business. Later invoices, expenses, and receipts can attach files the same way."
        actions={
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/app/settings" />}
          >
            Back to settings
          </Button>
        }
      />

      {canUpload ? (
        <Card>
          <CardHeader>
            <CardTitle>Upload</CardTitle>
          </CardHeader>
          <CardContent>
            <UploadDocumentForm />
          </CardContent>
        </Card>
      ) : (
        <p className="text-base text-muted-foreground">
          You can view and download documents, but you cannot upload new files.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Attached files</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentAttachmentList documents={documents} canDelete={canDelete} />
        </CardContent>
      </Card>
    </div>
  );
}

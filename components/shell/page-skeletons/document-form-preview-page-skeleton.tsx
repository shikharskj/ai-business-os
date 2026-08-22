import { Skeleton } from "@/components/ui/skeleton";

import {
  DocumentFormPreviewAside,
  DocumentFormPreviewLayout,
  DocumentFormPreviewMain,
  DocumentPreviewPageShell,
} from "@/components/shell/document-form-preview-layout";
import {
  FormFieldsSkeleton,
  PageHeaderSkeleton,
} from "./shared";

export function DocumentFormPreviewPageSkeleton({
  fieldCount = 10,
  showBackAction = true,
}: {
  fieldCount?: number;
  showBackAction?: boolean;
}) {
  return (
    <DocumentPreviewPageShell>
      <PageHeaderSkeleton showActions={showBackAction} showDescription />
      <DocumentFormPreviewLayout>
        <DocumentFormPreviewMain>
          <div className="flex flex-col gap-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-10 w-full motion-reduce:animate-none" />
              <Skeleton className="h-10 w-full motion-reduce:animate-none" />
              <Skeleton className="h-10 w-full motion-reduce:animate-none" />
              <Skeleton className="h-10 w-full motion-reduce:animate-none" />
            </div>
            <FormFieldsSkeleton count={fieldCount} />
            <Skeleton className="h-10 w-36 motion-reduce:animate-none" />
          </div>
        </DocumentFormPreviewMain>
        <DocumentFormPreviewAside>
          <Skeleton className="mb-2 h-4 w-16 motion-reduce:animate-none" />
          <Skeleton className="aspect-[210/297] w-full rounded-xl motion-reduce:animate-none" />
        </DocumentFormPreviewAside>
      </DocumentFormPreviewLayout>
    </DocumentPreviewPageShell>
  );
}

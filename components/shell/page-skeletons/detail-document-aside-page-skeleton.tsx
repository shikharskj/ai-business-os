import { Skeleton } from "@/components/ui/skeleton";

import {
  CardBlockSkeleton,
  PageHeaderSkeleton,
  PageShellSkeleton,
  TableRowsSkeleton,
} from "./shared";

export function DetailDocumentAsidePageSkeleton() {
  return (
    <PageShellSkeleton maxWidth="w-full">
      <PageHeaderSkeleton showActions showDescription />
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <CardBlockSkeleton lines={3} />
          <TableRowsSkeleton rows={5} columns={5} />
          <TableRowsSkeleton rows={3} columns={3} />
        </div>
        <div className="w-full shrink-0 lg:w-80">
          <Skeleton className="h-[28rem] w-full rounded-md motion-reduce:animate-none" />
        </div>
      </div>
    </PageShellSkeleton>
  );
}

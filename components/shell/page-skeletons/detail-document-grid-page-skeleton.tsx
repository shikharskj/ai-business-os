import { Skeleton } from "@/components/ui/skeleton";

import {
  CardBlockSkeleton,
  PageHeaderSkeleton,
  PageShellSkeleton,
  TableRowsSkeleton,
} from "./shared";

export function DetailDocumentGridPageSkeleton() {
  return (
    <PageShellSkeleton maxWidth="max-w-5xl">
      <PageHeaderSkeleton showActions showDescription />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-4">
          <CardBlockSkeleton lines={3} />
          <TableRowsSkeleton rows={5} columns={5} />
        </div>
        <Skeleton className="h-80 w-full rounded-md motion-reduce:animate-none" />
      </div>
    </PageShellSkeleton>
  );
}

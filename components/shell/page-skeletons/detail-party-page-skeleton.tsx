import {
  CardBlockSkeleton,
  PageHeaderSkeleton,
  PageShellSkeleton,
  TableRowsSkeleton,
} from "./shared";

export function DetailPartyPageSkeleton() {
  return (
    <PageShellSkeleton maxWidth="max-w-4xl">
      <PageHeaderSkeleton showActions showDescription />
      <CardBlockSkeleton lines={2} />
      <CardBlockSkeleton lines={4} />
      <TableRowsSkeleton rows={4} columns={4} />
      <TableRowsSkeleton rows={4} columns={4} />
    </PageShellSkeleton>
  );
}

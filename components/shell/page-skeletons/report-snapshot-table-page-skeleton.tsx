import {
  PageHeaderSkeleton,
  PageShellSkeleton,
  StatCardsSkeleton,
  TableRowsSkeleton,
} from "./shared";

export function ReportSnapshotTablePageSkeleton() {
  return (
    <PageShellSkeleton maxWidth="max-w-5xl">
      <PageHeaderSkeleton showDescription />
      <StatCardsSkeleton count={1} />
      <TableRowsSkeleton rows={8} columns={4} />
    </PageShellSkeleton>
  );
}

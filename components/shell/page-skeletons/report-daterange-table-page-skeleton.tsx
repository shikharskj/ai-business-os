import {
  FilterRowSkeleton,
  PageHeaderSkeleton,
  PageShellSkeleton,
  StatCardsSkeleton,
  TableRowsSkeleton,
} from "./shared";

export function ReportDaterangeTablePageSkeleton() {
  return (
    <PageShellSkeleton maxWidth="max-w-5xl">
      <PageHeaderSkeleton showDescription />
      <FilterRowSkeleton fields={2} />
      <StatCardsSkeleton count={3} />
      <TableRowsSkeleton rows={8} columns={5} />
    </PageShellSkeleton>
  );
}

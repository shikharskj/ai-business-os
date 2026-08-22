import {
  FilterRowSkeleton,
  PageHeaderSkeleton,
  PageShellSkeleton,
  StatCardsSkeleton,
  TableRowsSkeleton,
} from "./shared";

export function ReportPeriodTablePageSkeleton() {
  return (
    <PageShellSkeleton maxWidth="max-w-5xl">
      <PageHeaderSkeleton showDescription />
      <FilterRowSkeleton fields={1} />
      <StatCardsSkeleton count={2} />
      <TableRowsSkeleton rows={10} columns={4} />
    </PageShellSkeleton>
  );
}

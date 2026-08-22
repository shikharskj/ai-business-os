import {
  FilterRowSkeleton,
  PageHeaderSkeleton,
  PageShellSkeleton,
  StatCardsSkeleton,
} from "./shared";

export function ReportDaterangeSummaryPageSkeleton() {
  return (
    <PageShellSkeleton maxWidth="max-w-5xl">
      <PageHeaderSkeleton showDescription />
      <FilterRowSkeleton fields={2} />
      <StatCardsSkeleton count={3} />
    </PageShellSkeleton>
  );
}

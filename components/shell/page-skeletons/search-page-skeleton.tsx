import {
  FilterRowSkeleton,
  PageHeaderSkeleton,
  PageShellSkeleton,
  TableRowsSkeleton,
} from "./shared";

export function SearchPageSkeleton() {
  return (
    <PageShellSkeleton maxWidth="max-w-3xl">
      <PageHeaderSkeleton showDescription />
      <FilterRowSkeleton fields={2} />
      <TableRowsSkeleton rows={6} columns={3} />
    </PageShellSkeleton>
  );
}

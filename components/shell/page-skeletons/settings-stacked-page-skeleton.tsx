import {
  CardBlockSkeleton,
  PageHeaderSkeleton,
  PageShellSkeleton,
  TableRowsSkeleton,
} from "./shared";

export function SettingsStackedPageSkeleton() {
  return (
    <PageShellSkeleton maxWidth="max-w-3xl">
      <PageHeaderSkeleton showActions showDescription />
      <CardBlockSkeleton lines={4} />
      <TableRowsSkeleton rows={5} columns={4} />
    </PageShellSkeleton>
  );
}

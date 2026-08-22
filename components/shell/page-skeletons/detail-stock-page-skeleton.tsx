import {
  CardBlockSkeleton,
  FormFieldsSkeleton,
  PageHeaderSkeleton,
  PageShellSkeleton,
  TableRowsSkeleton,
} from "./shared";

export function DetailStockPageSkeleton() {
  return (
    <PageShellSkeleton maxWidth="max-w-4xl">
      <PageHeaderSkeleton showActions showDescription />
      <CardBlockSkeleton lines={2} />
      <div className="rounded-md border border-border p-4">
        <FormFieldsSkeleton count={3} />
      </div>
      <TableRowsSkeleton rows={6} columns={5} />
    </PageShellSkeleton>
  );
}

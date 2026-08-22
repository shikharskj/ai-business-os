import {
  CardBlockSkeleton,
  PageHeaderSkeleton,
  PageShellSkeleton,
} from "./shared";

export function DetailRecordSidebarPageSkeleton() {
  return (
    <PageShellSkeleton maxWidth="max-w-4xl">
      <PageHeaderSkeleton showActions showDescription />
      <div className="grid gap-6 lg:grid-cols-[1fr_16rem]">
        <CardBlockSkeleton lines={6} />
        <CardBlockSkeleton lines={4} />
      </div>
    </PageShellSkeleton>
  );
}

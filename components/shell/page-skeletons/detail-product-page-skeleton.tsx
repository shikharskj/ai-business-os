import {
  CardBlockSkeleton,
  PageHeaderSkeleton,
  PageShellSkeleton,
} from "./shared";

export function DetailProductPageSkeleton() {
  return (
    <PageShellSkeleton maxWidth="max-w-3xl">
      <PageHeaderSkeleton showActions showDescription />
      <CardBlockSkeleton lines={4} />
      <CardBlockSkeleton lines={3} />
    </PageShellSkeleton>
  );
}

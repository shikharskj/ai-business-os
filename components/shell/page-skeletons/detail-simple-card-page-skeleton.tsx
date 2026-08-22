import {
  CardBlockSkeleton,
  PageHeaderSkeleton,
  PageShellSkeleton,
} from "./shared";

export function DetailSimpleCardPageSkeleton() {
  return (
    <PageShellSkeleton maxWidth="max-w-3xl">
      <PageHeaderSkeleton showDescription />
      <CardBlockSkeleton lines={6} />
    </PageShellSkeleton>
  );
}

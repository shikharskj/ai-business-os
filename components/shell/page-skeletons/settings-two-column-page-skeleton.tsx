import {
  CardBlockSkeleton,
  PageHeaderSkeleton,
  PageShellSkeleton,
} from "./shared";

export function SettingsTwoColumnPageSkeleton() {
  return (
    <PageShellSkeleton maxWidth="max-w-7xl">
      <PageHeaderSkeleton showActions showDescription />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <CardBlockSkeleton lines={8} />
        <div className="flex flex-col gap-4">
          <CardBlockSkeleton lines={3} />
          <CardBlockSkeleton lines={4} />
          <CardBlockSkeleton lines={5} />
        </div>
      </div>
    </PageShellSkeleton>
  );
}

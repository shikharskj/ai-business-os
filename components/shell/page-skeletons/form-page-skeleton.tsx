import {
  FormFieldsSkeleton,
  PageHeaderSkeleton,
  PageShellSkeleton,
} from "./shared";

const widthClassNames = {
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "7xl": "max-w-7xl",
} as const;

export function FormPageSkeleton({
  width = "2xl",
  fieldCount = 6,
  showBackAction = true,
}: {
  width?: keyof typeof widthClassNames;
  fieldCount?: number;
  showBackAction?: boolean;
}) {
  return (
    <PageShellSkeleton maxWidth={widthClassNames[width]}>
      <PageHeaderSkeleton
        showActions={showBackAction}
        showDescription
      />
      <div className="rounded-md border border-border p-4">
        <FormFieldsSkeleton count={fieldCount} />
        <div className="mt-6 flex justify-end">
          <div className="h-10 w-28 rounded-md bg-muted motion-reduce:animate-none" />
        </div>
      </div>
    </PageShellSkeleton>
  );
}

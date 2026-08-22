import {
  LIST_TABLE_PRESETS,
  type ListTablePresetName,
} from "./list-table-presets";
import {
  NativeTableSkeleton,
  PageHeaderSkeleton,
  PageShellSkeleton,
} from "./shared";

export function ListTablePlainPageSkeleton({
  preset = "accounts",
}: {
  preset?: Extract<ListTablePresetName, "accounts">;
}) {
  const config = LIST_TABLE_PRESETS[preset];

  return (
    <PageShellSkeleton maxWidth={config.maxWidth ?? "max-w-5xl"}>
      <PageHeaderSkeleton showDescription />
      <NativeTableSkeleton columns={config.columns} rows={config.rows} />
    </PageShellSkeleton>
  );
}

import { LIST_TABLE_PRESETS } from "./list-table-presets";
import {
  ListFilterFormSkeleton,
  NativeTableSkeleton,
  PageHeaderSkeleton,
  PageShellSkeleton,
} from "./shared";

export type NativeListTablePresetName = "ledger" | "journals";

export function ListTableNativePageSkeleton({
  preset = "ledger",
}: {
  preset?: NativeListTablePresetName;
}) {
  const config = LIST_TABLE_PRESETS[preset];

  return (
    <PageShellSkeleton maxWidth={config.maxWidth}>
      <PageHeaderSkeleton
        showActions={config.showActions}
        showDescription
        actionCount={config.showActions ? 1 : 0}
      />
      <ListFilterFormSkeleton fields={config.filters} />
      <NativeTableSkeleton columns={config.columns} rows={config.rows} />
    </PageShellSkeleton>
  );
}

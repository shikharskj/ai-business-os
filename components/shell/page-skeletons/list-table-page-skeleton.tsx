import {
  LIST_TABLE_PRESETS,
  type ListTablePresetName,
} from "./list-table-presets";
import {
  DataTableSkeleton,
  ListFilterFormSkeleton,
  PageHeaderSkeleton,
  PageShellSkeleton,
} from "./shared";

export function ListTablePageSkeleton({
  preset = "invoices",
}: {
  preset?: ListTablePresetName;
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
      <DataTableSkeleton
        columns={config.columns}
        rows={config.rows}
        showPagination={config.showPagination}
      />
    </PageShellSkeleton>
  );
}

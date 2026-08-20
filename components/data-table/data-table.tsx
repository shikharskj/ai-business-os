"use client";

import * as React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { GripVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTable, type ColumnDef, type RowData } from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { saveListOrder } from "@/modules/list-order/application/save-list-order-action";
import type { ListKey } from "@/modules/list-order/domain/types";
import type { PageSize } from "@/modules/shared-kernel/list-page";

import { DataTablePagination } from "./data-table-pagination";
import { features, type DataTableFeatures } from "./data-table-features";

type DataTableProps<TData extends RowData> = {
  columns: ColumnDef<DataTableFeatures, TData>[];
  data: TData[];
  getRowId: (row: TData) => string;
  page: number;
  pageSize: PageSize;
  total: number;
  buildHref: (updates: { page?: number; pageSize?: PageSize }) => string;
  listKey?: ListKey;
  reorderPath?: string;
  enableReorder?: boolean;
};

function DragHandle({ id }: { id: string }) {
  const { attributes, listeners, setActivatorNodeRef, isDragging } = useSortable({
    id,
  });

  return (
    <button
      type="button"
      ref={setActivatorNodeRef}
      className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
      aria-label="Drag to reorder"
      disabled={isDragging}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-4" />
    </button>
  );
}

function SortableRow<TData extends RowData>({
  row,
  table,
  getRowId,
  enableReorder,
}: {
  row: ReturnType<ReturnType<typeof useTable<DataTableFeatures, TData>>["getRowModel"]>["rows"][number];
  table: ReturnType<typeof useTable<DataTableFeatures, TData>>;
  getRowId: (row: TData) => string;
  enableReorder: boolean;
}) {
  const id = getRowId(row.original);
  const { setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      data-state={isDragging ? "dragging" : undefined}
      className={isDragging ? "relative z-10 bg-muted/50" : undefined}
    >
      {enableReorder ? (
        <TableCell className="w-10">
          <DragHandle id={id} />
        </TableCell>
      ) : null}
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          <table.FlexRender cell={cell} />
        </TableCell>
      ))}
    </TableRow>
  );
}

function DataTableInner<TData extends RowData>({
  columns,
  data: initialData,
  getRowId,
  page,
  pageSize,
  total,
  buildHref,
  listKey,
  reorderPath,
  enableReorder = Boolean(listKey && reorderPath),
}: DataTableProps<TData>) {
  const router = useRouter();
  const dndContextId = `list-dnd-${listKey ?? "table"}`;
  const [rows, setRows] = React.useState(initialData);
  const [isSaving, setIsSaving] = React.useState(false);

  const table = useTable({
    features,
    data: rows,
    columns,
    getRowId: (row) => getRowId(row),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDragEnd(event: DragEndEvent) {
    if (!enableReorder || !listKey || !reorderPath || isSaving) {
      return;
    }
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = rows.findIndex((row) => getRowId(row) === active.id);
    const newIndex = rows.findIndex((row) => getRowId(row) === over.id);
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const nextRows = arrayMove(rows, oldIndex, newIndex);
    setRows(nextRows);
    setIsSaving(true);
    try {
      const result = await saveListOrder({
        listKey,
        orderedIds: nextRows.map(getRowId),
        movedId: String(active.id),
        newIndex,
        path: reorderPath,
      });
      if (result.error) {
        setRows(initialData);
      } else {
        router.refresh();
      }
    } catch {
      setRows(initialData);
    } finally {
      setIsSaving(false);
    }
  }

  const rowIds = rows.map(getRowId);
  const columnCount = columns.length + (enableReorder ? 1 : 0);

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      <DndContext
        id={dndContextId}
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleDragEnd}
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {enableReorder ? <TableHead className="w-10" /> : null}
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              <SortableContext
                id={dndContextId}
                items={rowIds}
                strategy={verticalListSortingStrategy}
              >
                {table.getRowModel().rows.map((row) => (
                  <SortableRow
                    key={row.id}
                    row={row}
                    table={table}
                    getRowId={getRowId}
                    enableReorder={enableReorder}
                  />
                ))}
              </SortableContext>
            ) : (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DndContext>
      <DataTablePagination
        total={total}
        page={page}
        pageSize={pageSize}
        buildHref={buildHref}
      />
    </div>
  );
}

export function DataTable<TData extends RowData>(props: DataTableProps<TData>) {
  const rowKey = props.data.map(props.getRowId).join(":");
  return <DataTableInner key={`${props.page}:${rowKey}`} {...props} />;
}

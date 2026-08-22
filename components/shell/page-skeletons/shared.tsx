import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function PageShellSkeleton({
  maxWidth = "max-w-7xl",
  children,
  className,
}: {
  maxWidth?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-1 flex-col gap-6",
        maxWidth,
        className
      )}
    >
      {children}
    </div>
  );
}

export function PageHeaderSkeleton({
  showActions = false,
  showDescription = true,
  showDescriptionEnd = false,
  actionCount = 1,
}: {
  showActions?: boolean;
  showDescription?: boolean;
  showDescriptionEnd?: boolean;
  actionCount?: 0 | 1 | 2;
}) {
  const actions =
    showActions && actionCount > 0
      ? Array.from({ length: actionCount })
      : [];

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-8 w-48 motion-reduce:animate-none" />
        {showDescription ? (
          <Skeleton className="h-4 w-72 max-w-full motion-reduce:animate-none" />
        ) : null}
        {showDescriptionEnd ? (
          <Skeleton className="h-4 w-full max-w-2xl motion-reduce:animate-none" />
        ) : null}
      </div>
      {actions.length > 0 ? (
        <div className="flex gap-2">
          {actions.map((_, index) => (
            <Skeleton
              key={index}
              className={cn(
                "h-10 motion-reduce:animate-none",
                index === 0 ? "w-28" : "w-24"
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export type ListFilterField =
  | { kind: "search" }
  | {
      kind: "select";
      width?: "w-40" | "w-44" | "w-48" | "w-52" | "w-64";
    }
  | { kind: "account" }
  | { kind: "period" }
  | { kind: "date"; width?: "w-44" }
  | { kind: "button" };

function filterFieldClass(field: ListFilterField): string {
  switch (field.kind) {
    case "search":
      return "min-w-56 flex-1";
    case "account":
      return "min-w-64 flex-1";
    case "select":
      return field.width ?? "w-40";
    case "period":
      return "w-40";
    case "date":
      return field.width ?? "w-44";
    case "button":
      return "";
  }
}

export function ListFilterFormSkeleton({
  fields,
}: {
  fields: ListFilterField[];
}) {
  if (fields.length === 0) {
    return null;
  }

  return (
    <form className="flex flex-wrap items-end gap-3">
      {fields.map((field, index) => {
        if (field.kind === "button") {
          return (
            <Skeleton
              key={index}
              className="h-10 w-20 motion-reduce:animate-none"
            />
          );
        }

        return (
          <div
            key={index}
            className={cn("flex flex-col gap-2", filterFieldClass(field))}
          >
            <Skeleton className="h-4 w-16 motion-reduce:animate-none" />
            <Skeleton
              className={cn(
                "h-10 w-full motion-reduce:animate-none",
                field.kind === "search" && "max-w-xl"
              )}
            />
          </div>
        );
      })}
    </form>
  );
}

/** @deprecated Prefer ListFilterFormSkeleton with explicit field presets. */
export function FilterRowSkeleton({ fields = 4 }: { fields?: number }) {
  const preset: ListFilterField[] = [];
  if (fields <= 0) {
    return null;
  }
  preset.push({ kind: "search" });
  for (let index = 1; index < fields - 1; index += 1) {
    preset.push({ kind: "select", width: "w-40" });
  }
  if (fields > 1) {
    preset.push({ kind: "button" });
  }
  return <ListFilterFormSkeleton fields={preset.slice(0, fields)} />;
}

type TableColumnWidth = "sm" | "md" | "lg" | "fill";

const CELL_WIDTH_CLASS: Record<TableColumnWidth, string> = {
  sm: "w-16",
  md: "w-24",
  lg: "w-32",
  fill: "w-full max-w-xs",
};

function cellSkeletonWidth(
  index: number,
  columns: number,
  columnWidths?: TableColumnWidth[]
): string {
  const preset = columnWidths?.[index];
  if (preset) {
    return CELL_WIDTH_CLASS[preset];
  }
  if (index === 0) {
    return "w-28";
  }
  if (index === columns - 1) {
    return "w-16";
  }
  return "w-24";
}

function TableSkeletonBody({
  columns,
  rows,
  columnWidths,
}: {
  columns: number;
  rows: number;
  columnWidths?: TableColumnWidth[];
}) {
  return (
    <>
      <TableHeader>
        <TableRow>
          {Array.from({ length: columns }).map((_, index) => (
            <TableHead key={index} className="h-12 px-3">
              <Skeleton
                className={cn(
                  "h-4 motion-reduce:animate-none",
                  cellSkeletonWidth(index, columns, columnWidths)
                )}
              />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <TableRow key={rowIndex}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <TableCell key={colIndex} className="px-3 py-3">
                <Skeleton
                  className={cn(
                    "h-4 motion-reduce:animate-none",
                    cellSkeletonWidth(colIndex, columns, columnWidths)
                  )}
                />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </>
  );
}

function TablePaginationSkeleton() {
  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <Skeleton className="h-4 w-40 motion-reduce:animate-none" />
      <div className="flex flex-wrap items-center gap-4">
        <Skeleton className="h-8 w-28 motion-reduce:animate-none" />
        <Skeleton className="h-8 w-32 motion-reduce:animate-none" />
      </div>
    </div>
  );
}

export function DataTableSkeleton({
  columns,
  rows = 10,
  columnWidths,
  showPagination = true,
}: {
  columns: number;
  rows?: number;
  columnWidths?: TableColumnWidth[];
  showPagination?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      <Table>
        <TableSkeletonBody
          columns={columns}
          rows={rows}
          columnWidths={columnWidths}
        />
      </Table>
      {showPagination ? <TablePaginationSkeleton /> : null}
    </div>
  );
}

export function NativeTableSkeleton({
  columns,
  rows = 12,
  columnWidths,
}: {
  columns: number;
  rows?: number;
  columnWidths?: TableColumnWidth[];
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      <Table>
        <TableSkeletonBody
          columns={columns}
          rows={rows}
          columnWidths={columnWidths}
        />
      </Table>
    </div>
  );
}

/** @deprecated Prefer DataTableSkeleton or NativeTableSkeleton for list pages. */
export function TableRowsSkeleton({
  rows = 6,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <div className="flex gap-3 border-b border-border pb-3">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton
            key={index}
            className={cn(
              "h-4 motion-reduce:animate-none",
              index === 0 ? "w-28" : "w-20"
            )}
          />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-3 py-2">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className={cn(
                "h-4 motion-reduce:animate-none",
                colIndex === 0 ? "w-32" : colIndex === columns - 1 ? "w-16" : "w-24"
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardBlockSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-4">
      <Skeleton className="h-5 w-36 motion-reduce:animate-none" />
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn(
            "h-4 motion-reduce:animate-none",
            index === lines - 1 ? "w-2/3" : "w-full"
          )}
        />
      ))}
    </div>
  );
}

export function StatCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex flex-col gap-2 rounded-md border border-border p-4"
        >
          <Skeleton className="h-4 w-24 motion-reduce:animate-none" />
          <Skeleton className="h-7 w-32 motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  );
}

export function FormFieldsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-28 motion-reduce:animate-none" />
          <Skeleton className="h-10 w-full motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  );
}

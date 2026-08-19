import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-md border border-border bg-card p-10 text-center">
      {Icon ? (
        <div className="rounded-full border border-border p-4">
          <Icon className="size-10 text-muted-foreground" />
        </div>
      ) : null}
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-medium">{title}</h2>
        <p className="max-w-sm text-base text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

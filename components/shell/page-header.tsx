import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  descriptionEnd,
  actions,
}: {
  title: string;
  description?: ReactNode;
  /** Sits on the description row (right on sm+), under the title. */
  descriptionEnd?: ReactNode;
  actions?: ReactNode;
}) {
  const hasDescriptionRow = Boolean(description || descriptionEnd);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {hasDescriptionRow ? (
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            {description ? (
              <div className="min-w-0 text-base text-muted-foreground">
                {description}
              </div>
            ) : null}
            {descriptionEnd ? (
              <div className="shrink-0 sm:text-right">{descriptionEnd}</div>
            ) : null}
          </div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

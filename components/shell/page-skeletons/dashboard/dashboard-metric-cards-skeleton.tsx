import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader } from "@/components/ui/card";

export function DashboardMetricCardsSkeleton() {
  return (
    <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card
          key={index}
          size="sm"
          className="min-h-36 border-border bg-linear-to-b from-muted/50 to-card dark:from-muted/30"
        >
          <CardHeader className="gap-2">
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-4 w-24 motion-reduce:animate-none" />
              <Skeleton className="h-6 w-16 motion-reduce:animate-none" />
            </div>
            <Skeleton className="h-8 w-32 motion-reduce:animate-none" />
            <Skeleton className="h-4 w-20 motion-reduce:animate-none" />
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

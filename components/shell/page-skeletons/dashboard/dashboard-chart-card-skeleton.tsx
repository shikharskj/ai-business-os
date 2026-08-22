import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

export function DashboardChartCardSkeleton() {
  return (
    <Card size="sm" className="flex h-full min-h-0 flex-col">
      <CardHeader className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Skeleton className="h-5 w-36 motion-reduce:animate-none" />
          <Skeleton className="h-3 w-48 motion-reduce:animate-none" />
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-8 w-16 rounded-full motion-reduce:animate-none"
            />
          ))}
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1">
        <Skeleton className="h-64 w-full motion-reduce:animate-none" />
      </CardContent>
    </Card>
  );
}

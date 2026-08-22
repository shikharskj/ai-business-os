import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { DASHBOARD_RAIL_HEADER_CLASS } from "@/components/business/dashboard-activity-panel";

export function DashboardBriefPanelSkeleton() {
  return (
    <Card size="sm" className="flex flex-col">
      <CardHeader className={DASHBOARD_RAIL_HEADER_CLASS}>
        <Skeleton className="h-5 w-32 motion-reduce:animate-none" />
        <Skeleton className="h-4 w-48 motion-reduce:animate-none" />
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-0">
        <div className="grid grid-cols-3 gap-3 px-(--card-spacing)">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-1">
              <Skeleton className="h-3 w-12 motion-reduce:animate-none" />
              <Skeleton className="h-5 w-20 motion-reduce:animate-none" />
            </div>
          ))}
        </div>
        <div className="flex flex-col divide-y divide-border">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-3 px-(--card-spacing) py-3"
            >
              <Skeleton className="size-9 shrink-0 rounded-full motion-reduce:animate-none" />
              <div className="min-w-0 flex-1 space-y-1">
                <Skeleton className="h-4 w-40 motion-reduce:animate-none" />
                <Skeleton className="h-3 w-28 motion-reduce:animate-none" />
              </div>
              <Skeleton className="h-5 w-16 motion-reduce:animate-none" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

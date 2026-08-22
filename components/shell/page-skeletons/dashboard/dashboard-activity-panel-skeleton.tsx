import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  DASHBOARD_RAIL_BODY_CLASS,
  DASHBOARD_RAIL_CARD_CLASS,
  DASHBOARD_RAIL_HEADER_CLASS,
} from "@/components/business/dashboard-activity-panel";
import { cn } from "@/lib/utils";

export function DashboardActivityPanelSkeleton() {
  return (
    <Card size="sm" className={DASHBOARD_RAIL_CARD_CLASS}>
      <CardHeader className={DASHBOARD_RAIL_HEADER_CLASS}>
        <Skeleton className="h-5 w-36 motion-reduce:animate-none" />
        <Skeleton className="h-4 w-52 motion-reduce:animate-none" />
      </CardHeader>
      <CardContent className={cn(DASHBOARD_RAIL_BODY_CLASS, "px-0")}>
        <ul className="divide-y divide-border">
          {Array.from({ length: 3 }).map((_, index) => (
            <li key={index}>
              <div className="flex items-center gap-3 px-(--card-spacing) py-3">
                <Skeleton className="size-9 shrink-0 rounded-full motion-reduce:animate-none" />
                <div className="min-w-0 flex-1 space-y-1">
                  <Skeleton className="h-4 w-24 motion-reduce:animate-none" />
                  <Skeleton className="h-3 w-36 motion-reduce:animate-none" />
                </div>
                <Skeleton className="h-5 w-14 motion-reduce:animate-none" />
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

import {
  PageHeaderSkeleton,
  PageShellSkeleton,
} from "./shared";
import { DashboardActivityPanelSkeleton } from "./dashboard/dashboard-activity-panel-skeleton";
import { DashboardBriefPanelSkeleton } from "./dashboard/dashboard-brief-panel-skeleton";
import { DashboardChartCardSkeleton } from "./dashboard/dashboard-chart-card-skeleton";
import { DashboardMetricCardsSkeleton } from "./dashboard/dashboard-metric-cards-skeleton";

export function DashboardPageSkeleton() {
  return (
    <PageShellSkeleton maxWidth="max-w-7xl" className="min-w-0">
      <PageHeaderSkeleton showDescription showDescriptionEnd />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start lg:gap-6">
        <div className="order-1 flex min-w-0 flex-col gap-6 lg:col-start-3 lg:row-start-1">
          <DashboardBriefPanelSkeleton />
          <DashboardActivityPanelSkeleton />
        </div>
        <div className="order-2 flex min-w-0 flex-col gap-6 lg:col-span-2 lg:row-start-1">
          <DashboardMetricCardsSkeleton />
          <DashboardChartCardSkeleton />
        </div>
      </div>
    </PageShellSkeleton>
  );
}

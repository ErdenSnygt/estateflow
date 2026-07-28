import { Skeleton } from "@/components/ui/skeleton";
import {
  InsightsSkeleton,
  KpiGridSkeleton,
  SalesChartSkeleton,
} from "@/components/dashboard/dashboard-skeletons";

/** Rota geçişinde görünen iskelet — sayfanın kendi Suspense bölümleriyle
 *  aynı ölçüleri kullanır. */
export default function DashboardLoading() {
  return (
    <div className="space-y-6 pb-4">
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <KpiGridSkeleton />
      <SalesChartSkeleton />
      <InsightsSkeleton />
    </div>
  );
}

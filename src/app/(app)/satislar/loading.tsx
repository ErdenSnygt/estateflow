import {
  FilterBarSkeleton,
  ListRowsSkeleton,
  PageHeaderSkeleton,
} from "@/components/page-skeletons";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** `/satislar` yüklenirken — sekme şeridi, filtre, toplam kartı ve liste. */
export default function SatislarLoading() {
  return (
    <div className="space-y-6 pb-4">
      <PageHeaderSkeleton withAction />
      <FilterBarSkeleton />

      {/* Toplam tutar kartı */}
      <Card>
        <CardContent className="flex items-baseline justify-between gap-3 p-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-40" />
        </CardContent>
      </Card>

      <ListRowsSkeleton />
    </div>
  );
}

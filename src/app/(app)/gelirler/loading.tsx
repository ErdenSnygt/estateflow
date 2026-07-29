import {
  ListRowsSkeleton,
  PageHeaderSkeleton,
  StatTilesSkeleton,
} from "@/components/page-skeletons";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** `/gelirler` yüklenirken — özet, grafik, döküm. */
export default function GelirlerLoading() {
  return (
    <div className="space-y-5 pb-4">
      <PageHeaderSkeleton withAction />
      <StatTilesSkeleton />

      <Card>
        <CardContent className="space-y-3 p-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-[260px] w-full rounded-lg" />
        </CardContent>
      </Card>

      <ListRowsSkeleton count={4} />
    </div>
  );
}

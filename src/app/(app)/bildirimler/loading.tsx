import { PageHeaderSkeleton } from "@/components/page-skeletons";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** `/bildirimler` yüklenirken — sekme şeridi ve gelen kutusu satırları. */
export default function BildirimlerLoading() {
  return (
    <div className="space-y-6 pb-4">
      <PageHeaderSkeleton />

      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-10 w-52 rounded-lg" />
        <Skeleton className="h-9 w-44 rounded-lg" />
      </div>

      <Card>
        <CardContent className="space-y-1 p-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-start gap-3 px-3 py-2.5">
              <Skeleton className="size-8 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-2/5" />
                <Skeleton className="h-3 w-3/5" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

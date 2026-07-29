import {
  PageHeaderSkeleton,
  StatTilesSkeleton,
} from "@/components/page-skeletons";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** `/profil` yüklenirken — kapak şeridi, istatistikler, rozetler. */
export default function ProfilLoading() {
  return (
    <div className="space-y-5 pb-4">
      <PageHeaderSkeleton withAction />

      {/* Kapak + kimlik: `AgentCover` ile aynı ölçüler (h-32 / sm:h-44). */}
      <div className="overflow-hidden rounded-xl border border-hairline bg-surface">
        <Skeleton className="h-32 w-full rounded-none sm:h-44" />
        <div className="flex items-end gap-4 px-5 pb-5">
          <Skeleton className="-mt-10 size-20 shrink-0 rounded-full ring-4 ring-surface sm:-mt-12" />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3.5 w-36" />
          </div>
        </div>
      </div>

      <StatTilesSkeleton />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardContent className="space-y-4 p-5">
            <Skeleton className="h-5 w-28" />
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-[92px] rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <Skeleton className="h-5 w-36" />
            <div className="space-y-2.5 border-t border-hairline pt-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-4 w-full" />
              ))}
            </div>
            <Skeleton className="h-9 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

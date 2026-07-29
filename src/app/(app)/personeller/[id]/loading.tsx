import {
  PageHeaderSkeleton,
  ListRowsSkeleton,
} from "@/components/page-skeletons";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** `/personeller/[id]` yüklenirken — kapak, özet, iki sütun. */
export default function PersonelDetayLoading() {
  return (
    <div className="space-y-6 pb-4">
      <PageHeaderSkeleton withAction />

      {/* `AgentCover` ile aynı ölçüler. */}
      <div className="overflow-hidden rounded-xl border border-hairline bg-surface">
        <Skeleton className="h-32 w-full rounded-none sm:h-44" />
        <div className="flex items-end gap-4 px-5 pb-5">
          <Skeleton className="-mt-10 size-20 shrink-0 rounded-full ring-4 ring-surface sm:-mt-12" />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3.5 w-32" />
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index}>
                <CardContent className="space-y-2 p-4">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-3 w-28" />
                </CardContent>
              </Card>
            ))}
          </div>

          <Skeleton className="h-5 w-40" />
          <ListRowsSkeleton count={3} />
        </div>

        <div className="space-y-5">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="space-y-3 p-5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

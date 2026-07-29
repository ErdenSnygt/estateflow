import { PageHeaderSkeleton } from "@/components/page-skeletons";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** `/raporlar` yüklenirken — üç bölüm, gerçek sayfayla aynı ızgara. */
export default function RaporlarLoading() {
  return (
    <div className="space-y-5 pb-4">
      <PageHeaderSkeleton withAction />

      {/* Portföy analizi */}
      <Skeleton className="h-5 w-44" />
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="space-y-3 p-5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-[200px] w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="space-y-2 p-5">
              <Skeleton className="h-4 w-40" />
              {Array.from({ length: 5 }).map((_, row) => (
                <Skeleton key={row} className="h-9 w-full rounded-lg" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Satış analizi */}
      <Skeleton className="h-5 w-36" />
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="space-y-2 p-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="space-y-3 p-5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-[250px] w-full rounded-lg" />
        </CardContent>
      </Card>
    </div>
  );
}

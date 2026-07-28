import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Ölçüler gerçek kartlarla eşleşir — veri gelince sayfa zıplamaz. */
export function KpiGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <Card key={index}>
          <CardContent className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="size-8 rounded-lg" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-7 w-[76px]" />
            </div>
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-4 w-40" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SalesChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-56" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[280px] w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

export function InsightsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-2">
        <CardHeader>
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-44" />
        </CardHeader>
        <CardContent className="space-y-5 pt-2">
          <div className="flex items-center gap-6">
            <Skeleton className="size-[200px] shrink-0 rounded-full" />
            <div className="w-full space-y-2">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-6 w-full" />
              ))}
            </div>
          </div>

          <div className="space-y-3 border-t border-hairline pt-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="space-y-1.5">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-hairline pt-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-[58px] rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </CardHeader>
        <CardContent className="space-y-4 pt-1">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="flex items-start gap-3">
              <Skeleton className="size-8 shrink-0 rounded-lg" />
              <div className="w-full space-y-2">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 pb-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-[360px] max-w-full" />
          <Skeleton className="h-4 w-[280px] max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Skeleton className="aspect-[16/10] w-full rounded-xl" />
          <div className="flex gap-2">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-[68px] w-[90px] rounded-lg" />
            ))}
          </div>
          <Card className="p-5">
            <Skeleton className="mb-4 h-5 w-28" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="space-y-4 p-5">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-9 w-44" />
            <Skeleton className="h-px w-full" />
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <Skeleton className="h-12 w-full" />
          </Card>
        </div>
      </div>
    </div>
  );
}

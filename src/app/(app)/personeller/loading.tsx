import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

/** `/personeller` yüklenirken — kart ızgarasıyla aynı ölçüler. */
export default function PersonellerLoading() {
  return (
    <div className="space-y-6 pb-4">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="h-full">
            <div className="flex flex-col gap-3.5 p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="size-11 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-36" />
                </div>
                <Skeleton className="h-5 w-16 rounded-md" />
              </div>
              <Skeleton className="h-[52px] w-full rounded-lg" />
              <Skeleton className="h-[42px] w-full rounded-lg" />
              <div className="flex justify-between border-t border-hairline pt-3">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3.5 w-20" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

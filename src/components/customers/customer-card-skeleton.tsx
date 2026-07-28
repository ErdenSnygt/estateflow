import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Ölçüler `CustomerCard` ile eşleşir — yükleme bitince sayfa zıplamaz. */
export function CustomerCardSkeleton() {
  return (
    <Card>
      <div className="flex flex-col gap-3.5 p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="size-11 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
          </div>
          <Skeleton className="h-5 w-14 rounded-md" />
        </div>

        <Skeleton className="h-[52px] rounded-lg" />

        <div className="flex items-center justify-between border-t border-hairline pt-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </Card>
  );
}

export function CustomerGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <CustomerCardSkeleton key={index} />
      ))}
    </div>
  );
}

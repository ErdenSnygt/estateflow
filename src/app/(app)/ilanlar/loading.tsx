import { Skeleton } from "@/components/ui/skeleton";
import { ListingGridSkeleton } from "@/components/listings/listing-card-skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 pb-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-[420px] max-w-full" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-11 w-full" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 7 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-[150px]" />
          ))}
        </div>
      </div>

      <ListingGridSkeleton />
    </div>
  );
}
